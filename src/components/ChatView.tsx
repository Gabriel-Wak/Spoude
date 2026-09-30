"use client";

import {
  ArrowUp,
  BookOpenText,
  Brain,
  ClipboardList,
  Copy,
  Check,
  GraduationCap,
  Library,
  Microscope,
  Square,
  Stethoscope,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { readStream } from "@/lib/client";
import { conversationsStore, type Conversation } from "@/lib/state";
import type { ChatMessage, Source, StudyMode } from "@/lib/types";
import { Markdown } from "./Markdown";

const MODES: { id: StudyMode; label: string; icon: typeof Brain; hint: string }[] = [
  { id: "explicar", label: "Explicar", icon: Brain, hint: "Do mecanismo à clínica" },
  { id: "revisao", label: "Revisão de literatura", icon: Microscope, hint: "Síntese de evidências" },
  { id: "caso", label: "Caso clínico", icon: Stethoscope, hint: "Casos fictícios, passo a passo" },
  { id: "questoes", label: "Questões de prova", icon: ClipboardList, hint: "Estilo residência" },
];

const SUGGESTIONS: Record<StudyMode, string[]> = {
  explicar: [
    "Explique a fisiopatologia da insuficiência cardíaca com fração de ejeção reduzida",
    "Como funciona o sistema renina-angiotensina-aldosterona?",
    "Qual a diferença entre síndrome nefrítica e nefrótica?",
    "Explique a interpretação de uma gasometria arterial passo a passo",
  ],
  revisao: [
    "Qual a evidência atual dos iSGLT2 na doença renal crônica?",
    "Revise o uso de corticoide na pneumonia comunitária grave",
    "O que as diretrizes recomendam no rastreio de câncer colorretal?",
    "Síntese de evidências: metas pressóricas no idoso",
  ],
  caso: [
    "Me apresente um caso de dor torácica no pronto-socorro para eu resolver",
    "Caso clínico de cetoacidose diabética em adolescente",
    "Caso pediátrico de febre sem sinais localizatórios",
    "Caso de gestante com cefaleia e hipertensão no 3º trimestre",
  ],
  questoes: [
    "Crie 5 questões de residência sobre sepse",
    "3 questões sobre pré-eclâmpsia com gabarito comentado",
    "Questões de farmacologia de antiarrítmicos",
    "5 questões de pediatria sobre imunização",
  ],
};

export function ChatView({
  conversationId,
  docCount,
}: {
  conversationId: string;
  docCount: number;
}) {
  const initial = conversationsStore.get().find((c) => c.id === conversationId);
  const [messages, setMessages] = useState<ChatMessage[]>(initial?.messages ?? []);
  const [mode, setMode] = useState<StudyMode>(initial?.mode ?? "explicar");
  const [useLibrary, setUseLibrary] = useState(true);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openSource, setOpenSource] = useState<Source | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const stickToBottom = useRef(true);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el && messages.length > 0 && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const persist = (msgs: ChatMessage[], m: StudyMode) => {
    const firstUser = msgs.find((x) => x.role === "user")?.content ?? "Nova conversa";
    const conv: Conversation = {
      id: conversationId,
      title: firstUser.length > 60 ? firstUser.slice(0, 57) + "…" : firstUser,
      mode: m,
      messages: msgs,
      updatedAt: new Date().toISOString(),
    };
    conversationsStore.set((all) => [conv, ...all.filter((c) => c.id !== conversationId)]);
  };

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || streaming) return;
    setError(null);
    setInput("");
    stickToBottom.current = true;

    const history: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages([...history, { role: "assistant", content: "" }]);
    persist(history, mode);
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;
    let answer = "";
    let sources: Source[] = [];
    const update = () =>
      setMessages([...history, { role: "assistant", content: answer, sources }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map(({ role, content }) => ({ role, content })),
          mode,
          useLibrary: useLibrary && docCount > 0,
        }),
        signal: controller.signal,
      });
      await readStream(res, (e) => {
        if (e.type === "sources") sources = e.sources;
        else if (e.type === "delta") answer += e.text;
        else if (e.type === "error") setError(e.message);
        update();
      });
    } catch (err) {
      if ((err as Error).name !== "AbortError") setError("Falha de conexão com o servidor.");
    } finally {
      setStreaming(false);
      abortRef.current = null;
      const final: ChatMessage[] = answer
        ? [...history, { role: "assistant", content: answer, sources }]
        : history;
      setMessages(final);
      persist(final, mode);
      textareaRef.current?.focus();
    }
  };

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const empty = messages.length === 0;

  return (
    <div className="flex h-full flex-col">
      {/* Barra de modos */}
      <div className="border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur lg:px-8">
        <div className="scroll-thin mx-auto flex max-w-3xl items-center gap-2 overflow-x-auto [scrollbar-width:none] sm:flex-wrap">
          {MODES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setMode(id)}
              disabled={streaming}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                mode === id
                  ? "border-brand-600 bg-brand-700 text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
          <button
            onClick={() => setUseLibrary((v) => !v)}
            disabled={docCount === 0}
            title={docCount === 0 ? "Envie documentos na Biblioteca para ativar" : undefined}
            className={`ml-auto flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
              useLibrary && docCount > 0
                ? "border-brand-200 bg-brand-50 text-brand-800"
                : "border-slate-200 bg-white text-slate-500"
            }`}
          >
            <Library className="h-3.5 w-3.5" />
            {docCount === 0
              ? "Biblioteca vazia"
              : useLibrary
                ? `Consultando biblioteca (${docCount})`
                : "Biblioteca desligada"}
          </button>
        </div>
      </div>

      {/* Mensagens */}
      <div ref={scrollRef} onScroll={onScroll} className="scroll-thin flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-8 lg:px-8">
          {empty ? (
            <div className="pt-6 text-center sm:pt-12">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-800 text-white shadow-lg shadow-brand-900/20">
                <GraduationCap className="h-7 w-7" />
              </div>
              <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                O que vamos estudar hoje?
              </h1>
              <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-500">
                {MODES.find((m) => m.id === mode)?.hint}.{" "}
                {docCount > 0
                  ? "As respostas priorizam os documentos da sua biblioteca e citam as fontes."
                  : "Envie livros, artigos e diretrizes na Biblioteca para respostas com citações."}
              </p>
              <div className="mt-8 grid gap-2.5 text-left sm:grid-cols-2">
                {SUGGESTIONS[mode].map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-xl border border-slate-200 bg-white p-4 text-sm leading-snug text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {messages.map((m, i) => (
                <MessageBubble
                  key={i}
                  message={m}
                  streaming={streaming && i === messages.length - 1}
                  onCite={(n) => {
                    const s = m.sources?.find((x) => x.n === n);
                    if (s) setOpenSource(s);
                  }}
                />
              ))}
            </div>
          )}
          {error && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Campo de mensagem */}
      <div className="border-t border-slate-200 bg-white px-4 pb-4 pt-3 lg:px-8">
        <form
          className="mx-auto max-w-3xl"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <div className="flex items-end gap-2 rounded-2xl border border-slate-300 bg-white p-2 shadow-sm transition focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-100">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px";
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  send(input);
                }
              }}
              rows={1}
              placeholder="Digite sua dúvida de medicina…"
              className="max-h-[200px] flex-1 resize-none bg-transparent px-2 py-2 text-[15px] text-slate-900 outline-none placeholder:text-slate-400"
            />
            {streaming ? (
              <button
                type="button"
                onClick={() => abortRef.current?.abort()}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white transition hover:bg-slate-700"
                title="Parar"
              >
                <Square className="h-4 w-4 fill-current" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-700 text-white transition hover:bg-brand-800 disabled:bg-slate-200 disabled:text-slate-400"
                title="Enviar"
              >
                <ArrowUp className="h-5 w-5" />
              </button>
            )}
          </div>
          <p className="mt-2 text-center text-[11px] text-slate-400">
            Uso exclusivamente acadêmico. A IA pode errar — confira nas fontes e diretrizes vigentes.
          </p>
        </form>
      </div>

      {openSource && <SourceModal source={openSource} onClose={() => setOpenSource(null)} />}
    </div>
  );
}

function MessageBubble({
  message,
  streaming,
  onCite,
}: {
  message: ChatMessage;
  streaming: boolean;
  onCite: (n: number) => void;
}) {
  const [copied, setCopied] = useState(false);

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-brand-700 px-4 py-3 text-[15px] leading-relaxed text-white">
          {message.content}
        </div>
      </div>
    );
  }

  const sources = message.sources ?? [];
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-800 font-display text-sm font-bold text-white">
        σ
      </div>
      <div className="min-w-0 flex-1">
        {message.content ? (
          <Markdown content={message.content} streaming={streaming} onCite={onCite} />
        ) : (
          <div className="flex items-center gap-2 pt-1.5 text-sm text-slate-500">
            <span className="flex gap-1">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-500 [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-500 [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-500" />
            </span>
            {sources.length > 0 ? `Lendo ${sources.length} trechos da sua biblioteca…` : "Pensando…"}
          </div>
        )}

        {!streaming && message.content && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {sources.map((s) => (
              <button
                key={s.n}
                onClick={() => onCite(s.n)}
                className="flex max-w-[260px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 transition hover:border-brand-300 hover:text-brand-800"
              >
                <span className="font-semibold text-brand-700">{s.n}</span>
                <BookOpenText className="h-3 w-3 shrink-0" />
                <span className="truncate">{s.docName}</span>
              </button>
            ))}
            <button
              onClick={() => {
                navigator.clipboard.writeText(message.content);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? "Copiado" : "Copiar"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function SourceModal({ source, onClose }: { source: Source; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-xl flex-col rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 border-b border-slate-100 p-5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-sm font-bold text-brand-800">
            {source.n}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold text-slate-900">{source.docName}</div>
            <div className="text-xs capitalize text-slate-500">
              {source.kind} · relevância {(source.score * 100).toFixed(0)}%
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="scroll-thin overflow-y-auto whitespace-pre-wrap p-5 text-sm leading-relaxed text-slate-700">
          {source.excerpt}
        </div>
      </div>
    </div>
  );
}
