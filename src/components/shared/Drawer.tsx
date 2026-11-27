"use client";
import { X } from "lucide-react";
import { ReactNode, useEffect, useRef } from "react";
export function Drawer({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  // Depends on `open` only: parents pass inline callbacks, refocusing on each render would steal focus.
  useEffect(() => {
    if (!open) return;
    titleRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeRef.current(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  if (!open) return null;
  return (<div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
    <div className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
    <div className="absolute inset-y-0 right-0 flex w-full flex-col bg-white shadow-xl sm:max-w-lg">
      <div className="flex items-center justify-between border-b px-4 py-3"><h2 ref={titleRef} tabIndex={-1} className="text-base font-semibold outline-none">{title}</h2>
        <button aria-label="Fermer" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button></div>
      <div className="flex-1 overflow-y-auto p-4">{children}</div></div></div>);
}
