/**
 * Deterministic short id for a test, derived from the ordered list of question
 * ids. Two 32-bit FNV-1a-style hashes are combined for a low collision rate,
 * then base36-encoded. The same set+order of questions always yields the same
 * hash, so it can be recomputed from an attempt's results at any time.
 */
export function hashIds(ids: string[]): string {
  const s = ids.join(",");
  let h1 = 0x811c9dc5;
  let h2 = 0xc2b2ae35;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x85ebca6b) >>> 0;
  }
  return (h1.toString(36).padStart(7, "0") + h2.toString(36).padStart(7, "0")).slice(0, 12);
}
