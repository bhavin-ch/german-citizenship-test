import { useState } from "react";
import type { Attempt, Choice } from "../types";
import { BADGE_LABEL } from "../lib/storage";
import { byId, PASS_MARK } from "../lib/exam";
import { STATE_BY_CODE } from "../data/states";

interface Props {
  attempt: Attempt;
  /** Present only right after finishing — drives the XP / badge celebration. */
  justFinished?: { xpGained: number; newBadges: string[] } | null;
  onRetry: () => void;
  onRedoSame: () => void;
  onPracticeMistakes: () => void;
}

const MODE_LABEL: Record<string, string> = { exam: "Mock exam", state: "State drill", practice: "Practice", mistakes: "Mistake review" };

export default function Result({ attempt, justFinished, onRetry, onRedoSame, onPracticeMistakes }: Props) {
  const [showAll, setShowAll] = useState(false);
  const isExam = attempt.mode === "exam";
  const pct = Math.round((attempt.correct / attempt.total) * 100);
  const passed = attempt.passed;
  const wrong = attempt.results.filter((r) => !r.correct);
  const shown = showAll ? attempt.results : wrong;
  const state = attempt.state ? STATE_BY_CODE[attempt.state] : null;

  return (
    <div>
      <div className="card">
        <div className="result-hero">
          <div style={{ fontSize: 40 }}>{passed ? "🎉" : "📚"}</div>
          <div className={`result-score ${passed ? "pass" : "fail"}`}>
            {attempt.correct}/{attempt.total}
          </div>
          <div style={{ fontWeight: 700, fontSize: 18 }} className={passed ? "pass" : "fail"}>
            {isExam
              ? passed
                ? `Passed — needed ${PASS_MARK}`
                : `Not passed — needed ${PASS_MARK}`
              : `${pct}% correct`}
          </div>
          <div style={{ color: "var(--muted)", marginTop: 4 }}>
            {MODE_LABEL[attempt.mode]}{state ? ` · ${state.name}` : ""} · {pct}% ·{" "}
            {Math.floor(attempt.durationSec / 60)}m {attempt.durationSec % 60}s
            {justFinished ? ` · +${justFinished.xpGained} XP` : ""}
          </div>
          <div style={{ color: "var(--muted)", marginTop: 2, fontSize: 12 }}>
            {new Date(attempt.date).toLocaleString()} · test <code>{attempt.hash}</code>
          </div>
          {justFinished && justFinished.newBadges.length > 0 && (
            <div style={{ marginTop: 12 }}>
              {justFinished.newBadges.map((b) => (
                <span key={b} className="badge-pop">
                  {BADGE_LABEL[b]?.emoji} {BADGE_LABEL[b]?.label}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="btn-row" style={{ justifyContent: "center", marginTop: 18 }}>
          <button className="btn" onClick={onRetry}>
            {attempt.mode === "practice" ? "New practice" : `New ${MODE_LABEL[attempt.mode].toLowerCase()}`}
          </button>
          <button className="btn secondary" onClick={onRedoSame}>Redo these exact questions</button>
          {wrong.length > 0 && (
            <button className="btn secondary" onClick={onPracticeMistakes}>
              Practice {wrong.length} missed
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2>Review</h2>
          <button className="btn ghost" onClick={() => setShowAll((v) => !v)}>
            {showAll ? "Show only mistakes" : `Show all ${attempt.total}`}
          </button>
        </div>
        <div className="sub">
          {wrong.length === 0 ? "Perfect — nothing to review!" : `${wrong.length} to review`}
        </div>
        {shown.map((r) => {
          const q = byId.get(r.id);
          if (!q) return null;
          return (
            <div key={r.id} className="explain" style={{ marginTop: 10 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>
                {r.correct ? "✅" : "❌"} {q.de.question}
              </div>
              <div style={{ fontSize: 13, color: "var(--muted)", fontStyle: "italic", marginBottom: 6 }}>
                {q.en.question}
              </div>
              <div style={{ color: "var(--green)", fontWeight: 600 }}>✓ {q.de[q.solution]}</div>
              {!r.correct && (
                <div style={{ color: "var(--red)", marginTop: 2 }}>
                  ✗ Your answer: {r.chosen ? q.de[r.chosen as Choice] : "— (no answer)"}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
