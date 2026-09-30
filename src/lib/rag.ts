import { embed } from "./openai";
import { getChunks, getDocumentMap } from "./store";
import type { Source } from "./types";

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

/**
 * Recupera os trechos mais relevantes da biblioteca para a pergunta.
 * Limita a quantidade de trechos por documento para diversificar as fontes.
 */
export async function retrieve(
  query: string,
  opts: { docIds?: string[]; k?: number; minScore?: number } = {},
): Promise<Source[]> {
  const { docIds, k = 6, minScore = 0.35 } = opts;
  const chunks = await getChunks(docIds);
  if (chunks.length === 0) return [];

  const [q] = await embed([query]);
  const docs = await getDocumentMap();

  const scored = chunks
    .map((c) => ({ c, score: cosine(q, c.embedding) }))
    .sort((a, b) => b.score - a.score);
  // Corte absoluto + relativo ao melhor trecho: evita citar documentos pouco relacionados.
  const cutoff = Math.max(minScore, (scored[0]?.score ?? 0) * 0.75);
  const ranked = scored.filter((r) => r.score >= cutoff);

  const perDoc = new Map<string, number>();
  const picked: Source[] = [];
  for (const { c, score } of ranked) {
    const used = perDoc.get(c.docId) ?? 0;
    if (used >= 3) continue;
    const doc = docs.get(c.docId);
    if (!doc) continue;
    perDoc.set(c.docId, used + 1);
    picked.push({
      n: picked.length + 1,
      docId: c.docId,
      docName: doc.name,
      kind: doc.kind,
      excerpt: c.text,
      score: Math.round(score * 1000) / 1000,
    });
    if (picked.length >= k) break;
  }
  return picked;
}

export function formatSourcesForPrompt(sources: Source[]): string {
  if (sources.length === 0) return "";
  return sources
    .map((s) => `[${s.n}] ${s.docName} (${s.kind})\n"""\n${s.excerpt}\n"""`)
    .join("\n\n");
}
