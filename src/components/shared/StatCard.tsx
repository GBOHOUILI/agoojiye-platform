import Link from "next/link";
const TONES = { default: "", warn: "border-l-4 border-l-amber-500", danger: "border-l-4 border-l-red-600" };
export function StatCard({ label, value, hint, tone = "default", href }: { label: string; value: string | number; hint?: string; tone?: keyof typeof TONES; href?: string }) {
  const body = <><div className="text-2xl font-semibold tabular-nums [overflow-wrap:anywhere]">{value}</div><div className="text-sm text-slate-600">{label}</div>{hint && <div className="mt-0.5 text-xs text-slate-500">{hint}</div>}</>;
  const cls = `card block min-w-0 ${TONES[tone]}`;
  return href ? <Link href={href} className={`${cls} transition-colors hover:border-gold-600`}>{body}</Link> : <div className={cls}>{body}</div>;
}
