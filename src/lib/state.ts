"use client";

import { createLocalStore } from "./client";
import type { ChatMessage, Deck, Source, StudyMode } from "./types";

export interface Conversation {
  id: string;
  title: string;
  mode: StudyMode;
  messages: ChatMessage[];
  updatedAt: string;
}

export const conversationsStore = createLocalStore<Conversation[]>(
  "spoude:conversations",
  [],
);
export const decksStore = createLocalStore<Deck[]>("spoude:decks", []);
export const disclaimerStore = createLocalStore<boolean>("spoude:disclaimer-accepted", false);

export interface SavedSummary {
  id: string;
  topic: string;
  content: string;
  sources: Source[];
  createdAt: string;
}

export const summariesStore = createLocalStore<SavedSummary[]>("spoude:summaries", []);
