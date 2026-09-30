import { CHAT_MODEL, errorMessage, getOpenAI } from "@/lib/openai";
import { flashcardsSystemPrompt } from "@/lib/prompts";
import { formatSourcesForPrompt, retrieve } from "@/lib/rag";
import { jsonError } from "@/lib/stream";
import type { Source } from "@/lib/types";

export const maxDuration = 120;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "cards"],
  properties: {
    title: { type: "string", description: "Título curto do baralho" },
    cards: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["front", "back", "tag"],
        properties: {
          front: { type: "string" },
          back: { type: "string" },
          tag: { type: "string" },
        },
      },
    },
  },
} as const;

interface Body {
  topic?: string;
  count?: number;
  useLibrary?: boolean;
  docIds?: string[];
  /** Texto-base opcional (ex.: um resumo gerado) para derivar os cartões. */
  sourceText?: string;
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return jsonError("JSON inválido.");
  }
  const topic = (body.topic ?? "").trim().slice(0, 500);
  if (!topic) return jsonError("Informe o tema dos flashcards.");
  const count = Math.min(Math.max(Math.round(body.count ?? 12), 4), 40);

  try {
    let sources: Source[] = [];
    if (body.useLibrary !== false && !body.sourceText) {
      sources = await retrieve(topic, { docIds: body.docIds, k: 8 });
    }

    const userContent = body.sourceText
      ? `Gere exatamente ${count} flashcards sobre "${topic}" a partir deste material:\n\n${body.sourceText.slice(0, 20000)}`
      : `Gere exatamente ${count} flashcards sobre: ${topic}`;

    const completion = await getOpenAI().chat.completions.create({
      model: CHAT_MODEL,
      messages: [
        { role: "developer", content: flashcardsSystemPrompt(formatSourcesForPrompt(sources)) },
        { role: "user", content: userContent },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "flashcards", strict: true, schema: SCHEMA },
      },
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) return jsonError("O modelo não retornou flashcards.", 502);
    const parsed = JSON.parse(raw) as {
      title: string;
      cards: { front: string; back: string; tag: string }[];
    };
    return Response.json({
      ...parsed,
      sources: sources.map((s) => ({ n: s.n, docName: s.docName })),
    });
  } catch (err) {
    console.error("[spoude] erro ao gerar flashcards:", err);
    return jsonError(errorMessage(err), 500);
  }
}
