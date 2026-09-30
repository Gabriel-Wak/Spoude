"use client";

import { ArrowLeft, CheckCircle2, Layers, Library, Loader2, Play, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { isDue, newCard, nextIntervalLabel, review, uid, useLocalStore, useNow, type Grade } from "@/lib/client";
import { decksStore } from "@/lib/state";
import type { Flashcard } from "@/lib/types";

interface Session {
  title: string;
  queue: { deckId: string; cardId: string }[];
  done: number;
  total: number;
}

const GRADES: { grade: Grade; label: string; key: string; className: string }[] = [
  { grade: 0, label: "Errei", key: "1", className: "border-red-200 bg-red-50 text-red-700 hover:bg-red-100" },
  { grade: 3, label: "Difícil", key: "2", className: "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100" },
  { grade: 4, label: "Bom", key: "3", className: "border-brand-200 bg-brand-50 text-brand-800 hover:bg-brand-100" },
  { grade: 5, label: "Fácil", key: "4", className: "border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100" },
];

export function FlashcardsView({ docCount }: { docCount: number }) {
  const [decks, setDecks] = useLocalStore(decksStore);
  const [session, setSession] = useState<Session | null>(null);
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(12);
  const [useLibrary, setUseLibrary] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const now = useNow();
  const allDue = decks.flatMap((d) => d.cards.filter((c) => isDue(c, now)).map((c) => ({ deckId: d.id, cardId: c.id })));

  const generate = async () => {
    const t = topic.trim();
    if (!t) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: t, count, useLibrary: useLibrary && docCount > 0 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDecks((all) => [
        {
          id: uid(),
          title: data.title || t,
          createdAt: new Date().toISOString(),
          cards: data.cards.map((c: { front: string; back: string; tag: string }) => newCard(c.front, c.back, c.tag)),
        },
        ...all,
      ]);
      setTopic("");
    } catch (err) {
      setError((err as Error).message || "Não foi possível gerar os flashcards.");
    } finally {
      setLoading(false);
    }
  };

  const start = (title: string, queue: Session["queue"]) =>
    queue.length && setSession({ title, queue, done: 0, total: queue.length });

  if (session) {
    return <StudySession session={session} setSession={setSession} />;
  }

  return (
    <div className="scroll-thin h-full overflow-y-auto">
      <div className="mx-auto max-w-4xl px-4 py-8 lg:px-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-900">Flashcards</h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500">
              Repetição espaçada (algoritmo SM-2): cada cartão volta no momento ideal para a memória de longo prazo.
            </p>
          </div>
          <button
            onClick={() => start("Revisão do dia", allDue)}
            disabled={allDue.length === 0}
            className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600 disabled:bg-slate-200 disabled:text-slate-400"
          >
            <Play className="h-4 w-4 fill-current" />
            {allDue.length ? `Revisar ${allDue.length} pendentes` : "Nada pendente hoje"}
          </button>
        </header>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Sparkles className="h-4 w-4 text-brand-600" /> Gerar novo baralho com IA
          </div>
          <form
            className="mt-3 flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              generate();
            }}
          >
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Tema — ex.: Antibióticos betalactâmicos"
              className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
            />
            <select
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none"
            >
              {[8, 12, 20, 30].map((n) => (
                <option key={n} value={n}>
                  {n} cartões
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={!topic.trim() || loading}
              className="flex items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:bg-slate-200 disabled:text-slate-400"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Layers className="h-4 w-4" />}
              {loading ? "Gerando…" : "Gerar"}
            </button>
          </form>
          <label className={`mt-3 flex items-center gap-1.5 text-xs ${docCount ? "text-slate-600" : "text-slate-400"}`}>
            <input
              type="checkbox"
              checked={useLibrary && docCount > 0}
              disabled={docCount === 0}
              onChange={(e) => setUseLibrary(e.target.checked)}
              className="accent-brand-700"
            />
            <Library className="h-3.5 w-3.5" /> Basear nos documentos da biblioteca
          </label>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </div>

        <h2 className="mt-10 text-sm font-semibold text-slate-900">Seus baralhos</h2>
        {decks.length === 0 ? (
          <p className="mt-3 rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
            Nenhum baralho ainda. Gere um acima ou a partir de um Resumo clínico.
          </p>
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {decks.map((d) => {
              const due = d.cards.filter((c) => isDue(c, now));
              const learned = d.cards.filter((c) => c.reps >= 2).length;
              return (
                <li key={d.id} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-300">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-slate-900">{d.title}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {d.cards.length} cartões · {learned} consolidados ·{" "}
                        <span className={due.length ? "font-semibold text-amber-700" : ""}>{due.length} pendentes</span>
                      </div>
                    </div>
                    <button
                      onClick={() => confirm(`Apagar o baralho "${d.title}"?`) && setDecks((all) => all.filter((x) => x.id !== d.id))}
                      className="rounded p-1.5 text-slate-300 opacity-0 transition hover:text-red-600 group-hover:opacity-100"
                      title="Apagar baralho"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-brand-500 transition-all"
                      style={{ width: `${d.cards.length ? (learned / d.cards.length) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => start(d.title, due.map((c) => ({ deckId: d.id, cardId: c.id })))}
                      disabled={due.length === 0}
                      className="flex items-center gap-1.5 rounded-lg bg-brand-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-brand-800 disabled:bg-slate-100 disabled:text-slate-400"
                    >
                      <Play className="h-3 w-3 fill-current" /> Estudar
                    </button>
                    <button
                      onClick={() => start(d.title, d.cards.map((c) => ({ deckId: d.id, cardId: c.id })))}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 transition hover:bg-slate-50"
                    >
                      <RotateCcw className="h-3 w-3" /> Revisar todos
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function StudySession({
  session,
  setSession,
}: {
  session: Session;
  setSession: (s: Session | null) => void;
}) {
  const [decks, setDecks] = useLocalStore(decksStore);
  const [flipped, setFlipped] = useState(false);

  const head = session.queue[0];
  const card: Flashcard | undefined = useMemo(
    () => (head ? decks.find((d) => d.id === head.deckId)?.cards.find((c) => c.id === head.cardId) : undefined),
    [decks, head],
  );

  const grade = useCallback(
    (g: Grade) => {
      if (!card || !head) return;
      const updated = review(card, g);
      setDecks((all) =>
        all.map((d) =>
          d.id === head.deckId ? { ...d, cards: d.cards.map((c) => (c.id === card.id ? updated : c)) } : d,
        ),
      );
      const rest = session.queue.slice(1);
      // Cartões errados voltam para o fim da fila desta sessão.
      setSession({
        ...session,
        queue: g === 0 ? [...rest, head] : rest,
        done: g === 0 ? session.done : session.done + 1,
      });
      setFlipped(false);
    },
    [card, head, session, setDecks, setSession],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === "Space") {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (flipped) {
        const g = GRADES.find((x) => x.key === e.key);
        if (g) grade(g.grade);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flipped, grade]);

  const finished = !card;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-200 bg-white px-4 py-3 lg:px-8">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <button onClick={() => setSession(null)} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-slate-900">{session.title}</div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-brand-500 transition-all"
                style={{ width: `${(session.done / session.total) * 100}%` }}
              />
            </div>
          </div>
          <div className="text-xs tabular-nums text-slate-500">
            {session.done}/{session.total}
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center overflow-y-auto p-4">
        {finished ? (
          <div className="text-center">
            <CheckCircle2 className="mx-auto h-14 w-14 text-brand-600" />
            <h2 className="mt-4 font-display text-2xl font-semibold text-slate-900">Sessão concluída!</h2>
            <p className="mt-2 text-sm text-slate-500">
              {session.total} cartões revisados. Os próximos aparecerão no momento certo.
            </p>
            <button
              onClick={() => setSession(null)}
              className="mt-6 rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
            >
              Voltar aos baralhos
            </button>
          </div>
        ) : (
          <div className="w-full max-w-2xl">
            <div className="flip cursor-pointer" onClick={() => setFlipped((f) => !f)}>
              <div className={`flip-inner relative min-h-[320px] ${flipped ? "flipped" : ""}`}>
                <CardFace label="Pergunta" tag={card.tag} text={card.front} hint="Clique ou pressione espaço para virar" />
                <CardFace label="Resposta" tag={card.tag} text={card.back} back />
              </div>
            </div>
            <div className={`mt-6 grid grid-cols-4 gap-2 transition ${flipped ? "opacity-100" : "pointer-events-none opacity-0"}`}>
              {GRADES.map((g) => (
                <button
                  key={g.grade}
                  onClick={() => grade(g.grade)}
                  className={`rounded-xl border px-2 py-3 text-sm font-semibold transition ${g.className}`}
                >
                  {g.label}
                  <span className="mt-0.5 block text-[11px] font-normal opacity-70">
                    {nextIntervalLabel(card, g.grade)} · tecla {g.key}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CardFace({
  label,
  tag,
  text,
  hint,
  back = false,
}: {
  label: string;
  tag?: string;
  text: string;
  hint?: string;
  back?: boolean;
}) {
  return (
    <div
      className={`flip-face absolute inset-0 flex flex-col rounded-3xl border p-8 shadow-lg ${
        back ? "flip-back border-brand-200 bg-brand-50" : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider">
        <span className={back ? "text-brand-700" : "text-slate-400"}>{label}</span>
        {tag && <span className="rounded-full bg-slate-100 px-2 py-0.5 normal-case tracking-normal text-slate-500">{tag}</span>}
      </div>
      <div className="flex flex-1 items-center justify-center py-6 text-center font-display text-xl leading-relaxed text-slate-900 sm:text-2xl">
        {text.replace(/\*\*|__/g, "")}
      </div>
      {hint && <div className="text-center text-xs text-slate-400">{hint}</div>}
    </div>
  );
}
