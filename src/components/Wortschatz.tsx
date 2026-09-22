import { useState } from "react";
import { getVocab, removeVocab } from "../lib/storage";
import { GLOSSARY, GLOSSARY_COUNT } from "../data/vocab";

export default function Wortschatz() {
  const [, force] = useState(0);
  const refresh = () => force((n) => n + 1);
  const [search, setSearch] = useState("");
  const [hide, setHide] = useState(false); // self-test: blur meanings

  const mine = getVocab().slice().reverse();
  const s = search.trim().toLowerCase();
  const match = (a: string, b: string) => !s || a.toLowerCase().includes(s) || b.toLowerCase().includes(s);
  const meaning = (text: string) => <span className={`meaning ${hide ? "hidden" : ""}`}>{text}</span>;

  const myFiltered = mine.filter((v) => match(v.term, v.note ?? ""));

  return (
    <div>
      <div className="card">
        <h2>Wörtschatz</h2>
        <div className="sub">
          Your saved words plus a {GLOSSARY_COUNT}-term starter glossary for the test · ⌘/Ctrl-click any German word
          in the Question bank or a quiz to add it here
        </div>
        <div className="filter-row">
          <input placeholder="Search words…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <label className="switch">
            <input type="checkbox" checked={hide} onChange={(e) => setHide(e.target.checked)} />
            <span className="slider" />
          </label>
          <span style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>🙈 Hide meanings (self-test)</span>
        </div>
      </div>

      {/* User words */}
      <div className="card">
        <h2 style={{ fontSize: 16 }}>⭐ My words <span style={{ color: "var(--muted)", fontWeight: 400 }}>({mine.length})</span></h2>
        {mine.length === 0 ? (
          <div className="empty">
            No saved words yet. In the Question bank or a quiz, ⌘/Ctrl-click a German word to add it.
          </div>
        ) : myFiltered.length === 0 ? (
          <div className="sub">No matches.</div>
        ) : (
          <div className="vocab-list">
            {myFiltered.map((v) => (
              <div className="vocab-item" key={v.id}>
                <div style={{ flex: 1 }}>
                  <b>{v.term}</b>
                  {v.source && (
                    <div className="vocab-src">
                      „{v.source.de}“
                      {v.source.en && <span className="meaning-inline"> — {meaning(v.source.en)}</span>}
                    </div>
                  )}
                </div>
                <button className="btn ghost" title="Remove" style={{ color: "var(--red)" }}
                  onClick={() => { removeVocab(v.id); refresh(); }}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Starter glossary */}
      {GLOSSARY.map((group) => {
        const entries = group.entries.filter((e) => match(e.de, e.en));
        if (entries.length === 0) return null;
        return (
          <div className="card" key={group.category}>
            <h2 style={{ fontSize: 16 }}>{group.emoji} {group.category} <span style={{ color: "var(--muted)", fontWeight: 400 }}>({entries.length})</span></h2>
            <div className="vocab-grid">
              {entries.map((e) => (
                <div className="vocab-row" key={e.de}>
                  <span className="vocab-de">{e.de}</span>
                  {meaning(e.en)}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
