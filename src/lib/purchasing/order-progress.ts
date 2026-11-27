import type { GoodsReceipt, PurchaseOrder, SupplierInvoice } from "@/types";

export interface LineProgress { orderLineId: string; ordered: number; cancelled: number; received: number; accepted: number; rejected: number; missing: number; invoiced: number }

/** Per order line: rejected goods do not count as delivered; cancelled invoices are ignored. */
export function lineProgress(o: Pick<PurchaseOrder, "id" | "lines">, receipts: GoodsReceipt[], invoices: SupplierInvoice[]): LineProgress[] {
  const recs = receipts.filter(r => r.orderId === o.id);
  const invs = invoices.filter(i => i.orderId === o.id && i.status !== "Annulée");
  return o.lines.map(l => {
    const rl = recs.flatMap(r => r.lines.filter(x => x.orderLineId === l.id));
    const received = rl.reduce((s, x) => s + x.received, 0), accepted = rl.reduce((s, x) => s + x.accepted, 0), rejected = rl.reduce((s, x) => s + x.rejected, 0);
    const invoiced = invs.flatMap(i => i.lines.filter(x => x.orderLineId === l.id)).reduce((s, x) => s + x.quantity, 0);
    const cancelled = l.cancelledQty ?? 0;
    return { orderLineId: l.id, ordered: l.quantity, cancelled, received, accepted, rejected, missing: Math.max(0, l.quantity - cancelled - accepted), invoiced };
  });
}

export function receiptStatus(o: Pick<PurchaseOrder, "id" | "lines">, receipts: GoodsReceipt[]): "Émis" | "Partiellement reçu" | "Reçu" {
  const p = lineProgress(o, receipts, []);
  if (p.every(l => l.missing === 0)) return "Reçu";
  return p.some(l => l.received > 0) ? "Partiellement reçu" : "Émis";
}

/** Reasons preventing a close with balance; empty when the order may be closed. */
export function closeBlockers(o: Pick<PurchaseOrder, "id" | "lines">, receipts: GoodsReceipt[], invoices: SupplierInvoice[]): string[] {
  const pendingInvoices = invoices.filter(i => i.orderId === o.id && i.status !== "Annulée" && i.status !== "Transmise à la Finance").map(i => `Facture ${i.id} : ${i.status}.`);
  const notInvoiced = lineProgress(o, receipts, invoices).filter(l => l.invoiced < l.accepted).map(l => `Ligne ${l.orderLineId} : ${l.accepted - l.invoiced} unité(s) acceptée(s) non facturée(s).`);
  return [...pendingInvoices, ...notInvoiced];
}

/** Automatic closing condition: nothing missing, everything accepted invoiced, every invoice transmitted. */
export const isFullyDone = (o: Pick<PurchaseOrder, "id" | "lines">, receipts: GoodsReceipt[], invoices: SupplierInvoice[]) =>
  lineProgress(o, receipts, invoices).every(l => l.missing === 0) && closeBlockers(o, receipts, invoices).length === 0;
