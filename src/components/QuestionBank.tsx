import { useMemo, useState } from "react";
import type { Choice } from "../types";
import { ALL, imageFor } from "../lib/exam";
import { STATES } from "../data/states";
import { useShowEn } from "../lib/useShowEn";
import ClickableText from "./ClickableText";

const CHOICES: Choice[] = ["a", "b", "c", "d"];
const PAGE = 15;

// General questions first (numeric order), then each state's block in order.
const ORDERED = [...ALL].sort((a, b) => {
  const ga = a.state === null, gb = b.state === null;
  if (ga !== gb) return ga ? -1 : 1;
  if (ga && gb) return Number(a.num) - Number(b.num);
  if (a.state !== b.state) return a.state!.localeCompare(b.state!);
  return Number(a.num.split("-")[1]) - Number(b.num.split("-")[1]);
});

const CATEGORIES = Array.from(new Set(ALL.map((q) => q.category).filter(Boolean))) as string[];

export default function QuestionBank() {
  const [showEn, setShowEn] = useShowEn();
  const [scope, setScope] = useState("general"); // "general" | "all" | state code
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [zoom, setZoom] = useState<string | null>(null);
  const [openExpl, setOpenExpl] = useState<Record<string, boolean>>({});

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return ORDERED.filter((q) => {
      if (scope === "general" && q.state !== null) return false;
      if (scope !== "general" && scope !== "all" && q.state !== scope) return false;
      if (category !== "all" && q.category !== category) return false;
      if (s && !(`${q.de.question} ${q.en.question}`.toLowerCase().includes(s))) return false;
      return true;
    });
  }, [scope, category, search]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const cur = Math.min(page, pages - 1);
  const slice = filtered.slice(cur * PAGE, cur * PAGE + PAGE);
  const reset = (fn: () => void) => { fn(); setPage(0); };

  return (
    <div>
      <div className="card">
        <h2>Question bank</h2>
        <div className="sub">
          All {ALL.length} questions in order · German first, press <kbd>`</kbd> to translate · ⌘/Ctrl-click any word to save it to your Wörtschatz
        </div>
        <div className="filter-row">
          <select value={scope} onChange={(e) => reset(() => setScope(e.target.value))}>
            <option value="general">General (1–300)</option>
            <option value="all">All (incl. states)</option>
            {STATES.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
          </select>
          <select value={category} onChange={(e) => reset(() => setCategory(e.target.value))}>
            <option value="all">All categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input
            placeholder="Search…"
            value={search}
            onChange={(e) => reset(() => setSearch(e.target.value))}
          />
          <label className="switch">
            <input type="checkbox" checked={showEn} onChange={(e) => setShowEn(e.target.checked)} />
            <span className="slider" />
          </label>
          <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>🇬🇧 English</span>
        </div>
      </div>

      {slice.map((q) => {
        const img = imageFor(q);
        const expl = openExpl[q.id];
        return (
          <div className="card" key={q.id}>
            <span className="qcategory">
              {q.state ? `${q.state} · ` : ""}{q.category ?? "General"} · #{q.num}
            </span>
            <p className="qtext" style={{ fontSize: 17 }}>
              <ClickableText de={q.de.question} en={q.en.question} />
            </p>
            {showEn && q.en.question && <p className="qtext-en">{q.en.question}</p>}

            {img && (
              <div className="qimg-wrap">
                <img className="qimg" src={img} alt="question figure" loading="lazy" onClick={() => setZoom(img)} />
                <button className="zoom-hint" onClick={() => setZoom(img)}>🔍 zoom</button>
              </div>
            )}

            <div className="options">
              {CHOICES.map((c, i) => (
                <div key={c} className={`opt ${c === q.solution ? "correct" : ""}`}>
                  <span className="key">{i + 1}</span>
                  <span>
                    <ClickableText de={q.de[c]} en={q.en[c]} />
                    {showEn && q.en[c] && <span className="en">{q.en[c]}</span>}
                  </span>
                </div>
              ))}
            </div>

            {(q.de.context || q.en.context) && (
              <>
                <button className="btn ghost" style={{ marginTop: 10, paddingLeft: 0 }}
                  onClick={() => setOpenExpl((o) => ({ ...o, [q.id]: !o[q.id] }))}>
                  {expl ? "▾ Hide explanation" : "▸ Explanation"}
                </button>
                {expl && (
                  <div className="explain">
                    <ClickableText de={q.de.context ?? ""} />
                    {showEn && q.en.context && (
                      <div style={{ marginTop: 8, color: "var(--muted)", fontStyle: "italic" }}>{q.en.context}</div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}

      <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <button className="btn secondary" disabled={cur === 0} onClick={() => setPage(cur - 1)}>← Prev</button>
        <span style={{ color: "var(--muted)", fontSize: 14 }}>
          {filtered.length === 0 ? "No matches" : `${cur * PAGE + 1}–${Math.min((cur + 1) * PAGE, filtered.length)} of ${filtered.length} · page ${cur + 1}/${pages}`}
        </span>
        <button className="btn secondary" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)}>Next →</button>
      </div>

      {zoom && (
        <div className="lightbox" onClick={() => setZoom(null)}>
          <img src={zoom} alt="figure enlarged" onClick={(e) => e.stopPropagation()} />
          <div className="lb-hint">Click anywhere or <kbd>Esc</kbd> to close</div>
        </div>
      )}
    </div>
  );
}
