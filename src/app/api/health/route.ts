import { CHAT_MODEL, EMBEDDING_MODEL, isConfigured } from "@/lib/openai";

export async function GET() {
  return Response.json({
    configured: isConfigured(),
    model: CHAT_MODEL,
    embeddingModel: EMBEDDING_MODEL,
  });
}
