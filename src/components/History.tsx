import { getAttempts } from "../lib/storage";
import { STATE_BY_CODE } from "../data/states";
import { PASS_MARK } from "../lib/exam";

const MODE_LABEL: Record<string, string> = { exam: "🧪 Mock", state: "📍 State", practice: "📖 Practice" };

interface Props {
  onOpen: (hash: string) => void;
}

export default function History({ onOpen }: Props) {
  const attempts = [...getAttempts()].reverse(); // newest first

  if (attempts.length === 0) {
    return (
      <div className="card">
        <div className="empty">No tests yet. Take one and it'll be recorded here 🗂️</div>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>History</h2>
      <div className="sub">{attempts.length} test{attempts.length === 1 ? "" : "s"} · newest first · click a row to reopen</div>
      <div style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>When</th><th>Mode</th><th>State</th><th>Score</th><th>Result</th><th>Test id</th>
            </tr>
          </thead>
          <tbody>
            {attempts.map((a) => {
              const pct = Math.round((a.correct / a.total) * 100);
              const state = a.state ? STATE_BY_CODE[a.state]?.code : "—";
              return (
                <tr key={a.id} className="hist-row" onClick={() => onOpen(a.hash)}>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {new Date(a.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    <span style={{ color: "var(--muted)" }}>
                      {" "}
                      {new Date(a.date).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>{MODE_LABEL[a.mode] ?? a.mode}</td>
                  <td>{state}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <b>{a.correct}/{a.total}</b> <span style={{ color: "var(--muted)" }}>({pct}%)</span>
                  </td>
                  <td>
                    {a.mode === "exam" ? (
                      <span className={a.passed ? "acc-good" : "acc-bad"}>
                        {a.passed ? `Passed (≥${PASS_MARK})` : `Failed (<${PASS_MARK})`}
                      </span>
                    ) : (
                      <span className={pct >= 80 ? "acc-good" : pct >= 50 ? "acc-mid" : "acc-bad"}>{pct}%</span>
                    )}
                  </td>
                  <td><code style={{ color: "var(--muted)" }}>{a.hash}</code></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
