import { STATES } from "../data/states";
import { EXAM_GENERAL, EXAM_STATE, EXAM_MINUTES, PASS_MARK, EXAM_TOTAL } from "../lib/exam";
import { getMistakes } from "../lib/storage";

interface Props {
  selectedState: string;
  setSelectedState: (code: string) => void;
  onStartExam: () => void;
  onStartStateDrill: () => void;
  onStartGeneralPractice: (n: number) => void;
  onReviewMistakes: (ids: string[]) => void;
}

export default function Home(props: Props) {
  const { selectedState, setSelectedState } = props;
  const mistakes = getMistakes();

  return (
    <div>
      {/* State picker */}
      <div className="card">
        <h2>1. Choose your Bundesland</h2>
        <div className="sub">Your 3 state-specific questions come from here.</div>
        <div className="state-grid">
          {STATES.map((s) => (
            <button
              key={s.code}
              className={`state-btn ${selectedState === s.code ? "active" : ""}`}
              onClick={() => setSelectedState(s.code)}
            >
              <b>{s.name}</b>
            </button>
          ))}
        </div>
      </div>

      {/* Modes */}
      <div className="card">
        <h2>2. Pick a mode</h2>
        <div className="sub">German shows first everywhere — flip on English inside any question.</div>

        <div className="grid2">
          <div className="metric">
            <div style={{ fontWeight: 800, fontSize: 16 }}>🧪 Mock exam</div>
            <div className="l" style={{ margin: "6px 0 12px" }}>
              {EXAM_TOTAL} questions ({EXAM_GENERAL} general + {EXAM_STATE} state) · {EXAM_MINUTES} min · pass ≥ {PASS_MARK}. No feedback until the end, just like the real thing.
            </div>
            <button className="btn block" onClick={props.onStartExam}>Start mock exam</button>
          </div>

          <div className="metric">
            <div style={{ fontWeight: 800, fontSize: 16 }}>📍 State drill</div>
            <div className="l" style={{ margin: "6px 0 12px" }}>
              All 10 questions for your chosen state, with instant feedback and explanations.
            </div>
            <button className="btn block secondary" onClick={props.onStartStateDrill}>Drill state questions</button>
          </div>

          <div className="metric">
            <div style={{ fontWeight: 800, fontSize: 16 }}>📖 General practice</div>
            <div className="l" style={{ margin: "6px 0 12px" }}>
              Learn the 300 general questions at your own pace, with instant feedback.
            </div>
            <div className="btn-row">
              <button className="btn secondary" onClick={() => props.onStartGeneralPractice(20)}>20 questions</button>
              <button className="btn secondary" onClick={() => props.onStartGeneralPractice(50)}>50</button>
              <button className="btn secondary" onClick={() => props.onStartGeneralPractice(300)}>All 300</button>
            </div>
          </div>

          <div className="metric">
            <div style={{ fontWeight: 800, fontSize: 16 }}>🔁 Review mistakes</div>
            <div className="l" style={{ margin: "6px 0 12px" }}>
              {mistakes.length > 0
                ? `${mistakes.length} question${mistakes.length === 1 ? "" : "s"} waiting. Get one right to clear it.`
                : "No mistakes logged yet — they'll collect here as you practice."}
            </div>
            <button className="btn block" disabled={mistakes.length === 0} onClick={() => props.onReviewMistakes(mistakes)}>
              Review {mistakes.length || ""} mistake{mistakes.length === 1 ? "" : "s"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
