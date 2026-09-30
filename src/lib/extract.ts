import { extractText, getDocumentProxy } from "unpdf";
import mammoth from "mammoth";

export const ACCEPTED_EXTENSIONS = [".pdf", ".docx", ".txt", ".md"];
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export interface Extracted {
  text: string;
  pages?: number;
}

export async function extractFromFile(file: File): Promise<Extracted> {
  const name = file.name.toLowerCase();
  const buffer = new Uint8Array(await file.arrayBuffer());

  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    const pdf = await getDocumentProxy(buffer);
    const { totalPages, text } = await extractText(pdf, { mergePages: false });
    // Marca as páginas para que as citações possam indicar a origem aproximada.
    const joined = text
      .map((t, i) => `[p. ${i + 1}]\n${t}`)
      .join("\n\n");
    return { text: normalize(joined), pages: totalPages };
  }

  if (name.endsWith(".docx")) {
    const { value } = await mammoth.extractRawText({
      buffer: Buffer.from(buffer),
    });
    return { text: normalize(value) };
  }

  if (name.endsWith(".txt") || name.endsWith(".md") || file.type.startsWith("text/")) {
    return { text: normalize(new TextDecoder("utf-8").decode(buffer)) };
  }

  throw new Error(
    `Formato não suportado. Envie arquivos ${ACCEPTED_EXTENSIONS.join(", ")}.`,
  );
}

function normalize(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/-\n(?=\p{Ll})/gu, "") // junta palavras hifenizadas na quebra de linha
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Divide o texto em trechos de ~1.200 caracteres com sobreposição,
 * respeitando parágrafos e frases sempre que possível.
 */
export function chunkText(text: string, size = 1200, overlap = 200): string[] {
  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  const pushCurrent = () => {
    if (current.trim().length > 40) chunks.push(current.trim());
    current = current.slice(-overlap);
  };

  for (const para of paragraphs) {
    if (para.length > size) {
      const sentences = para.split(/(?<=[.!?;])\s+/);
      for (const s of sentences) {
        if ((current + " " + s).length > size) pushCurrent();
        current += (current ? " " : "") + s;
        // Frase gigante (ex.: tabela achatada): corta na marra.
        while (current.length > size * 1.5) {
          chunks.push(current.slice(0, size));
          current = current.slice(size - overlap);
        }
      }
    } else {
      if ((current + "\n\n" + para).length > size) pushCurrent();
      current += (current ? "\n\n" : "") + para;
    }
  }
  if (current.trim().length > 40) chunks.push(current.trim());
  return chunks;
}
