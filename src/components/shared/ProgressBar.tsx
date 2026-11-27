export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (<div className="flex items-center gap-2" role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label={label ?? "Avancement"}>
    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200"><div className={`h-full rounded-full ${v === 100 ? "bg-emerald-600" : "bg-gold-500"}`} style={{ width: `${v}%` }} /></div>
    <span className="w-9 text-right text-xs tabular-nums text-slate-600">{v} %</span></div>);
}
