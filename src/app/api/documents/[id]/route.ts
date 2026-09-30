import { deleteDocument } from "@/lib/store";
import { jsonError } from "@/lib/stream";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ok = await deleteDocument(id);
  if (!ok) return jsonError("Documento não encontrado.", 404);
  return Response.json({ ok: true });
}
