export type DocumentKind =
  | "livro"
  | "artigo"
  | "diretriz"
  | "relato"
  | "apostila"
  | "outro";

export interface LibraryDocument {
  id: string;
  name: string;
  kind: DocumentKind;
  mime: string;
  size: number;
  pages?: number;
  chars: number;
  chunkCount: number;
  createdAt: string;
}

export interface Chunk {
  id: string;
  docId: string;
  index: number;
  text: string;
  embedding: number[];
}

/** Trecho recuperado da biblioteca e enviado ao cliente como fonte citável. */
export interface Source {
  n: number;
  docId: string;
  docName: string;
  kind: DocumentKind;
  excerpt: string;
  score: number;
}

export type StudyMode = "explicar" | "revisao" | "caso" | "questoes";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
}

/** Eventos enviados pelo servidor em NDJSON (uma linha JSON por evento). */
export type StreamEvent =
  | { type: "sources"; sources: Source[] }
  | { type: "delta"; text: string }
  | { type: "done" }
  | { type: "error"; message: string };

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  tag?: string;
  // Estado do algoritmo SM-2
  ease: number;
  interval: number;
  reps: number;
  due: string;
}

export interface Deck {
  id: string;
  title: string;
  createdAt: string;
  cards: Flashcard[];
}
