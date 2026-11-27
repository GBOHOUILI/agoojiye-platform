"use client";
import { useCallback, useEffect, useState } from "react";
import { DEFAULT_PREFS, parsePrefs, UI_PREFS_KEY, type UiPrefs } from "@/lib/ui/nav-state";

const EVENT = "agj-ui-prefs";

/** Per-browser display preferences (sidebar density, auto-open). Read after mount; shared across components. */
export function useUiPrefs() {
  const [prefs, setPrefs] = useState<UiPrefs>(DEFAULT_PREFS);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const load = () => { try { setPrefs(parsePrefs(localStorage.getItem(UI_PREFS_KEY))); } catch { /* storage unavailable */ } setReady(true); };
    load();
    window.addEventListener(EVENT, load);
    return () => window.removeEventListener(EVENT, load);
  }, []);
  const update = useCallback((patch: Partial<UiPrefs>) => {
    setPrefs(p => {
      const next = { ...p, ...patch };
      try { localStorage.setItem(UI_PREFS_KEY, JSON.stringify(next)); } catch { /* keep in memory */ }
      queueMicrotask(() => window.dispatchEvent(new Event(EVENT)));
      return next;
    });
  }, []);
  // Writes must wait for `ready`, otherwise defaults would overwrite the stored preferences.
  return { prefs, update, ready };
}
