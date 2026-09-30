"use client";

import { useSyncExternalStore } from "react";
import type { Flashcard, StreamEvent } from "./types";

export function uid(): string {
  return crypto.randomUUID();
}

/** Lê uma resposta NDJSON do servidor chamando `onEvent` para cada linha. */
export async function readStream(
  res: Response,
  onEvent: (e: StreamEvent) => void,
): Promise<void> {
  if (!res.ok || !res.body) {
    let message = `Erro ${res.status}`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {}
    onEvent({ type: "error", message });
    return;
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (line) onEvent(JSON.parse(line) as StreamEvent);
    }
  }
  if (buffer.trim()) onEvent(JSON.parse(buffer) as StreamEvent);
}

/* ------------------------------------------------------------------ */
/* Estado persistido no localStorage (versão beta, sem login)          */
/* ------------------------------------------------------------------ */

type Listener = () => void;

export interface LocalStore<T> {
  get(): T;
  set(next: T | ((prev: T) => T)): void;
  subscribe(l: Listener): () => void;
  fallback: T;
}

export function createLocalStore<T>(key: string, fallback: T): LocalStore<T> {
  let cached: T | undefined;
  const listeners = new Set<Listener>();

  const read = (): T => {
    if (cached !== undefined) return cached;
    try {
      const raw = localStorage.getItem(key);
      cached = raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      cached = fallback;
    }
    return cached;
  };

  return {
    fallback,
    get: read,
    set(next) {
      const value =
        typeof next === "function" ? (next as (p: T) => T)(read()) : next;
      cached = value;
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {}
      listeners.forEach((l) => l());
    },
    subscribe(l) {
      listeners.add(l);
      const onStorage = (e: StorageEvent) => {
        if (e.key === key) {
          cached = undefined;
          l();
        }
      };
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(l);
        window.removeEventListener("storage", onStorage);
      };
    },
  };
}

export function useLocalStore<T>(store: LocalStore<T>): [T, LocalStore<T>["set"]] {
  const value = useSyncExternalStore(store.subscribe, store.get, () => store.fallback);
  return [value, store.set];
}

/* ------------------------------------------------------------------ */
/* Repetição espaçada — algoritmo SM-2 simplificado                    */
/* ------------------------------------------------------------------ */

export type Grade = 0 | 3 | 4 | 5; // Errei · Difícil · Bom · Fácil

const DAY = 24 * 60 * 60 * 1000;

export function newCard(front: string, back: string, tag?: string): Flashcard {
  return {
    id: uid(),
    front,
    back,
    tag,
    ease: 2.5,
    interval: 0,
    reps: 0,
    due: new Date(0).toISOString(), // cartão novo: disponível imediatamente
  };
}

export function review(card: Flashcard, grade: Grade, now = Date.now()): Flashcard {
  let { ease, interval, reps } = card;

  if (grade < 3) {
    reps = 0;
    interval = 0; // volta ainda nesta sessão (em 10 min)
  } else {
    reps += 1;
    if (reps === 1) interval = grade === 5 ? 3 : 1;
    else if (reps === 2) interval = grade === 5 ? 8 : 6;
    else interval = Math.round(interval * ease * (grade === 3 ? 0.8 : grade === 5 ? 1.3 : 1));
  }
  ease = Math.max(1.3, ease + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02)));

  const due = interval === 0 ? now + 10 * 60 * 1000 : now + interval * DAY;
  return { ...card, ease, interval, reps, due: new Date(due).toISOString() };
}

export function nextIntervalLabel(card: Flashcard, grade: Grade): string {
  const r = review(card, grade);
  if (r.interval === 0) return "10 min";
  if (r.interval === 1) return "1 dia";
  if (r.interval < 30) return `${r.interval} dias`;
  const months = Math.round(r.interval / 30);
  return months === 1 ? "1 mês" : `${months} meses`;
}

export function isDue(card: Flashcard, now = Date.now()): boolean {
  return new Date(card.due).getTime() <= now;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/* Relógio compartilhado que atualiza a cada 30 s (ex.: contagem de cartões pendentes). */
let nowValue = 0;
const nowListeners = new Set<Listener>();
let nowTimer: ReturnType<typeof setInterval> | undefined;

function subscribeNow(l: Listener) {
  nowListeners.add(l);
  if (!nowTimer) {
    nowTimer = setInterval(() => {
      nowValue = Date.now();
      nowListeners.forEach((fn) => fn());
    }, 30_000);
  }
  return () => {
    nowListeners.delete(l);
    if (nowListeners.size === 0 && nowTimer) {
      clearInterval(nowTimer);
      nowTimer = undefined;
    }
  };
}

function getNow() {
  if (!nowValue) nowValue = Date.now();
  return nowValue;
}

export function useNow(): number {
  return useSyncExternalStore(subscribeNow, getNow, () => 0);
}
