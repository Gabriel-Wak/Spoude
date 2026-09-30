import { randomUUID } from "crypto";
import { chunkText, extractFromFile, MAX_UPLOAD_BYTES } from "@/lib/extract";
import { embed, errorMessage } from "@/lib/openai";
import { addDocument, listDocuments } from "@/lib/store";
import { jsonError } from "@/lib/stream";
import type { Chunk, DocumentKind, LibraryDocument } from "@/lib/types";

export const maxDuration = 300;

const KINDS: DocumentKind[] = ["livro", "artigo", "diretriz", "relato", "apostila", "outro"];

export async function GET() {
  return Response.json({ documents: await listDocuments() });
}

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return jsonError("Envie o arquivo como multipart/form-data.");
  }

  const file = form.get("file");
  if (!(file instanceof File)) return jsonError("Nenhum arquivo enviado.");
  if (file.size === 0) return jsonError("O arquivo está vazio.");
  if (file.size > MAX_UPLOAD_BYTES)
    return jsonError(`Arquivo muito grande (máx. ${MAX_UPLOAD_BYTES / 1024 / 1024} MB).`);

  const kindInput = String(form.get("kind") ?? "outro") as DocumentKind;
  const kind = KINDS.includes(kindInput) ? kindInput : "outro";

  try {
    const { text, pages } = await extractFromFile(file);
    if (text.length < 50) {
      return jsonError(
        "Não foi possível extrair texto deste arquivo. Se for um PDF escaneado (imagem), ele precisa de OCR antes do envio.",
        422,
      );
    }

    const pieces = chunkText(text);
    const vectors = await embed(pieces);
    const id = randomUUID();

    const doc: LibraryDocument = {
      id,
      name: file.name,
      kind,
      mime: file.type || "application/octet-stream",
      size: file.size,
      pages,
      chars: text.length,
      chunkCount: pieces.length,
      createdAt: new Date().toISOString(),
    };
    const chunks: Chunk[] = pieces.map((t, i) => ({
      id: `${id}:${i}`,
      docId: id,
      index: i,
      text: t,
      embedding: vectors[i],
    }));

    await addDocument(doc, chunks);
    return Response.json({ document: doc }, { status: 201 });
  } catch (err) {
    console.error("[spoude] erro ao indexar documento:", err);
    return jsonError(errorMessage(err), 500);
  }
}
