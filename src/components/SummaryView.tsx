"use client";

import { Check, Copy, Download, FileText, Layers, Library, Loader2, Sparkles, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { newCard, readStream, uid, useLocalStore } from "@/lib/client";
import { decksStore, summariesStore, type SavedSummary } from "@/lib/state";
import type { Source } from "@/lib/types";
import { SourceModal } from "./ChatView";
import { Markdown } from "./Markdown";

const EXAMPLES = [
  "Insuficiência cardíaca com FE reduzida",
  "Cetoacidose diabética",
  "Pré-eclâmpsia",
  "Pneumonia adquirida na comunidade",
  "Síndrome nefrótica na infância",
  "Tromboembolismo pulmonar",
];

export function SummaryView({
  docCount,
  onOpenFlashcards,
}: {
  docCount: number;
  onOpenFlashcards: () => void;
}) {
  const [summaries, setSummaries] = useLocalStore(summariesStore);
  const [, setDecks] = useLocalStore(decksStore);
  const [topic, setTopic] = useState("");
  const [useLibrary, setUseLibrary] = useState(true);
  const [current, setCurrent] = useState<SavedSummary | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openSource, setOpenSource] = useState<Source | null>(null);
  const [copied, setCopied] = useState(false);
  const [makingCards, setMakingCards] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  const generate = async (t: string) => {
    const theme = t.trim();
    if (!theme || streaming) return;
    setError(null);
    setStreaming(true);
    const draft: SavedSummary = {
      id: uid(),
      topic: theme,
      content: "",
      sources: [],
      createdAt: new Date().toISOString(),
    };
    setCurrent(draft);
    topRef.current?.scrollIntoView({ behavior: "smooth" });

    try {
      const res = await fetch("/api/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: theme, useLibrary: useLibrary && docCount > 0 }),
      });
      await readStream(res, (e) => {
        if (e.type === "sources") draft.sources = e.sources;
        else if (e.type === "delta") draft.content += e.text;
        else if (e.type === "error") setError(e.message);
        setCurrent({ ...draft });
      });
    } catch {
      setError("Falha de conexão com o servidor.");
    } finally {
      setStreaming(false);
      if (draft.content) setSummaries((all) => [draft, ...all].slice(0, 30));
    }
  };

  const makeFlashcards = async () => {
    if (!current) return;
    setMakingCards(true);
    setError(null);
    try {
      const res = await fetch("/api/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: current.topic, count: 15, sourceText: current.content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDecks((all) => [
        {
          id: uid(),
          title: data.title || current.topic,
          createdAt: new Date().toISOString(),
          cards: data.cards.map((c: { front: string; back: string; tag: string }) =>
            newCard(c.front, c.back, c.tag),
          ),
        },
        ...all,
      ]);
      onOpenFlashcards();
    } catch (err) {
      setError((err as Error).message || "Não foi possível gerar os flashcards.");
    } finally {
      setMakingCards(false);
    }
  };

  const download = () => {
    if (!current) return;
    const blob = new Blob([current.content], { type: "text/markdown;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `resumo-${current.topic.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-")}.md`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="scroll-thin h-full overflow-y-auto">
      <div ref={topRef} className="mx-auto max-w-4xl px-4 py-8 lg:px-8">
        <header>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-900">Resumos clínicos</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
            Gere uma estrutura de resumo padronizada — definição, fisiopatologia, quadro clínico, diagnóstico,
            diferenciais, tratamento e pontos de prova — e transforme em flashcards com um clique.
          </p>
        </header>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            generate(topic);
          }}
          className="mt-6 flex flex-col gap-2 sm:flex-row"
        >
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Tema — ex.: Fibrilação atrial"
            className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-[15px] outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
          />
          <button
            type="submit"
            disabled={!topic.trim() || streaming}
            className="flex items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:bg-slate-200 disabled:text-slate-400"
          >
            {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Gerar resumo
          </button>
        </form>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => {
                setTopic(ex);
                generate(ex);
              }}
              disabled={streaming}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 transition hover:border-brand-300 hover:text-brand-800"
            >
              {ex}
            </button>
          ))}
          <label
            className={`ml-auto flex items-center gap-1.5 text-xs ${docCount ? "text-slate-600" : "text-slate-400"}`}
          >
            <input
              type="checkbox"
              checked={useLibrary && docCount > 0}
              disabled={docCount === 0}
              onChange={(e) => setUseLibrary(e.target.checked)}
              className="accent-brand-700"
            />
            <Library className="h-3.5 w-3.5" /> Usar biblioteca
          </label>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {current && (
          <article className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
            {current.content ? (
              <Markdown
                content={current.content}
                streaming={streaming}
                onCite={(n) => {
                  const s = current.sources.find((x) => x.n === n);
                  if (s) setOpenSource(s);
                }}
              />
            ) : (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Estruturando o resumo de “{current.topic}”…
              </div>
            )}
            {!streaming && current.content && (
              <div className="mt-8 flex flex-wrap gap-2 border-t border-slate-100 pt-5">
                <button
                  onClick={makeFlashcards}
                  disabled={makingCards}
                  className="flex items-center gap-2 rounded-lg bg-brand-700 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-brand-800 disabled:opacity-60"
                >
                  {makingCards ? <Loader2 className="h-4 w-4 animate-spin" /> : <Layers className="h-4 w-4" />}
                  {makingCards ? "Gerando flashcards…" : "Gerar flashcards deste resumo"}
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(current.content);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copiado" : "Copiar"}
                </button>
                <button
                  onClick={download}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 px-3.5 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                >
                  <Download className="h-4 w-4" /> Baixar .md
                </button>
              </div>
            )}
          </article>
        )}

        {summaries.length > 0 && (
          <section className="mt-10">
            <h2 className="text-sm font-semibold text-slate-900">Resumos salvos</h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {summaries.map((s) => (
                <li
                  key={s.id}
                  className={`group flex items-center gap-3 rounded-xl border bg-white px-4 py-3 transition hover:border-brand-300 ${
                    current?.id === s.id ? "border-brand-400" : "border-slate-200"
                  }`}
                >
                  <FileText className="h-4 w-4 shrink-0 text-brand-700" />
                  <button
                    onClick={() => {
                      if (!streaming) {
                        setCurrent(s);
                        topRef.current?.scrollIntoView({ behavior: "smooth" });
                      }
                    }}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="truncate text-sm font-medium text-slate-800">{s.topic}</div>
                    <div className="text-xs text-slate-400">
                      {new Date(s.createdAt).toLocaleDateString("pt-BR")}
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setSummaries((all) => all.filter((x) => x.id !== s.id));
                      if (current?.id === s.id) setCurrent(null);
                    }}
                    className="rounded p-1.5 text-slate-300 opacity-0 transition hover:text-red-600 group-hover:opacity-100"
                    title="Apagar"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
      {openSource && <SourceModal source={openSource} onClose={() => setOpenSource(null)} />}
    </div>
  );
}
