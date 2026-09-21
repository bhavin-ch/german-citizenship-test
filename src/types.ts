export type Choice = "a" | "b" | "c" | "d";

export interface Localized {
  question: string;
  a: string;
  b: string;
  c: string;
  d: string;
  context: string | null;
}

export interface Question {
  id: string;
  num: string;
  category: string | null;
  /** Two-letter state code (e.g. "BY"), or null for the 300 general questions. */
  state: string | null;
  image: string | null;
  solution: Choice;
  de: Localized;
  en: Localized;
}

export type Mode = "exam" | "practice" | "state";

export interface QuestionResult {
  id: string;
  chosen: Choice | null; // null = left unanswered (e.g. exam timed out)
  correct: boolean;
}

export interface Attempt {
  id: string;
  hash: string; // deterministic id derived from the ordered question ids
  date: string; // ISO
  mode: Mode;
  state: string | null;
  total: number;
  correct: number;
  passed: boolean;
  durationSec: number;
  results: QuestionResult[];
}

export interface QuestionStat {
  seen: number;
  correct: number;
  wrong: number;
  lastCorrect: boolean;
}

export interface Gamify {
  xp: number;
  streak: number;
  lastActiveDate: string | null; // YYYY-MM-DD
  badges: string[];
}
