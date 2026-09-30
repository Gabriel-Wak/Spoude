"use client";

import {
  BookOpenText,
  FileText,
  Layers,
  MessageSquareText,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import type { Conversation } from "@/lib/state";
import { DISCLAIMER_SHORT } from "./Disclaimer";

export type View = "chat" | "library" | "summary" | "flashcards";

const NAV: { id: View; label: string; icon: typeof MessageSquareText }[] = [
  { id: "chat", label: "Chat de estudo", icon: MessageSquareText },
  { id: "library", label: "Biblioteca", icon: BookOpenText },
  { id: "summary", label: "Resumos clínicos", icon: FileText },
  { id: "flashcards", label: "Flashcards", icon: Layers },
];

export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-800 font-display text-lg font-bold text-white shadow-sm">
        σ
      </div>
      <div className="leading-tight">
        <div className="font-display text-xl font-semibold tracking-tight text-slate-900">Spoude</div>
        <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-brand-700">
          Beta · Tutor médico IA
        </div>
      </div>
    </div>
  );
}

export function Sidebar({
  view,
  onView,
  conversations,
  activeId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  dueCount,
  docCount,
  open,
  onClose,
}: {
  view: View;
  onView: (v: View) => void;
  conversations: Conversation[];
  activeId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  dueCount: number;
  docCount: number;
  open: boolean;
  onClose: () => void;
}) {
  const badge = (id: View) =>
    id === "flashcards" && dueCount > 0
      ? dueCount
      : id === "library" && docCount > 0
        ? docCount
        : null;

  return (
    <>
      <div
        className={`fixed inset-0 z-30 bg-slate-950/30 lg:hidden ${open ? "" : "hidden"}`}
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-200 bg-white transition-transform lg:static lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between px-5 pb-4 pt-5">
          <Logo />
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-3">
          <button
            onClick={onNewConversation}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-700 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-800"
          >
            <Plus className="h-4 w-4" /> Nova conversa
          </button>
        </div>

        <nav className="mt-4 space-y-0.5 px-3">
          {NAV.map(({ id, label, icon: Icon }) => {
            const b = badge(id);
            return (
              <button
                key={id}
                onClick={() => onView(id)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  view === id ? "bg-brand-50 text-brand-800" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="flex-1 text-left">{label}</span>
                {b !== null && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      id === "flashcards" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {b}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="mt-6 px-5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Conversas recentes
        </div>
        <div className="scroll-thin mt-2 flex-1 space-y-0.5 overflow-y-auto px-3 pb-3">
          {conversations.length === 0 && (
            <p className="px-3 py-2 text-xs text-slate-400">Suas conversas aparecerão aqui.</p>
          )}
          {conversations.map((c) => (
            <div
              key={c.id}
              className={`group flex items-center rounded-lg transition ${
                view === "chat" && c.id === activeId ? "bg-slate-100" : "hover:bg-slate-50"
              }`}
            >
              <button
                onClick={() => onSelectConversation(c.id)}
                className="min-w-0 flex-1 truncate px-3 py-2 text-left text-sm text-slate-700"
                title={c.title}
              >
                {c.title}
              </button>
              <button
                onClick={() => onDeleteConversation(c.id)}
                className="mr-1 rounded p-1.5 text-slate-400 opacity-0 transition hover:bg-white hover:text-red-600 group-hover:opacity-100"
                title="Apagar conversa"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        <p className="border-t border-slate-100 px-5 py-4 text-[11px] leading-relaxed text-slate-400">
          {DISCLAIMER_SHORT}
        </p>
      </aside>
    </>
  );
}
