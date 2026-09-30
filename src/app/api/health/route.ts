import { MAX_UPLOAD_BYTES } from "@/lib/extract";
import { CHAT_MODEL, EMBEDDING_MODEL, isConfigured } from "@/lib/openai";

export async function GET() {
  return Response.json({
    configured: isConfigured(),
    model: CHAT_MODEL,
    embeddingModel: EMBEDDING_MODEL,
    maxUploadMB: MAX_UPLOAD_BYTES / 1024 / 1024,
    storage: process.env.BLOB_READ_WRITE_TOKEN ? "blob" : process.env.VERCEL ? "none" : "local",
  });
}
