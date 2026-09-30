"use client";

import {
  BookMarked,
  FileText,
  FileUp,
  Loader2,
  NotebookPen,
  ScrollText,
  Stethoscope,
  Trash2,
  Newspaper,
  Folder,
} from "lucide-react";
import { useRef, useState } from "react";
import { formatBytes } from "@/lib/client";
import type { DocumentKind, LibraryDocument } from "@/lib/types";

const KINDS: { id: DocumentKind; label: string; icon: typeof FileText }[] = [
  { id: "livro", label: "Livro", icon: BookMarked },
  { id: "artigo", label: "Artigo", icon: Newspaper },
  { id: "diretriz", label: "Diretriz", icon: ScrollText },
  { id: "relato", label: "Relato de caso", icon: Stethoscope },
  { id: "apostila", label: "Apostila / anotações", icon: NotebookPen },
  { id: "outro", label: "Outro", icon: Folder },
];

interface Upload {
  name: string;
  status: "uploading" | "error";
  message?: string;
}

export function LibraryView({
  documents,
  onChange,
  maxUploadMB,
}: {
  documents: LibraryDocument[];
  onChange: () => void;
  maxUploadMB: number;
}) {
  const [kind, setKind] = useState<DocumentKind>("livro");
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFiles = async (files: FileList | File[]) => {
    for (const file of Array.from(files)) {
      if (file.size > maxUploadMB * 1024 * 1024) {
        setUploads((u) => [
          ...u,
          { name: file.name, status: "error", message: `Arquivo acima de ${maxUploadMB} MB.` },
        ]);
        continue;
      }
      setUploads((u) => [...u, { name: file.name, status: "uploading" }]);
      const form = new FormData();
      form.append("file", file);
      form.append("kind", kind);
      try {
        const res = await fetch("/api/documents", { method: "POST", body: form });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Falha no envio.");
        setUploads((u) => u.filter((x) => x.name !== file.name));
        onChange();
      } catch (err) {
        setUploads((u) =>
          u.map((x) =>
            x.name === file.name ? { ...x, status: "error", message: (err as Error).message } : x,
          ),
        );
      }
    }
  };

  const remove = async (doc: LibraryDocument) => {
    if (!confirm(`Remover "${doc.name}" da biblioteca?`)) return;
    await fetch(`/api/documents/${doc.id}`, { method: "DELETE" });
    onChange();
  };

  const totalChunks = documents.reduce((s, d) => s + d.chunkCount, 0);

  return (
    <div className="scroll-thin h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-4 py-8 lg:px-8">
        <header>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-900">Biblioteca</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
            Envie livros, artigos, diretrizes, relatos de caso e suas anotações. O Spoude indexa o conteúdo
            (busca semântica/RAG) e passa a responder com base nele, citando o trecho de origem.
          </p>
        </header>

        <div className="mt-6 flex flex-wrap gap-2">
          {KINDS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setKind(id)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                kind === id
                  ? "border-brand-600 bg-brand-700 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          className={`mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition ${
            dragging ? "border-brand-500 bg-brand-50" : "border-slate-300 bg-white hover:border-brand-400 hover:bg-brand-50/40"
          }`}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
            <FileUp className="h-6 w-6" />
          </div>
          <p className="mt-4 text-sm font-semibold text-slate-800">
            Arraste arquivos aqui ou clique para selecionar
          </p>
          <p className="mt-1 text-xs text-slate-500">
            PDF, DOCX, TXT ou MD · até {maxUploadMB} MB · serão marcados como “{KINDS.find((k) => k.id === kind)?.label}”
          </p>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.txt,.md"
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) uploadFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        {uploads.length > 0 && (
          <div className="mt-4 space-y-2">
            {uploads.map((u) => (
              <div
                key={u.name}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm ${
                  u.status === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-brand-200 bg-brand-50 text-brand-800"
                }`}
              >
                {u.status === "uploading" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                <span className="min-w-0 flex-1 truncate font-medium">{u.name}</span>
                <span className="text-xs">
                  {u.status === "uploading" ? "Extraindo texto e indexando…" : u.message}
                </span>
                {u.status === "error" && (
                  <button
                    onClick={() => setUploads((all) => all.filter((x) => x !== u))}
                    className="text-xs underline"
                  >
                    fechar
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-10 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-slate-900">
            {documents.length} {documents.length === 1 ? "documento" : "documentos"}
          </h2>
          {totalChunks > 0 && (
            <span className="text-xs text-slate-400">{totalChunks} trechos indexados</span>
          )}
        </div>

        {documents.length === 0 ? (
          <p className="mt-3 rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
            Nenhum documento ainda. Sem documentos, o Spoude responde com o conhecimento geral do modelo.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {documents.map((d) => {
              const K = KINDS.find((k) => k.id === d.kind) ?? KINDS[5];
              return (
                <li key={d.id} className="group flex items-center gap-4 px-4 py-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    <K.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-900">{d.name}</div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      {K.label} · {formatBytes(d.size)}
                      {d.pages ? ` · ${d.pages} páginas` : ""} · {d.chunkCount} trechos ·{" "}
                      {new Date(d.createdAt).toLocaleDateString("pt-BR")}
                    </div>
                  </div>
                  <button
                    onClick={() => remove(d)}
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                    title="Remover"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
