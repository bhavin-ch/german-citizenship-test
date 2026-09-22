import { useEffect, useState } from "react";
import type { Attempt, Mode, Question } from "./types";
import Home from "./components/Home";
import Quiz from "./components/Quiz";
import Result from "./components/Result";
import Analytics from "./components/Analytics";
import History from "./components/History";
import QuestionBank from "./components/QuestionBank";
import Wortschatz from "./components/Wortschatz";
import Mistakes from "./components/Mistakes";
import {
  buildExam, buildStateDrill, buildGeneralPractice, buildFromIds,
  EXAM_MINUTES, PASS_MARK,
} from "./lib/exam";
import { commitAttempt, getGamify, levelFor, getAttemptByHash, type CommitResult } from "./lib/storage";
import { toggleShowEn } from "./lib/useShowEn";

type Route =
  | { name: "home" }
  | { name: "questions" }
  | { name: "mistakes" }
  | { name: "progress" }
  | { name: "history" }
  | { name: "vocab" }
  | { name: "test"; hash: string };

type Origin = "exam" | "state" | "general" | "ids";

interface Setup {
  questions: Question[];
  mode: Mode;
  stateCode: string | null;
  instantFeedback: boolean;
  countdownSec: number | null;
  passMark: number;
  origin: Origin;
  n?: number;
  ids?: string[];
}

function parseRoute(): Route {
  const h = window.location.hash.replace(/^#/, "");
  if (h.startsWith("/test/")) return { name: "test", hash: decodeURIComponent(h.slice(6)) };
  if (h === "/questions") return { name: "questions" };
  if (h === "/mistakes") return { name: "mistakes" };
  if (h === "/progress") return { name: "progress" };
  if (h === "/history") return { name: "history" };
  if (h === "/vocab") return { name: "vocab" };
  return { name: "home" };
}

export default function App() {
  const [route, setRoute] = useState<Route>(parseRoute);
  const [selectedState, setSelectedState] = useState<string>(() => {
    try { return localStorage.getItem("ebt.state") || "BW"; } catch { return "BW"; }
  });
  const [quiz, setQuiz] = useState<Setup | null>(null);
  const [justFinished, setJustFinished] = useState<CommitResult | null>(null);
  const [, force] = useState(0);
  const refresh = () => force((n) => n + 1);

  useEffect(() => {
    const onHash = () => setRoute(parseRoute());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // Global shortcut: ` toggles the English translation everywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "`" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
      e.preventDefault();
      toggleShowEn();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const navigate = (path: string) => {
    if (window.location.hash === `#${path}`) setRoute(parseRoute());
    else window.location.hash = path;
  };

  const pickState = (code: string) => {
    setSelectedState(code);
    try { localStorage.setItem("ebt.state", code); } catch { /* ignore */ }
  };

  const start = (s: Setup) => { setQuiz(s); navigate("/"); };

  const startExam = (stateCode = selectedState) => start({
    questions: buildExam(stateCode), mode: "exam", stateCode,
    instantFeedback: false, countdownSec: EXAM_MINUTES * 60, passMark: PASS_MARK, origin: "exam",
  });
  const startStateDrill = (stateCode = selectedState) => {
    const qs = buildStateDrill(stateCode);
    start({ questions: qs, mode: "state", stateCode, instantFeedback: true, countdownSec: null, passMark: qs.length, origin: "state" });
  };
  const startGeneral = (n: number) => {
    const qs = buildGeneralPractice(n);
    start({ questions: qs, mode: "practice", stateCode: null, instantFeedback: true, countdownSec: null, passMark: qs.length, origin: "general", n });
  };
  /** Run a specific set of question ids. `mode` distinguishes mistake-retakes from redo-same. */
  const startFromIds = (ids: string[], mode: Mode = "mistakes") => {
    const qs = buildFromIds(ids);
    if (qs.length === 0) return;
    start({ questions: qs, mode, stateCode: null, instantFeedback: true, countdownSec: null, passMark: qs.length, origin: "ids", ids });
  };

  const onFinish = (attempt: Attempt) => {
    const commit = commitAttempt(attempt);
    setJustFinished(commit);
    setQuiz(null);
    navigate(`/test/${attempt.hash}`);
    refresh();
  };

  // Rebuild a fresh, same-shaped test from a past attempt.
  const retryLike = (a: Attempt) => {
    if (a.mode === "exam") return startExam(a.state ?? selectedState);
    if (a.mode === "state") return startStateDrill(a.state ?? selectedState);
    if (a.mode === "mistakes") return startFromIds(a.results.map((r) => r.id), "mistakes");
    return startFromIds(a.results.map((r) => r.id), "practice"); // practice → redo same set
  };

  const g = getGamify();
  const lvl = levelFor(g.xp);
  const takingQuiz = quiz !== null;

  const tab = (path: string, active: boolean, label: string) => (
    <button className={`tab ${active ? "active" : ""}`} onClick={() => { setQuiz(null); navigate(path); }}>
      {label}
    </button>
  );

  return (
    <div className="wrap">
      <div className="topbar">
        <div className="logo" onClick={() => { setQuiz(null); navigate("/"); }} style={{ cursor: "pointer" }}>
          Einbürgerungstest <span>Trainer</span>
        </div>
        <div className="spacer" />
        <div className="stat-chip">🔥 {g.streak} <small>streak</small></div>
        <div className="stat-chip" title={`${lvl.into}/${lvl.span} XP to next level`}>
          ⭐ Lvl {lvl.level} <small>{g.xp} XP</small>
        </div>
      </div>

      {!takingQuiz && (
        <div style={{ marginBottom: 8 }}>
          <div className="levelbar" title={`Level ${lvl.level}`}>
            <div style={{ width: `${Math.round((lvl.into / lvl.span) * 100)}%` }} />
          </div>
        </div>
      )}

      {!takingQuiz && (
        <div className="tabs">
          {tab("/", route.name === "home", "🏠 Practice")}
          {tab("/questions", route.name === "questions", "📚 Question bank")}
          {tab("/mistakes", route.name === "mistakes", "🔁 Mistakes")}
          {tab("/progress", route.name === "progress", "📊 Progress")}
          {tab("/history", route.name === "history", "🗂️ History")}
          {tab("/vocab", route.name === "vocab", "🔤 Wörtschatz")}
        </div>
      )}

      {takingQuiz && quiz && (
        <Quiz
          questions={quiz.questions}
          mode={quiz.mode}
          stateCode={quiz.stateCode}
          instantFeedback={quiz.instantFeedback}
          countdownSec={quiz.countdownSec}
          passMark={quiz.passMark}
          onFinish={onFinish}
          onQuit={() => { setQuiz(null); navigate("/"); }}
        />
      )}

      {!takingQuiz && route.name === "home" && (
        <Home
          selectedState={selectedState}
          setSelectedState={pickState}
          onStartExam={() => startExam()}
          onStartStateDrill={() => startStateDrill()}
          onStartGeneralPractice={startGeneral}
          onReviewMistakes={(ids) => startFromIds(ids, "mistakes")}
        />
      )}

      {!takingQuiz && route.name === "questions" && <QuestionBank />}

      {!takingQuiz && route.name === "mistakes" && (
        <Mistakes onRedo={(ids) => startFromIds(ids, "mistakes")} />
      )}

      {!takingQuiz && route.name === "progress" && (
        <Analytics onPracticeWeak={(ids) => startFromIds(ids, "mistakes")} onChanged={refresh} />
      )}

      {!takingQuiz && route.name === "history" && (
        <History onOpen={(hash) => navigate(`/test/${hash}`)} />
      )}

      {!takingQuiz && route.name === "vocab" && <Wortschatz />}

      {!takingQuiz && route.name === "test" && (() => {
        const attempt = getAttemptByHash(route.hash);
        if (!attempt) {
          return (
            <div className="card">
              <div className="empty">
                No test found for id <code>{route.hash}</code>.<br />
                <button className="btn ghost" onClick={() => navigate("/history")}>← Back to history</button>
              </div>
            </div>
          );
        }
        return (
          <Result
            attempt={attempt}
            justFinished={justFinished?.attempt.hash === attempt.hash ? justFinished : null}
            onRetry={() => retryLike(attempt)}
            onRedoSame={() => startFromIds(attempt.results.map((r) => r.id), "practice")}
            onPracticeMistakes={() => startFromIds(attempt.results.filter((r) => !r.correct).map((r) => r.id), "mistakes")}
          />
        );
      })()}

      <div className="footnote">
        Runs fully in your browser · progress saved locally · questions © BAMF, data via{" "}
        <a href="https://github.com/leben-in-deutschland" target="_blank" rel="noreferrer">leben-in-deutschland</a>
      </div>
    </div>
  );
}
