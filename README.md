# Spoude (σπουδή) — Tutor de medicina com IA · Beta

O **Spoude** é uma plataforma SaaS de suporte acadêmico baseada em IA generativa e arquitetura **RAG** (Retrieval-Augmented Generation), feita para estudantes de medicina (do ciclo básico ao internato), residentes e médicos em estudo e revisão de literatura.

> ⚠️ **Finalidade e isenção de responsabilidade.** Plataforma destinada estritamente ao suporte acadêmico, educacional e de revisão de literatura. **Não** constitui dispositivo médico (SaMD), **não** realiza prescrições automatizadas, **não** atua como sistema de auxílio ao diagnóstico clínico ou suporte à decisão terapêutica para pacientes reais e **não** substitui o julgamento técnico, a validação e a responsabilidade ético-profissional de médicos habilitados e da preceptoria.

## Funcionalidades da versão beta

| Módulo | O que faz |
| --- | --- |
| **Chat de estudo** | Agente tutor em português, com respostas em streaming e 4 modos: *Explicar*, *Revisão de literatura*, *Caso clínico* (fictício e socrático) e *Questões de prova* (estilo residência). |
| **Biblioteca (RAG)** | Upload de livros, artigos, diretrizes, relatos de caso e apostilas (PDF, DOCX, TXT, MD). O texto é extraído, dividido em trechos e indexado com embeddings; o chat e os resumos passam a responder com base nele, com **citações clicáveis** [1], [2] que mostram o trecho original. |
| **Resumos clínicos** | Estrutura padronizada: definição, epidemiologia, fisiopatologia, quadro clínico, diagnóstico, diferenciais, tratamento, complicações, pontos de prova e referências. Exporta em Markdown. |
| **Flashcards** | Geração de baralhos por tema, pela biblioteca ou a partir de um resumo. Estudo com **repetição espaçada (SM-2)**, cartões que viram e atalhos de teclado (espaço, 1–4). |
| **Guardrails** | Aviso legal no primeiro acesso; o agente recusa conduta/prescrição para paciente real, orienta SAMU 192 em emergências e não inventa referências. |

## Como rodar

Requisitos: Node.js 20+ e uma chave da API da OpenAI.

```bash
npm install
cp .env.example .env.local   # e preencha OPENAI_API_KEY
npm run dev                  # http://localhost:3000
```

Para a apresentação, prefira o modo produção (mais rápido):

```bash
npm run build && npm run start
```

### Variáveis de ambiente

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `OPENAI_API_KEY` | — | Chave da API da OpenAI (obrigatória). |
| `OPENAI_MODEL` | `gpt-5.4-mini` | Modelo de chat do agente. |
| `OPENAI_EMBEDDING_MODEL` | `text-embedding-3-small` | Modelo de embeddings da busca semântica. |

## Arquitetura

```
src/
├── app/
│   ├── page.tsx                  # entrada da aplicação
│   └── api/
│       ├── chat/                 # chat com RAG (streaming NDJSON)
│       ├── summary/              # resumo clínico estruturado (streaming)
│       ├── flashcards/           # geração de cartões (JSON Schema estrito)
│       ├── documents/            # upload, listagem e exclusão da biblioteca
│       └── health/               # status da configuração
├── components/                   # Chat, Biblioteca, Resumos, Flashcards, Sidebar…
└── lib/
    ├── prompts.ts                # persona, modos de estudo e limites do agente
    ├── rag.ts                    # busca vetorial (cosseno) com corte de relevância
    ├── extract.ts                # extração de PDF/DOCX/TXT/MD e chunking
    ├── store.ts                  # base vetorial local (data/library.json)
    ├── stream.ts                 # streaming da OpenAI → NDJSON
    └── client.ts                 # SM-2, leitura de stream, estado local
```

**Fluxo RAG:** upload → extração de texto → trechos de ~1.200 caracteres com sobreposição → embeddings → armazenamento. Na pergunta, a consulta é vetorizada, os trechos mais próximos (acima de um corte absoluto e relativo de similaridade, no máximo 3 por documento) entram no prompt, e o modelo cita cada afirmação com `[n]`.

## Limitações conhecidas da beta (próximos passos)

- **Sem login/multiusuário:** conversas, resumos e flashcards ficam no `localStorage` do navegador; a biblioteca é compartilhada por quem acessa o servidor. → Autenticação + Postgres.
- **Base vetorial em arquivo JSON** (`data/`), adequada para dezenas de documentos. → pgvector, Qdrant ou similar.
- **PDFs escaneados** (imagem) não têm texto extraível. → OCR.
- Sem limites de uso por usuário. → rate limiting e planos (SaaS).
- A pasta `data/` não é persistente em hospedagens serverless (ex.: Vercel); para deploy, trocar o `store.ts` por um banco.
