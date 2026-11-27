import { formatFCFA } from "@/lib/purchasing/money";
/** Integer FCFA amount, tabular figures. `suffix` labels HT/TTC. */
export function Money({ value, suffix, strong }: { value: number; suffix?: "HT" | "TTC" | "TVA"; strong?: boolean }) {
  return <span className={`whitespace-nowrap tabular-nums ${strong ? "font-semibold" : ""}`}>{formatFCFA(value)}{suffix && <span className="ml-1 text-xs font-normal text-slate-500">{suffix}</span>}</span>;
}
