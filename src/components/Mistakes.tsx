import { getMistakes, getStats } from "../lib/storage";
import { byId } from "../lib/exam";
import ClickableText from "./ClickableText";

interface Props {
  onRedo: (ids: string[]) => void;
}

export default function Mistakes({ onRedo }: Props) {
  const ids = getMistakes();
  const stats = getStats();
  const questions = ids.map((id) => byId.get(id)).filter((q): q is NonNullable<ReturnType<typeof byId.get>> => !!q);

  return (
    <div>
      <div className="card">
        <h2>Mistakes</h2>
        <div className="sub">
          Questions you've gotten wrong. Answer one correctly here and it leaves the pile. Runs are logged as their
          own “mistakes” category.
        </div>
        {questions.length === 0 ? (
          <div className="empty">Nothing here — no outstanding mistakes. 🎉</div>
        ) : (
          <div className="btn-row">
            <button className="btn" onClick={() => onRedo(ids)}>Redo all {ids.length}</button>
            {ids.length > 10 && (
              <button className="btn secondary" onClick={() => onRedo(ids.slice(0, 10))}>Redo first 10</button>
            )}
          </div>
        )}
      </div>

      {questions.map((q) => {
        const st = stats[q.id];
        return (
          <div className="card" key={q.id}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <span className="qcategory">
                {q.state ? `${q.state} · ` : ""}{q.category ?? "General"} · #{q.num}
              </span>
              {st && (
                <span style={{ color: "var(--muted)", fontSize: 12 }}>
                  {st.correct}/{st.seen} correct so far
                </span>
              )}
            </div>
            <p className="qtext" style={{ fontSize: 16 }}>
              <ClickableText de={q.de.question} en={q.en.question} />
            </p>
            <div className="opt correct" style={{ marginTop: 6 }}>
              <span className="key">✓</span>
              <span><ClickableText de={q.de[q.solution]} en={q.en[q.solution]} /></span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
