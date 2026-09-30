"use client";

import { AlertTriangle, Menu } from "lucide-react";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { isDue, uid, useLocalStore, useNow } from "@/lib/client";
import { conversationsStore, decksStore } from "@/lib/state";
import type { LibraryDocument } from "@/lib/types";
import { ChatView } from "./ChatView";
import { DisclaimerModal } from "./Disclaimer";
import { FlashcardsView } from "./FlashcardsView";
import { LibraryView } from "./LibraryView";
import { Logo, Sidebar, type View } from "./Sidebar";
import { SummaryView } from "./SummaryView";

const noop = () => () => {};

export function SpoudeApp() {
  // O estado do usuário vive no localStorage; renderiza só no cliente para evitar divergência de hidratação.
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  const [view, setView] = useState<View>("chat");
  const [conversations, setConversations] = useLocalStore(conversationsStore);
  const [decks] = useLocalStore(decksStore);
  const now = useNow();
  const [activeId, setActiveId] = useState<string>(() => uid());
  const [documents, setDocuments] = useState<LibraryDocument[]>([]);
  const [configured, setConfigured] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const loadDocuments = useCallback(async () => {
    try {
      const res = await fetch("/api/documents");
      const data = await res.json();
      setDocuments(data.documents ?? []);
    } catch {}
  }, []);

  useEffect(() => {
    fetch("/api/documents")
      .then((r) => r.json())
      .then((d) => setDocuments(d.documents ?? []))
      .catch(() => {});
    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => setConfigured(Boolean(d.configured)))
      .catch(() => {});
  }, []);

  const go = (v: View) => {
    setView(v);
    setSidebarOpen(false);
  };

  if (!mounted) {
    return (
      <div className="flex h-full items-center justify-center">
        <Logo />
      </div>
    );
  }

  const dueCount = decks.reduce((s, d) => s + d.cards.filter((c) => isDue(c, now)).length, 0);

  return (
    <div className="flex h-full">
      <Sidebar
        view={view}
        onView={go}
        conversations={conversations}
        activeId={activeId}
        onSelectConversation={(id) => {
          setActiveId(id);
          go("chat");
        }}
        onNewConversation={() => {
          setActiveId(uid());
          go("chat");
        }}
        onDeleteConversation={(id) => {
          setConversations((all) => all.filter((c) => c.id !== id));
          if (id === activeId) setActiveId(uid());
        }}
        dueCount={dueCount}
        docCount={documents.length}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100">
            <Menu className="h-5 w-5" />
          </button>
          <Logo />
        </div>

        {!configured && (
          <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            OPENAI_API_KEY não configurada no servidor. Copie <code>.env.example</code> para <code>.env.local</code> e
            reinicie.
          </div>
        )}

        <div className="min-h-0 flex-1">
          {view === "chat" && <ChatView key={activeId} conversationId={activeId} docCount={documents.length} />}
          {view === "library" && <LibraryView documents={documents} onChange={loadDocuments} />}
          {view === "summary" && <SummaryView docCount={documents.length} onOpenFlashcards={() => go("flashcards")} />}
          {view === "flashcards" && <FlashcardsView docCount={documents.length} />}
        </div>
      </main>

      <DisclaimerModal />
    </div>
  );
}
