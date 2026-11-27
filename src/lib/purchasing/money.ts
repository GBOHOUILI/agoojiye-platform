// All amounts are integer FCFA (XOF has no minor unit). VAT rates are integer basis points (1800 = 18 %).
export interface Totals { totalHT: number; totalVAT: number; totalTTC: number }

export const isMoney = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n >= 0;
export const lineHT = (quantity: number, unitPriceHT: number): number => quantity * unitPriceHT;

// VAT is rounded once per document (half up), so HT + TVA = TTC always holds.
export function documentTotals(lines: { quantity: number; unitPriceHT: number }[], vatRateBp: number): Totals {
  const totalHT = lines.reduce((s, l) => s + lineHT(l.quantity, l.unitPriceHT), 0);
  const totalVAT = Math.round((totalHT * vatRateBp) / 10_000);
  return { totalHT, totalVAT, totalTTC: totalHT + totalVAT };
}

// Manual grouping (no Intl) so server and client render identically.
export function formatFCFA(n: number): string {
  const s = String(Math.abs(Math.trunc(n))).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${n < 0 ? "-" : ""}${s} FCFA`;
}
export const formatRate = (bp: number) => `${(bp / 100).toString().replace(".", ",")} %`;
