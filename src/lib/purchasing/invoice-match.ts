import type { GoodsReceipt, InvoiceLine, PurchaseOrder, SupplierInvoice } from "@/types";
import { documentTotals, formatFCFA, formatRate, type Totals } from "./money";
import { lineProgress } from "./order-progress";

export interface InvoiceDraft { lines: InvoiceLine[]; vatRateBp: number; declaredTTC: number }

/**
 * Three-way match: invoice vs order (prices, VAT rate) vs receipts (accepted quantities).
 * `others` = the order's other invoices; cancelled and disputed ones are ignored. A duplicate is still caught:
 * the later invoice goes to dispute because the earlier accepted one already covers the quantities.
 */
export function matchInvoice(d: InvoiceDraft, o: Pick<PurchaseOrder, "id" | "lines" | "vatRateBp">, receipts: GoodsReceipt[], others: SupplierInvoice[]): { totals: Totals; issues: string[] } {
  const totals = documentTotals(d.lines, d.vatRateBp);
  // Disputed invoices are not accepted for payment: they must not consume quantities of the others.
  const progress = lineProgress(o, receipts, others.filter(i => i.status !== "En litige"));
  const issues: string[] = [];
  for (const l of d.lines) {
    const ol = o.lines.find(x => x.id === l.orderLineId);
    if (!ol) { issues.push(`Ligne ${l.orderLineId} inconnue sur ce bon de commande.`); continue; }
    if (l.unitPriceHT !== ol.unitPriceHT) issues.push(`Ligne ${ol.id} : prix unitaire ${formatFCFA(l.unitPriceHT)} au lieu de ${formatFCFA(ol.unitPriceHT)}.`);
    const p = progress.find(x => x.orderLineId === ol.id)!;
    const cumulative = p.invoiced + d.lines.filter(x => x.orderLineId === ol.id).reduce((s, x) => s + x.quantity, 0);
    if (cumulative > p.accepted && !issues.some(i => i.startsWith(`Ligne ${ol.id} : la quantité`))) issues.push(`Ligne ${ol.id} : la quantité facturée cumulée (${cumulative}) dépasse les quantités acceptées (${p.accepted}).`);
  }
  if (d.vatRateBp !== o.vatRateBp) issues.push(`Taux de TVA ${formatRate(d.vatRateBp)} au lieu de ${formatRate(o.vatRateBp)}.`);
  if (d.declaredTTC !== totals.totalTTC) issues.push(`Montant TTC déclaré ${formatFCFA(d.declaredTTC)} au lieu de ${formatFCFA(totals.totalTTC)}.`);
  return { totals, issues };
}
