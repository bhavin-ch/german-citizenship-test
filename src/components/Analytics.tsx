import { useMemo } from "react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
  Legend, BarChart, Bar, Cell,
} from "recharts";
import { getAttempts, getStats, getMistakes, getGamify, levelFor, BADGE_LABEL, resetAll } from "../lib/storage";
import { byId, PASS_MARK, EXAM_TOTAL } from "../lib/exam";
import { STATE_BY_CODE } from "../data/states";

function accClass(pct: number) {
  if (pct < 50) return "acc-bad";
  if (pct < 80) return "acc-mid";
  return "acc-good";
}

function barColor(pct: number) {
  if (pct < 50) return "var(--red)";
  if (pct < 80) return "var(--amber)";
  return "var(--green)";
}

// Short axis labels for the long category names (full name kept in the tooltip).
const SHORT_CAT: Record<string, string> = {
  "History & Geography": "History/Geo",
  "Law & Governance": "Law",
  "Economy & Employment": "Economy",
  "Education & Religion": "Education",
  "Democracy & Politics": "Democracy",
  "Rights & Freedoms": "Rights",
  "Federal System": "Federal",
};

interface Props {
  onPracticeWeak: (ids: string[]) => void;
  onChanged: () => void;
}

export default function Analytics({ onPracticeWeak, onChanged }: Props) {
  const attempts = getAttempts();
  const stats = getStats();
  const mistakes = getMistakes();
  const g = getGamify();
  const lvl = levelFor(g.xp);

  const exams = attempts.filter((a) => a.mode === "exam");

  // Each mode is indexed by its OWN attempt number, so the first of each mode
  // lines up on x=1, the second on x=2, etc. (independent progressions).
  const chartData = useMemo(() => {
    const fmtDate = (d: string) =>
      new Date(d).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    const groups: Record<"mock" | "state" | "practice", typeof attempts> = { mock: [], state: [], practice: [] };
    for (const a of attempts) {
      if (a.mode === "exam") groups.mock.push(a);
      else if (a.mode === "state") groups.state.push(a);
      else if (a.mode === "practice") groups.practice.push(a);
    }
    const maxLen = Math.max(groups.mock.length, groups.state.length, groups.practice.length);
    const pct = (a: (typeof attempts)[number]) => Math.round((a.correct / a.total) * 100);
    return Array.from({ length: maxLen }, (_, j) => {
      const row: Record<string, number | string | null> = { round: `#${j + 1}` };
      (["mock", "state", "practice"] as const).forEach((k) => {
        const a = groups[k][j];
        row[k] = a ? pct(a) : null;
        row[`${k}Date`] = a ? fmtDate(a.date) : "";
      });
      return row;
    });
  }, [attempts]);

  // Accuracy per question category, aggregated over every answer.
  const catData = useMemo(() => {
    const agg: Record<string, { correct: number; seen: number }> = {};
    for (const [id, s] of Object.entries(stats)) {
      const q = byId.get(id);
      if (!q) continue;
      const c = q.category ?? "Other";
      (agg[c] ??= { correct: 0, seen: 0 });
      agg[c].correct += s.correct;
      agg[c].seen += s.seen;
    }
    return Object.entries(agg)
      .map(([category, v]) => ({
        category,
        short: SHORT_CAT[category] ?? category,
        pct: v.seen ? Math.round((v.correct / v.seen) * 100) : 0,
        correct: v.correct,
        seen: v.seen,
      }))
      .sort((a, b) => b.pct - a.pct);
  }, [stats]);

  const overall = useMemo(() => {
    let seen = 0, correct = 0;
    for (const s of Object.values(stats)) { seen += s.seen; correct += s.correct; }
    return { seen, correct, pct: seen ? Math.round((correct / seen) * 100) : 0, unique: Object.keys(stats).length };
  }, [stats]);

  const examAvg = exams.length
    ? Math.round(exams.reduce((n, a) => n + a.correct, 0) / exams.length)
    : 0;
  const bestExam = exams.reduce((m, a) => Math.max(m, a.correct), 0);

  const weakRows = useMemo(() => {
    return Object.entries(stats)
      .map(([id, s]) => ({ id, ...s, acc: s.seen ? Math.round((s.correct / s.seen) * 100) : 0 }))
      .filter((r) => r.seen >= 1)
      .sort((a, b) => a.acc - b.acc || b.wrong - a.wrong)
      .slice(0, 25);
  }, [stats]);

  const allBadges = Object.keys(BADGE_LABEL);

  const doReset = () => {
    if (confirm("Delete all your progress, history and stats? This cannot be undone.")) {
      resetAll();
      onChanged();
    }
  };

  if (attempts.length === 0) {
    return (
      <div className="card">
        <div className="empty">
          No data yet. Take an exam or a practice round and your progress will show up here 📈
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* headline metrics */}
      <div className="card">
        <h2>Your stats</h2>
        <div className="grid2" style={{ marginTop: 12 }}>
          <div className="metric"><div className="n">Lvl {lvl.level}</div><div className="l">{g.xp} XP · {lvl.into}/{lvl.span} to next</div></div>
          <div className="metric"><div className="n">🔥 {g.streak}</div><div className="l">day streak</div></div>
          <div className="metric"><div className="n">{exams.length}</div><div className="l">exams · {exams.filter(e => e.passed).length} passed</div></div>
          <div className="metric"><div className="n">{examAvg}/{EXAM_TOTAL}</div><div className="l">avg exam · best {bestExam}</div></div>
          <div className="metric"><div className="n">{overall.pct}%</div><div className="l">overall accuracy ({overall.correct}/{overall.seen})</div></div>
          <div className="metric"><div className="n">{overall.unique}/460</div><div className="l">unique questions seen</div></div>
        </div>
      </div>

      {/* performance over time */}
      <div className="card">
        <h2>Performance over time</h2>
        <div className="sub">Each mode by its own attempt # (the 1st of each lines up) · dashed line = exam pass mark ({Math.round((PASS_MARK / EXAM_TOTAL) * 100)}%)</div>
        <div style={{ width: "100%", height: 280 }}>
          <ResponsiveContainer>
            <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 4, left: -18 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="round"
                tick={{ fontSize: 11, fill: "var(--muted)" }}
                padding={{ left: 16, right: 16 }}
                interval="preserveStartEnd"
              />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--muted)" }} />
              <Tooltip
                contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 13 }}
                labelStyle={{ color: "var(--muted)" }}
                labelFormatter={(round: string) => `Attempt ${round}`}
                formatter={(v: number, n, item) => {
                  const key = item?.dataKey as string | undefined;
                  const payload = item?.payload as Record<string, string> | undefined;
                  const d = key && payload ? payload[`${key}Date`] : "";
                  return [d ? `${v}%  ·  ${d}` : `${v}%`, n];
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <ReferenceLine y={Math.round((PASS_MARK / EXAM_TOTAL) * 100)} stroke="var(--amber)" strokeDasharray="5 4" />
              <Line name="Mock" type="monotone" dataKey="mock" stroke="var(--brand)" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls />
              <Line name="State" type="monotone" dataKey="state" stroke="var(--green)" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls />
              <Line name="Practice" type="monotone" dataKey="practice" stroke="var(--amber)" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* performance per category */}
      <div className="card">
        <h2>Performance by category</h2>
        <div className="sub" style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <span>Accuracy across every answer, per topic</span>
          <span className="legend-swatches">
            <span className="swatch"><i style={{ background: "var(--red)" }} />&lt;50%</span>
            <span className="swatch"><i style={{ background: "var(--amber)" }} />&lt;80%</span>
            <span className="swatch"><i style={{ background: "var(--green)" }} />≥80%</span>
          </span>
        </div>
        <div style={{ width: "100%", height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={catData} margin={{ top: 8, right: 12, bottom: 62, left: -18 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="short"
                tick={{ fontSize: 11, fill: "var(--muted)" }}
                interval={0}
                angle={-35}
                textAnchor="end"
                height={70}
              />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--muted)" }} />
              <Tooltip
                cursor={{ fill: "var(--card-2)" }}
                contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 13 }}
                labelStyle={{ color: "var(--muted)" }}
                itemStyle={{ color: "var(--text)" }}
                formatter={(v: number, _n, p) => [`${v}%  (${p?.payload?.correct}/${p?.payload?.seen})`, p?.payload?.category]}
              />
              <Bar dataKey="pct" radius={[6, 6, 0, 0]} maxBarSize={64}>
                {catData.map((d) => (
                  <Cell key={d.category} fill={barColor(d.pct)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* practice mistakes */}
      <div className="card">
        <h2>Practice mode</h2>
        <div className="sub">Re-drill the questions you've gotten wrong. Answer one right and it leaves the pile.</div>
        <div className="btn-row">
          <button className="btn" disabled={mistakes.length === 0} onClick={() => onPracticeWeak(mistakes)}>
            Review {mistakes.length} mistake{mistakes.length === 1 ? "" : "s"}
          </button>
          <button className="btn secondary" disabled={weakRows.length === 0} onClick={() => onPracticeWeak(weakRows.slice(0, 20).map((r) => r.id))}>
            Drill 20 weakest
          </button>
        </div>
      </div>

      {/* per-question */}
      <div className="card">
        <h2>Performance per question</h2>
        <div className="sub">Weakest first (of {overall.unique} you've seen)</div>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr><th>#</th><th>Question</th><th>Seen</th><th>Accuracy</th></tr>
            </thead>
            <tbody>
              {weakRows.map((r) => {
                const q = byId.get(r.id);
                if (!q) return null;
                const st = q.state ? `${STATE_BY_CODE[q.state]?.code} ` : "";
                return (
                  <tr key={r.id}>
                    <td style={{ whiteSpace: "nowrap", color: "var(--muted)" }}>{st}#{q.num}</td>
                    <td>{q.de.question}</td>
                    <td>{r.seen}</td>
                    <td className={accClass(r.acc)}>{r.acc}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* badges */}
      <div className="card">
        <h2>Badges</h2>
        <div className="sub">{g.badges.length}/{allBadges.length} earned</div>
        <div className="badges">
          {allBadges.map((id) => {
            const earned = g.badges.includes(id);
            return (
              <span key={id} className={`badge-item ${earned ? "" : "locked"}`} title={BADGE_LABEL[id].label}>
                {BADGE_LABEL[id].emoji} {BADGE_LABEL[id].label}
              </span>
            );
          })}
        </div>
      </div>

      <div style={{ textAlign: "center" }}>
        <button className="btn ghost" onClick={doReset} style={{ color: "var(--red)" }}>Reset all progress</button>
      </div>
    </div>
  );
}
