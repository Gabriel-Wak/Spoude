import { errorMessage } from "@/lib/openai";
import { summarySystemPrompt } from "@/lib/prompts";
import { formatSourcesForPrompt, retrieve } from "@/lib/rag";
import { jsonError, streamCompletion } from "@/lib/stream";
import type { Source } from "@/lib/types";

export const maxDuration = 120;

export async function POST(request: Request) {
  let body: { topic?: string; useLibrary?: boolean; docIds?: string[] };
  try {
    body = await request.json();
  } catch {
    return jsonError("JSON inválido.");
  }
  const topic = (body.topic ?? "").trim().slice(0, 500);
  if (!topic) return jsonError("Informe o tema do resumo.");

  let sources: Source[] = [];
  if (body.useLibrary !== false) {
    try {
      sources = await retrieve(topic, { docIds: body.docIds, k: 8 });
    } catch (err) {
      return jsonError(errorMessage(err), 500);
    }
  }

  return streamCompletion(
    [
      { role: "developer", content: summarySystemPrompt(formatSourcesForPrompt(sources)) },
      { role: "user", content: `Tema: ${topic}` },
    ],
    sources,
  );
}
