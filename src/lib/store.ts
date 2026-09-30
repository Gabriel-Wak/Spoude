import { promises as fs } from "fs";
import path from "path";
import type { Chunk, LibraryDocument } from "./types";

/**
 * Base vetorial local em arquivo JSON — suficiente para a versão beta.
 * Em produção, trocar por Postgres + pgvector (ou similar) mantendo esta interface.
 */
interface StoreData {
  documents: LibraryDocument[];
  chunks: Chunk[];
}

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "library.json");

let cache: StoreData | null = null;
let writeQueue: Promise<void> = Promise.resolve();

async function load(): Promise<StoreData> {
  if (cache) return cache;
  try {
    cache = JSON.parse(await fs.readFile(FILE, "utf-8")) as StoreData;
  } catch {
    cache = { documents: [], chunks: [] };
  }
  return cache;
}

function persist(data: StoreData): Promise<void> {
  writeQueue = writeQueue.then(async () => {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const tmp = FILE + ".tmp";
    await fs.writeFile(tmp, JSON.stringify(data));
    await fs.rename(tmp, FILE);
  });
  return writeQueue;
}

export async function listDocuments(): Promise<LibraryDocument[]> {
  const data = await load();
  return [...data.documents].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function addDocument(doc: LibraryDocument, chunks: Chunk[]) {
  const data = await load();
  data.documents.push(doc);
  data.chunks.push(...chunks);
  await persist(data);
}

export async function deleteDocument(id: string): Promise<boolean> {
  const data = await load();
  const before = data.documents.length;
  data.documents = data.documents.filter((d) => d.id !== id);
  data.chunks = data.chunks.filter((c) => c.docId !== id);
  if (data.documents.length === before) return false;
  await persist(data);
  return true;
}

export async function getChunks(docIds?: string[]): Promise<Chunk[]> {
  const data = await load();
  if (!docIds || docIds.length === 0) return data.chunks;
  const set = new Set(docIds);
  return data.chunks.filter((c) => set.has(c.docId));
}

export async function getDocumentMap(): Promise<Map<string, LibraryDocument>> {
  const data = await load();
  return new Map(data.documents.map((d) => [d.id, d]));
}
