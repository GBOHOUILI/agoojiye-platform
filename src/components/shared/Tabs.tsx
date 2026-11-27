"use client";
import { KeyboardEvent, useRef } from "react";
export interface TabDef { id: string; label: string; count?: number }
export function Tabs({ tabs, value, onChange }: { tabs: TabDef[]; value: string; onChange: (id: string) => void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: KeyboardEvent, i: number) => {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0; if (!d) return;
    const n = (i + d + tabs.length) % tabs.length; onChange(tabs[n].id); refs.current[n]?.focus();
  };
  return (<div role="tablist" className="no-scrollbar mb-4 flex gap-1 overflow-x-auto overflow-y-hidden [box-shadow:inset_0_-1px_0_#e2e8f0]">
    {tabs.map((t, i) => { const on = t.id === value; return (
      <button key={t.id} ref={el => { refs.current[i] = el; }} role="tab" aria-selected={on} tabIndex={on ? 0 : -1} onKeyDown={e => onKey(e, i)} onClick={() => onChange(t.id)}
        className={`flex min-h-[40px] items-center gap-1.5 whitespace-nowrap border-b-2 px-3 text-sm ${on ? "border-gold-700 font-medium text-gold-800" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
        {t.label}{t.count !== undefined && <span className={`rounded-full px-1.5 text-xs tabular-nums ${on ? "bg-gold-100" : "bg-slate-100"}`}>{t.count}</span>}</button>); })}
  </div>);
}
