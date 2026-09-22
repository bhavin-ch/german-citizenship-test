import { useEffect, useRef, useState } from "react";
import type { Attempt, Choice, Mode, Question, QuestionResult } from "../types";
import { imageFor } from "../lib/exam";
import { hashIds } from "../lib/hash";
import { useShowEn } from "../lib/useShowEn";
import ClickableText from "./ClickableText";

const CHOICES: Choice[] = ["a", "b", "c", "d"];

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface Props {
  questions: Question[];
  mode: Mode;
  stateCode: string | null;
  instantFeedback: boolean;
  countdownSec: number | null; // exam: countdown; practice: null (counts up)
  passMark: number;
  onFinish: (attempt: Attempt) => void;
  onQuit: () => void;
}

export default function Quiz(props: Props) {
  const { questions, mode, stateCode, instantFeedback, countdownSec, passMark } = props;
  const [idx, setIdx] = useState(0);
  const [chosen, setChosen] = useState<Record<string, Choice>>({});
  const [showEn, setShowEn] = useShowEn();
  const [elapsed, setElapsed] = useState(0);
  const [zoom, setZoom] = useState(false);
  const startRef = useRef(Date.now());
  const finishedRef = useRef(false);

  const q = questions[idx];
  const total = questions.length;
  const answeredCount = Object.keys(chosen).length;
  const isLast = idx === total - 1;
  const isFirst = idx === 0;
  const currentAnswered = q ? chosen[q.id] !== undefined : false;
  const imgSrc = q ? imageFor(q) : null;
  // In practice/state (instant feedback) answers lock once picked. Exam lets you revise.
  const reveal = instantFeedback && currentAnswered;
  const canGoNext = !(instantFeedback && !currentAnswered);

  // timer tick
  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 500);
    return () => clearInterval(t);
  }, []);

  // close zoom when moving to a question without an image
  useEffect(() => { if (!imgSrc) setZoom(false); }, [imgSrc]);

  const remaining = countdownSec !== null ? Math.max(0, countdownSec - elapsed) : null;

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    const results: QuestionResult[] = questions.map((qq) => {
      const c = chosen[qq.id] ?? null;
      return { id: qq.id, chosen: c, correct: c === qq.solution };
    });
    const correct = results.filter((r) => r.correct).length;
    const attempt: Attempt = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      hash: hashIds(questions.map((qq) => qq.id)),
      date: new Date().toISOString(),
      mode,
      state: stateCode,
      total,
      correct,
      passed: mode === "exam" ? correct >= passMark : correct === total,
      durationSec: Math.floor((Date.now() - startRef.current) / 1000),
      results,
    };
    props.onFinish(attempt);
  };

  // auto-finish on timeout
  useEffect(() => {
    if (remaining === 0 && !finishedRef.current) finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining]);

  const select = (c: Choice) => {
    if (!q) return;
    if (instantFeedback && currentAnswered) return; // locked after answering in practice
    setChosen((prev) => ({ ...prev, [q.id]: c }));
  };
  const next = () => {
    if (!canGoNext) return;
    if (isLast) finish();
    else setIdx((i) => i + 1);
  };
  const prev = () => { if (!isFirst) setIdx((i) => i - 1); };

  // keyboard shortcuts: 1-4 answer · , prev · . next · z zoom  (` = translate is global, see App)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
      if (zoom) {
        if (e.key === "Escape" || e.key === "z") { e.preventDefault(); setZoom(false); }
        return;
      }
      if (e.key >= "1" && e.key <= "4") { e.preventDefault(); select(CHOICES[Number(e.key) - 1]); }
      else if (e.key === ",") { e.preventDefault(); prev(); }
      else if (e.key === ".") { e.preventDefault(); next(); }
      else if (e.key === "z") { e.preventDefault(); if (imgSrc) setZoom(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, zoom, currentAnswered, idx, imgSrc]);

  const de = q?.de;
  const en = q?.en;

  const optClass = (c: Choice): string => {
    if (!reveal || !q) return "opt";
    if (c === q.solution) return "opt correct";
    if (c === chosen[q.id]) return "opt wrong";
    return "opt";
  };

  if (!q) return null;

  return (
    <div>
      <div className="quiz-head">
        <button className="btn ghost" onClick={props.onQuit}>← Exit</button>
        <div className="progress" title={`${idx + 1} of ${total}`}>
          <div style={{ width: `${((idx + 1) / total) * 100}%` }} />
        </div>
        {remaining !== null ? (
          <div className={`timer ${remaining <= 60 ? "warn" : ""}`}>⏱ {fmt(remaining)}</div>
        ) : (
          <div className="timer">⏱ {fmt(elapsed)}</div>
        )}
      </div>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <span className="qcategory">
            {q.state ? `${q.state} · ` : ""}{q.category ?? "General"} · #{q.num}
          </span>
          <span style={{ color: "var(--muted)", fontSize: 13, fontWeight: 700 }}>
            {idx + 1} / {total}
          </span>
        </div>

        <p className="qtext"><ClickableText de={de.question} en={en.question} /></p>
        {showEn && en.question && <p className="qtext-en">{en.question}</p>}

        {imgSrc && (
          <div className="qimg-wrap">
            <img
              className="qimg"
              src={imgSrc}
              alt="question figure"
              loading="lazy"
              onClick={() => setZoom(true)}
              title="Click to zoom (z)"
            />
            <button className="zoom-hint" onClick={() => setZoom(true)}>🔍 zoom</button>
          </div>
        )}

        <div className="toggle-row">
          <label className="switch">
            <input type="checkbox" checked={showEn} onChange={(e) => setShowEn(e.target.checked)} />
            <span className="slider" />
          </label>
          <span style={{ fontSize: 14, color: "var(--muted)", fontWeight: 600 }}>
            🇬🇧 Show English translation
          </span>
        </div>

        <div className="options">
          {CHOICES.map((c, i) => (
            <button
              key={c}
              className={optClass(c)}
              onClick={() => select(c)}
              disabled={reveal}
              style={!reveal && chosen[q.id] === c ? { borderColor: "var(--brand)", background: "var(--brand-soft)" } : undefined}
            >
              <span className="key">{i + 1}</span>
              <span>
                <ClickableText de={de[c]} en={en[c]} />
                {showEn && en[c] && <span className="en">{en[c]}</span>}
              </span>
            </button>
          ))}
        </div>

        {reveal && (de.context || en.context) && (
          <div className="explain">
            <b>{chosen[q.id] === q.solution ? "✅ Correct." : "❌ Not quite."}</b>{" "}
            <ClickableText de={de.context ?? ""} />
            {showEn && en.context && (
              <div style={{ marginTop: 8, color: "var(--muted)", fontStyle: "italic" }}>{en.context}</div>
            )}
          </div>
        )}

        <div className="btn-row" style={{ marginTop: 16, justifyContent: "space-between" }}>
          <button className="btn secondary" onClick={prev} disabled={isFirst}>← Prev</button>
          <span style={{ color: "var(--muted)", fontSize: 13, alignSelf: "center" }}>
            {answeredCount}/{total} answered
          </span>
          <div className="btn-row">
            {mode === "exam" && (
              <button className="btn secondary" onClick={finish}>Finish now</button>
            )}
            <button className="btn" onClick={next} disabled={!canGoNext}>
              {isLast ? "Finish" : "Next →"}
            </button>
          </div>
        </div>

        <div className="kbd-hint">
          Keys: <kbd>1</kbd>–<kbd>4</kbd> answer · <kbd>,</kbd> prev · <kbd>.</kbd> next · <kbd>`</kbd> translate{imgSrc && <> · <kbd>z</kbd> zoom</>}
          {" "}· ⌘/Ctrl-click a word to save it
        </div>
      </div>

      {zoom && imgSrc && (
        <div className="lightbox" onClick={() => setZoom(false)}>
          <img src={imgSrc} alt="question figure enlarged" onClick={(e) => e.stopPropagation()} />
          <div className="lb-hint">Click anywhere, <kbd>Esc</kbd> or <kbd>z</kbd> to close</div>
        </div>
      )}
    </div>
  );
}
