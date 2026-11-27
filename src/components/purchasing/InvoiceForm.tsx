"use client";
import { useState } from "react";
import { useDemoStore } from "@/hooks/demo-store";
import { todayIso } from "@/lib/clock";
import { matchInvoice } from "@/lib/purchasing/invoice-match";
import { formatRate } from "@/lib/purchasing/money";
import { lineProgress } from "@/lib/purchasing/order-progress";
import { PURCHASING_RULES } from "@/lib/purchasing/rules";
import type { PurchaseOrder, SupplierInvoice } from "@/types";
import { Money } from "./Money";

const n = (v: string) => (v.trim() === "" ? NaN : Number(v.replace(/\s/g, "")));

export function InvoiceForm({ order, invoice, onDone }: { order: PurchaseOrder; invoice?: SupplierInvoice; onDone: () => void }) {
  const s = useDemoStore();
  const others = s.invoices.filter(i => i.orderId === order.id && i.id !== invoice?.id);
  const progress = lineProgress(order, s.receipts, others);
  const [f, setF] = useState({ supplierInvoiceNo: invoice?.supplierInvoiceNo ?? "", invoiceDate: invoice?.invoiceDate ?? todayIso(), dueDate: invoice?.dueDate ?? "", vatRateBp: String(invoice?.vatRateBp ?? order.vatRateBp) });
  const [lines, setLines] = useState(order.lines.map(l => {
    const existing = invoice?.lines.find(x => x.orderLineId === l.id), p = progress.find(x => x.orderLineId === l.id)!;
    return { orderLineId: l.id, quantity: String(existing?.quantity ?? Math.max(0, p.accepted - p.invoiced)), unitPriceHT: String(existing?.unitPriceHT ?? l.unitPriceHT) };
  }));
  const draftLines = lines.filter(l => n(l.quantity) > 0).map(l => ({ orderLineId: l.orderLineId, quantity: n(l.quantity), unitPriceHT: n(l.unitPriceHT) }));
  const preview = matchInvoice({ lines: draftLines, vatRateBp: Number(f.vatRateBp), declaredTTC: 0 }, order, s.receipts, others);
  const [declared, setDeclared] = useState(invoice ? String(invoice.declaredTTC) : "");
  const issues = matchInvoice({ lines: draftLines, vatRateBp: Number(f.vatRateBp), declaredTTC: n(declared || String(preview.totals.totalTTC)) }, order, s.receipts, others).issues;
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    const input = { orderId: order.id, ...f, vatRateBp: Number(f.vatRateBp), lines: draftLines, declaredTTC: n(declared || String(preview.totals.totalTTC)) };
    const ok = invoice ? await s.correctInvoice(invoice.id, input) : !!(await s.recordInvoice(input));
    setBusy(false); if (ok) onDone();
  };
  return (<form onSubmit={submit} className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2"><label className="field-label" htmlFor="if-no">N° de facture du fournisseur *</label><input id="if-no" value={f.supplierInvoiceNo} onChange={e => setF({ ...f, supplierInvoiceNo: e.target.value })} /></div>
      <div><label className="field-label" htmlFor="if-date">Date de facture</label><input id="if-date" type="date" value={f.invoiceDate} onChange={e => setF({ ...f, invoiceDate: e.target.value })} /></div>
      <div><label className="field-label" htmlFor="if-due">Échéance</label><input id="if-due" type="date" value={f.dueDate} onChange={e => setF({ ...f, dueDate: e.target.value })} /></div>
      <div><label className="field-label" htmlFor="if-vat">TVA facturée</label><select id="if-vat" value={f.vatRateBp} onChange={e => setF({ ...f, vatRateBp: e.target.value })}>{PURCHASING_RULES.allowedVatRatesBp.map(r => <option key={r} value={r}>{formatRate(r)}</option>)}</select></div>
      <div><label className="field-label" htmlFor="if-ttc">Montant TTC porté sur la facture</label><input id="if-ttc" inputMode="numeric" placeholder={String(preview.totals.totalTTC)} value={declared} onChange={e => setDeclared(e.target.value)} /></div></div>
    <fieldset><legend className="field-label">Lignes facturées</legend>
      {lines.map((l, i) => { const ol = order.lines.find(x => x.id === l.orderLineId)!, p = progress.find(x => x.orderLineId === ol.id)!; return (
        <div key={l.orderLineId} className="grid grid-cols-[1fr_5rem_7rem] items-center gap-2 border-b py-2 last:border-0">
          <span className="text-sm">{ol.designation}<span className="block text-xs text-slate-500">accepté {p.accepted}, déjà facturé {p.invoiced}, prix BC <Money value={ol.unitPriceHT} /></span></span>
          <input aria-label={`Quantité facturée ${ol.designation}`} inputMode="numeric" value={l.quantity} onChange={e => setLines(ls => ls.map((x, k) => (k === i ? { ...x, quantity: e.target.value } : x)))} />
          <input aria-label={`Prix unitaire facturé ${ol.designation}`} inputMode="numeric" value={l.unitPriceHT} onChange={e => setLines(ls => ls.map((x, k) => (k === i ? { ...x, unitPriceHT: e.target.value } : x)))} /></div>); })}</fieldset>
    <div className="rounded-lg bg-slate-50 p-3 text-sm"><div className="flex justify-between"><span>Total HT</span><Money value={preview.totals.totalHT} strong /></div><div className="flex justify-between"><span>TVA</span><Money value={preview.totals.totalVAT} /></div><div className="flex justify-between"><span>Total TTC calculé</span><Money value={preview.totals.totalTTC} /></div></div>
    {issues.length ? <ul className="space-y-1 rounded-lg bg-red-50 p-3 text-sm text-red-800">{issues.map(x => <li key={x}>{x}</li>)}<li className="text-xs">La facture sera enregistrée « En litige ».</li></ul>
      : <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">Rapprochement conforme : prix, quantités acceptées, TVA et TTC concordent.</p>}
    <button disabled={busy} className="btn w-full">{invoice ? "Enregistrer la correction" : "Enregistrer la facture"}</button></form>);
}
