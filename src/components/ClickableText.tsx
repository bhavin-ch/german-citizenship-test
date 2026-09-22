import { useState } from "react";
import { createPortal } from "react-dom";
import { addVocab, hasVocab } from "../lib/storage";

interface Props {
  de: string;
  /** English of the same sentence, saved as context when a word is added. */
  en?: string;
  className?: string;
}

const strip = (raw: string) => raw.replace(/^[^\p{L}\p{N}-]+|[^\p{L}\p{N}-]+$/gu, "");

/**
 * Renders German text whose words can be cmd/ctrl+clicked to save them to the
 * Wörtschatz. A plain click passes through (so it still works inside answer
 * buttons), only cmd/ctrl+click opens the add popover.
 */
export default function ClickableText({ de, en, className }: Props) {
  const [pop, setPop] = useState<{ word: string; x: number; y: number; added: boolean } | null>(null);

  const onWord = (e: React.MouseEvent, raw: string) => {
    if (!(e.metaKey || e.ctrlKey)) return; // let normal clicks bubble
    e.preventDefault();
    e.stopPropagation();
    const word = strip(raw);
    if (!word) return;
    const x = Math.min(e.clientX, window.innerWidth - 230);
    setPop({ word, x, y: e.clientY + 8, added: hasVocab(word) });
  };

  const add = () => {
    if (!pop) return;
    addVocab(pop.word, en ? { de, en } : undefined);
    setPop({ ...pop, added: true });
  };

  const tokens = de.split(/(\s+)/);

  return (
    <span className={className}>
      {tokens.map((t, i) =>
        /^\s+$/.test(t) || t === "" ? (
          t
        ) : (
          <span key={i} className="cw" onClick={(e) => onWord(e, t)}>
            {t}
          </span>
        )
      )}
      {pop &&
        createPortal(
          <>
            <div className="cw-backdrop" onClick={() => setPop(null)} />
            <div className="cw-pop" style={{ left: pop.x, top: pop.y }} onClick={(e) => e.stopPropagation()}>
              <div className="cw-word">{pop.word}</div>
              {pop.added ? (
                <div className="cw-done">✓ In your Wörtschatz</div>
              ) : (
                <button className="btn" style={{ padding: "6px 12px", fontSize: 13 }} onClick={add}>
                  ➕ Add to Wörtschatz
                </button>
              )}
            </div>
          </>,
          document.body
        )}
    </span>
  );
}
