import { errorMessage } from "@/lib/openai";
import { chatSystemPrompt } from "@/lib/prompts";
import { formatSourcesForPrompt, retrieve } from "@/lib/rag";
import { jsonError, streamCompletion } from "@/lib/stream";
import type { ChatMessage, Source, StudyMode } from "@/lib/types";

export const maxDuration = 120;

const MODES: StudyMode[] = ["explicar", "revisao", "caso", "questoes"];
const MAX_HISTORY = 20;
const MAX_CHARS = 12000;

interface Body {
  messages?: ChatMessage[];
  mode?: StudyMode;
  useLibrary?: boolean;
  docIds?: string[];
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return jsonError("JSON inválido.");
  }

  const history = (body.messages ?? [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-MAX_HISTORY)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }));

  const lastUser = [...history].reverse().find((m) => m.role === "user");
  if (!lastUser) return jsonError("Envie ao menos uma mensagem.");

  const mode = MODES.includes(body.mode as StudyMode) ? (body.mode as StudyMode) : "explicar";

  let sources: Source[] = [];
  if (body.useLibrary !== false) {
    // Perguntas curtas de continuação ("e o tratamento?") herdam o contexto da anterior.
    const userTurns = history.filter((m) => m.role === "user");
    const query =
      lastUser.content.length < 80 && userTurns.length > 1
        ? `${userTurns[userTurns.length - 2].content}\n${lastUser.content}`
        : lastUser.content;
    try {
      sources = await retrieve(query, { docIds: body.docIds });
    } catch (err) {
      return jsonError(errorMessage(err), 500);
    }
  }

  return streamCompletion(
    [{ role: "developer", content: chatSystemPrompt(mode, formatSourcesForPrompt(sources)) }, ...history],
    sources,
  );
}
