import OpenAI from "openai";

export const CHAT_MODEL = process.env.OPENAI_MODEL || "gpt-5.4-mini";
export const EMBEDDING_MODEL =
  process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";

let client: OpenAI | null = null;

export function isConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function getOpenAI(): OpenAI {
  if (!isConfigured()) {
    throw new Error(
      "OPENAI_API_KEY não configurada. Copie .env.example para .env.local e preencha a chave.",
    );
  }
  if (!client) client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

/** Gera embeddings em lotes para não estourar o limite de entrada da API. */
export async function embed(texts: string[]): Promise<number[][]> {
  const openai = getOpenAI();
  const out: number[][] = [];
  const BATCH = 96;
  for (let i = 0; i < texts.length; i += BATCH) {
    const res = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: texts.slice(i, i + BATCH),
    });
    for (const item of res.data) out.push(item.embedding);
  }
  return out;
}

export function errorMessage(err: unknown): string {
  if (err instanceof OpenAI.APIError) {
    if (err.status === 401) return "Chave da OpenAI inválida ou revogada.";
    if (err.status === 429)
      return "Limite de uso da OpenAI atingido. Aguarde alguns segundos ou verifique o saldo da conta.";
    return `Erro da OpenAI (${err.status ?? "?"}): ${err.message}`;
  }
  if (err instanceof Error) return err.message;
  return "Erro inesperado.";
}
