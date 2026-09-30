import { promises as fs } from "fs";
import path from "path";
import { get, put } from "@vercel/blob";
import type { Chunk, LibraryDocument } from "./types";

/**
 * Base vetorial da biblioteca — suficiente para a versão beta.
 * - Com BLOB_READ_WRITE_TOKEN (Vercel): um JSON privado no Vercel Blob.
 * - Sem ele (desenvolvimento local): data/library.json.
 * Em produção, trocar por Postgres + pgvector (ou similar) mantendo esta interface.
 */
interface StoreData {
  documents: LibraryDocument[];
  chunks: Chunk[];
}

const useBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
const BLOB_PATH = "spoude/library.json";
const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "library.json");

let cache: StoreData | null = null;
let writeQueue: Promise<void> = Promise.resolve();

const empty = (): StoreData => ({ documents: [], chunks: [] });

async function load(): Promise<StoreData> {
  if (useBlob) {
    // Funções serverless podem rodar em várias instâncias: sempre lê a versão mais recente.
    const res = await get(BLOB_PATH, { access: "private", useCache: false });
    if (!res || res.statusCode !== 200) return empty();
    return (await new Response(res.stream).json()) as StoreData;
  }
  if (cache) return cache;
  try {
    cache = JSON.parse(await fs.readFile(FILE, "utf-8")) as StoreData;
  } catch {
    cache = empty();
  }
  return cache;
}

function persist(data: StoreData): Promise<void> {
  writeQueue = writeQueue.then(async () => {
    const json = JSON.stringify(data);
    if (useBlob) {
      await put(BLOB_PATH, json, {
        access: "private",
        allowOverwrite: true,
        addRandomSuffix: false,
        contentType: "application/json",
      });
      return;
    }
    await fs.mkdir(DATA_DIR, { recursive: true });
    const tmp = FILE + ".tmp";
    await fs.writeFile(tmp, json);
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
  // Arredonda os vetores para reduzir o tamanho do arquivo sem afetar a busca.
  data.chunks.push(
    ...chunks.map((c) => ({ ...c, embedding: c.embedding.map((v) => Math.round(v * 1e5) / 1e5) })),
  );
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

/** Trechos (opcionalmente filtrados por documento) e mapa de documentos, numa única leitura. */
export async function getLibrary(docIds?: string[]) {
  const data = await load();
  const set = docIds?.length ? new Set(docIds) : null;
  return {
    chunks: set ? data.chunks.filter((c) => set.has(c.docId)) : data.chunks,
    docs: new Map(data.documents.map((d) => [d.id, d])),
  };
}
