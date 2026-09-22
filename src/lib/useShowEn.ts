import { useEffect, useState } from "react";

const KEY = "ebt.showEn";
const EVENT = "ebt-showen-change";

function read(): boolean {
  try { return localStorage.getItem(KEY) === "1"; } catch { return false; }
}

/** Set the global "show English" preference and notify every subscriber. */
export function setShowEn(v: boolean) {
  try { localStorage.setItem(KEY, v ? "1" : "0"); } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: v }));
}

export function toggleShowEn() {
  setShowEn(!read());
}

/** Shared reactive "show English translation" flag, backed by localStorage. */
export function useShowEn(): [boolean, (v: boolean) => void] {
  const [on, setOn] = useState(read);
  useEffect(() => {
    const handler = () => setOn(read());
    window.addEventListener(EVENT, handler);
    window.addEventListener("storage", handler); // sync across tabs
    return () => {
      window.removeEventListener(EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);
  return [on, setShowEn];
}
