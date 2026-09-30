import type OpenAI from "openai";
import { CHAT_MODEL, errorMessage, getOpenAI } from "./openai";
import type { Source, StreamEvent } from "./types";

type Message = OpenAI.Chat.Completions.ChatCompletionMessageParam;

/**
 * Transmite a resposta do modelo como NDJSON: primeiro as fontes usadas,
 * depois os pedaços de texto e por fim "done" (ou "error").
 */
export function streamCompletion(messages: Message[], sources: Source[]): Response {
  const encoder = new TextEncoder();

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (e: StreamEvent) =>
        controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));

      try {
        send({ type: "sources", sources });
        const stream = await getOpenAI().chat.completions.create({
          model: CHAT_MODEL,
          messages,
          stream: true,
        });
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content;
          if (text) send({ type: "delta", text });
        }
        send({ type: "done" });
      } catch (err) {
        console.error("[spoude] erro no streaming:", err);
        send({ type: "error", message: errorMessage(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(body, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}

export function jsonError(message: string, status = 400): Response {
  return Response.json({ error: message }, { status });
}
