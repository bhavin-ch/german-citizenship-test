import type { Attempt, Gamify, QuestionStat } from "../types";
import { hashIds } from "./hash";

const KEYS = {
  attempts: "ebt.attempts",
  stats: "ebt.questionStats",
  mistakes: "ebt.mistakes",
  gamify: "ebt.gamify",
} as const;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or unavailable — practice still works in-memory for the session */
  }
}

// ---- Attempts (exam/practice history) ----
export function getAttempts(): Attempt[] {
  const attempts = read<Attempt[]>(KEYS.attempts, []);
  // Backfill hashes for attempts saved before hashing existed (no data loss).
  let changed = false;
  for (const a of attempts) {
    if (!a.hash) {
      a.hash = hashIds(a.results.map((r) => r.id));
      changed = true;
    }
  }
  if (changed) write(KEYS.attempts, attempts);
  return attempts;
}

export const getAttemptByHash = (hash: string): Attempt | undefined =>
  getAttempts().find((a) => a.hash === hash);

// ---- Per-question stats ----
export const getStats = (): Record<string, QuestionStat> =>
  read<Record<string, QuestionStat>>(KEYS.stats, {});

// ---- Mistake set (ids to review) ----
export const getMistakes = (): string[] => read<string[]>(KEYS.mistakes, []);

// ---- Gamification ----
const DEFAULT_GAMIFY: Gamify = { xp: 0, streak: 0, lastActiveDate: null, badges: [] };
export const getGamify = (): Gamify => read<Gamify>(KEYS.gamify, DEFAULT_GAMIFY);

function todayStr(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  const ms = new Date(b + "T00:00:00").getTime() - new Date(a + "T00:00:00").getTime();
  return Math.round(ms / 86400000);
}

/** XP thresholds; level = index where xp >= threshold. */
export function levelFor(xp: number): { level: number; into: number; span: number } {
  let level = 1;
  let base = 0;
  let span = 100;
  while (xp >= base + span) {
    base += span;
    level += 1;
    span = Math.round(span * 1.35);
  }
  return { level, into: xp - base, span };
}

const BADGE_DEFS: { id: string; label: string; emoji: string }[] = [
  { id: "first-exam", label: "First exam completed", emoji: "🎓" },
  { id: "passed", label: "Passed a mock exam", emoji: "✅" },
  { id: "perfect", label: "Perfect score on an exam", emoji: "💯" },
  { id: "answered-100", label: "100 questions answered", emoji: "💪" },
  { id: "answered-460", label: "Every question seen", emoji: "🗺️" },
  { id: "streak-3", label: "3-day streak", emoji: "🔥" },
  { id: "streak-7", label: "7-day streak", emoji: "🚀" },
  { id: "clean-slate", label: "Cleared your mistake pile", emoji: "🧹" },
];
export const BADGE_LABEL: Record<string, { label: string; emoji: string }> = Object.fromEntries(
  BADGE_DEFS.map((b) => [b.id, { label: b.label, emoji: b.emoji }])
);

export interface CommitResult {
  attempt: Attempt;
  gamify: Gamify;
  newBadges: string[];
  xpGained: number;
}

/**
 * Persist a finished attempt: append to history, update per-question stats,
 * adjust the mistake set, and update XP / streak / badges.
 */
export function commitAttempt(attempt: Attempt): CommitResult {
  // 1. history
  const attempts = getAttempts();
  attempts.push(attempt);
  write(KEYS.attempts, attempts);

  // 2. per-question stats
  const stats = getStats();
  for (const r of attempt.results) {
    const s = stats[r.id] ?? { seen: 0, correct: 0, wrong: 0, lastCorrect: false };
    s.seen += 1;
    if (r.correct) s.correct += 1;
    else s.wrong += 1;
    s.lastCorrect = r.correct;
    stats[r.id] = s;
  }
  write(KEYS.stats, stats);

  // 3. mistake set: add wrong, remove now-correct
  const mistakes = new Set(getMistakes());
  for (const r of attempt.results) {
    if (r.correct) mistakes.delete(r.id);
    else mistakes.add(r.id);
  }
  write(KEYS.mistakes, [...mistakes]);

  // 4. gamification
  const g = getGamify();
  const xpGained = attempt.correct * 10 + (attempt.passed ? 25 : 0);
  g.xp += xpGained;

  const today = todayStr();
  if (g.lastActiveDate !== today) {
    if (g.lastActiveDate && daysBetween(g.lastActiveDate, today) === 1) g.streak += 1;
    else g.streak = 1;
    g.lastActiveDate = today;
  }

  // badges
  const totalSeen = Object.keys(stats).length;
  const totalAnswered = Object.values(stats).reduce((n, s) => n + s.seen, 0);
  const newBadges: string[] = [];
  const award = (id: string) => {
    if (!g.badges.includes(id)) {
      g.badges.push(id);
      newBadges.push(id);
    }
  };
  if (attempt.mode === "exam") award("first-exam");
  if (attempt.passed) award("passed");
  if (attempt.total > 0 && attempt.correct === attempt.total) award("perfect");
  if (totalAnswered >= 100) award("answered-100");
  if (totalSeen >= 460) award("answered-460");
  if (g.streak >= 3) award("streak-3");
  if (g.streak >= 7) award("streak-7");
  if (mistakes.size === 0 && attempt.mode === "practice") award("clean-slate");

  write(KEYS.gamify, g);

  return { attempt, gamify: g, newBadges, xpGained };
}

export function resetAll() {
  Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
}
