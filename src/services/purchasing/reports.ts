import type { GoodsReceipt, PurchaseOrder, PurchaseRequest, SupplierInvoice } from "@/types";

const live = (orders: PurchaseOrder[]) => orders.filter(o => o.status !== "Annulé");

export interface SupplierStats { orders: number; orderedHT: number; onTimeRate: number | null; nonConformityRate: number | null; openDisputes: number }

/** On-time = receipt dated on or before the order's expected delivery; non-conformity = rejected / received, in %. */
export function supplierStats(supplierId: string, orders: PurchaseOrder[], receipts: GoodsReceipt[], invoices: SupplierInvoice[]): SupplierStats {
  const os = live(orders).filter(o => o.supplierId === supplierId);
  const recs = receipts.filter(r => os.some(o => o.id === r.orderId));
  const received = recs.reduce((s, r) => s + r.lines.reduce((t, l) => t + l.received, 0), 0);
  const rejected = recs.reduce((s, r) => s + r.lines.reduce((t, l) => t + l.rejected, 0), 0);
  const onTime = recs.filter(r => r.receivedAt.slice(0, 10) <= (os.find(o => o.id === r.orderId)?.expectedDelivery ?? "")).length;
  return {
    orders: os.length,
    orderedHT: os.reduce((s, o) => s + o.totalHT, 0),
    onTimeRate: recs.length ? Math.round((onTime / recs.length) * 100) : null,
    nonConformityRate: received ? (rejected / received) * 100 : null,
    openDisputes: invoices.filter(i => i.supplierId === supplierId && i.status === "En litige").length,
  };
}

/** Engaged HT of an order: its HT minus the balance released by a close with balance. */
export const committedHT = (o: PurchaseOrder) => o.totalHT - o.lines.reduce((s, l) => s + (l.cancelledQty ?? 0) * l.unitPriceHT, 0);

function sumBy<K extends string>(orders: PurchaseOrder[], key: (o: PurchaseOrder) => K) {
  const m = new Map<K, number>();
  live(orders).forEach(o => m.set(key(o), (m.get(key(o)) ?? 0) + committedHT(o)));
  return [...m.entries()];
}
export const spendByProject = (orders: PurchaseOrder[]) => sumBy(orders, o => (o.projectId ?? "") as string).map(([projectId, totalHT]) => ({ projectId: projectId || undefined, totalHT }));
export const spendBySupplier = (orders: PurchaseOrder[]) => sumBy(orders, o => o.supplierId).map(([supplierId, totalHT]) => ({ supplierId, totalHT })).sort((a, b) => b.totalHT - a.totalHT);
export const spendByMonth = (orders: PurchaseOrder[]) => sumBy(orders, o => o.issuedAt.slice(0, 7)).map(([month, totalHT]) => ({ month, totalHT })).sort((a, b) => a.month.localeCompare(b.month));

/** Median number of days between a request's submission and its order's issue (rounded). */
export function cycleTimeDays(requests: PurchaseRequest[], orders: PurchaseOrder[]): number | null {
  const d = live(orders).flatMap(o => { const r = requests.find(x => x.id === o.requestId); return r?.submittedAt ? [(Date.parse(o.issuedAt) - Date.parse(r.submittedAt)) / 86_400_000] : []; }).sort((a, b) => a - b);
  if (!d.length) return null;
  const mid = Math.floor(d.length / 2);
  return Math.round(d.length % 2 ? d[mid] : (d[mid - 1] + d[mid]) / 2);
}

export function nonConformityRate(receipts: GoodsReceipt[]): number | null {
  const rec = receipts.reduce((s, r) => s + r.lines.reduce((t, l) => t + l.received, 0), 0);
  return rec ? (receipts.reduce((s, r) => s + r.lines.reduce((t, l) => t + l.rejected, 0), 0) / rec) * 100 : null;
}

// Semicolon-separated with a UTF-8 BOM so that French Excel opens accents and columns correctly.
export function toCsv(rows: Record<string, string | number>[]): string {
  if (!rows.length) return "﻿";
  const cell = (v: string | number) => { const s = String(v); return /[;"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const keys = Object.keys(rows[0]);
  return "﻿" + [keys.map(cell).join(";"), ...rows.map(r => keys.map(k => cell(r[k] ?? "")).join(";"))].join("\r\n");
}
