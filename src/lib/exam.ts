import type { Question, QuestionStat } from "../types";
import raw from "../data/questions.json";
import { getStats } from "./storage";

export const ALL: Question[] = raw as Question[];
export const GENERAL = ALL.filter((q) => q.state === null);
export const byId = new Map(ALL.map((q) => [q.id, q]));
export const forState = (code: string) => ALL.filter((q) => q.state === code);

/**
 * Locally-bundled, higher-quality replacements for specific question images
 * (keyed by `num`). The originals come from a scraper host with a heavy red
 * watermark; these are the official BAMF catalog images instead.
 */
const IMAGE_OVERRIDES: Record<string, string> = {
  "212": "/images/q212.png",
};

/** The image URL to show for a question — an override if we have one, else the dataset URL. */
export function imageFor(q: Question): string | null {
  return IMAGE_OVERRIDES[q.num] ?? q.image;
}

// Official Einbürgerungstest format.
export const EXAM_GENERAL = 30;
export const EXAM_STATE = 3;
export const EXAM_TOTAL = EXAM_GENERAL + EXAM_STATE; // 33
export const PASS_MARK = 17;
export const EXAM_MINUTES = 60;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------------------------------------------------------------------------
// Adaptive weighting
//
// Selection is nudged toward what you need most, using two "needs", each in
// [0,1], where a never-asked item counts as fully failed (need = 1):
//   • question need  = 1 − (times right / times seen)      (unseen → 1)
//   • category need  = 1 − (category right / category seen) (unasked → 1)
//
//   weight = (BASE + ALPHA · need) · freqDamp
//   need   = W_Q · qNeed + W_C · catNeed
//
// The softening (so we tilt the odds, not overfit them):
//   • BASE keeps every question in play; ALPHA caps the tilt at (BASE+ALPHA)/BASE
//     ≈ 2× between the neediest and the fully-mastered.
//   • freqDamp gently de-prioritises questions you've already seen a lot — log
//     scaled, so it decays slowly and never reaches zero.
// ---------------------------------------------------------------------------
const W_Q = 0.7;     // question-need share of the blend
const W_C = 0.3;     // category-need share (W_Q + W_C = 1 keeps `need` in [0,1])
const BASE = 1.0;    // baseline weight every question keeps
const ALPHA = 1.0;   // max extra weight from need → tilt ceiling ≈ 2×
const LAMBDA = 0.35; // frequency-damping strength (log scaled)

interface WeightCtx {
  stats: Record<string, QuestionStat>;
  catRate: Record<string, number>; // category → correct rate over answers seen
}

function buildCtx(): WeightCtx {
  const stats = getStats();
  const agg: Record<string, { correct: number; seen: number }> = {};
  for (const [id, st] of Object.entries(stats)) {
    const q = byId.get(id);
    if (!q) continue;
    const cat = q.category ?? "Other";
    (agg[cat] ??= { correct: 0, seen: 0 });
    agg[cat].correct += st.correct;
    agg[cat].seen += st.seen;
  }
  const catRate: Record<string, number> = {};
  for (const [cat, v] of Object.entries(agg)) catRate[cat] = v.seen > 0 ? v.correct / v.seen : 0;
  return { stats, catRate };
}

function weightFor(q: Question, ctx: WeightCtx): number {
  const st = ctx.stats[q.id];
  const seen = st?.seen ?? 0;
  const qRate = seen > 0 ? st!.correct / seen : 0; // unseen → 0 (treated as failed)
  const cat = q.category ?? "Other";
  const cRate = cat in ctx.catRate ? ctx.catRate[cat] : 0; // unasked category → 0
  const need = W_Q * (1 - qRate) + W_C * (1 - cRate); // ∈ [0,1]
  const freqDamp = 1 / (1 + LAMBDA * Math.log1p(seen)); // seen 0 → 1, decays slowly
  return (BASE + ALPHA * need) * freqDamp;
}

/**
 * Weighted sampling without replacement (Efraimidis–Spirakis "A-Res"):
 * give each item a key U^(1/weight) and take the n largest — unbiased and O(n log n).
 */
function weightedSample(pool: Question[], n: number, ctx: WeightCtx): Question[] {
  if (n >= pool.length) return shuffle(pool);
  return pool
    .map((q) => ({ q, k: Math.pow(Math.random(), 1 / Math.max(weightFor(q, ctx), 1e-6)) }))
    .sort((a, b) => b.k - a.k)
    .slice(0, n)
    .map((x) => x.q);
}

/** Full mock exam: 30 general + 3 from the chosen state (adaptively weighted), shuffled together. */
export function buildExam(stateCode: string): Question[] {
  const ctx = buildCtx();
  const general = weightedSample(GENERAL, EXAM_GENERAL, ctx);
  const state = weightedSample(forState(stateCode), EXAM_STATE, ctx);
  return shuffle([...general, ...state]);
}

/** State drill: all 10 (or fewer) questions for one state, shuffled. */
export function buildStateDrill(stateCode: string): Question[] {
  return shuffle(forState(stateCode));
}

/** General practice: N general questions, adaptively weighted toward your weak spots. */
export function buildGeneralPractice(n: number): Question[] {
  return weightedSample(GENERAL, n, buildCtx());
}

/** Practice from the mistake pile (ids). Falls back to weakest-known if empty is passed. */
export function buildFromIds(ids: string[]): Question[] {
  const qs = ids.map((id) => byId.get(id)).filter((q): q is Question => !!q);
  return shuffle(qs);
}
