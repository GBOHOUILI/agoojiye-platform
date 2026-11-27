"use client";
import { useState } from "react";
import { useDemoStore } from "@/hooks/demo-store";
import { documentTotals, formatRate } from "@/lib/purchasing/money";
import { PURCHASING_RULES } from "@/lib/purchasing/rules";
import type { PurchaseRequest, Quote } from "@/types";
import { Money } from "./Money";

export function OrderIssueForm({ request, quote, onDone }: { request: PurchaseRequest; quote: Quote; onDone: (id: string) => void }) {
  const s = useDemoStore();
  const [f, setF] = useState({ vatRateBp: String(quote.vatRateBp), expectedDelivery: request.neededBy, deliveryAddress: "Atelier prototypes, Cotonou" }), [busy, setBusy] = useState(false);
  const totals = documentTotals(request.lines.map(l => ({ quantity: l.quantity, unitPriceHT: quote.prices.find(p => p.lineId === l.id)?.unitPriceHT ?? 0 })), Number(f.vatRateBp));
  return (<form className="space-y-4" onSubmit={async e => { e.preventDefault(); setBusy(true); const id = await s.issueOrder(request.id, { ...f, vatRateBp: Number(f.vatRateBp) }); setBusy(false); if (id) onDone(id); }}>
    <p className="text-sm text-slate-600">Le bon de commande reprend les lignes de la demande et les prix du devis {quote.id}. Son émission engage la dépense.</p>
    <div className="grid gap-3 sm:grid-cols-2">
      <div><label className="field-label" htmlFor="of-vat">Taux de TVA</label><select id="of-vat" value={f.vatRateBp} onChange={e => setF({ ...f, vatRateBp: e.target.value })}>{PURCHASING_RULES.allowedVatRatesBp.map(r => <option key={r} value={r}>{formatRate(r)}</option>)}</select></div>
      <div><label className="field-label" htmlFor="of-date">Livraison prévue</label><input id="of-date" type="date" value={f.expectedDelivery} onChange={e => setF({ ...f, expectedDelivery: e.target.value })} /></div>
      <div className="sm:col-span-2"><label className="field-label" htmlFor="of-addr">Lieu de livraison</label><input id="of-addr" value={f.deliveryAddress} onChange={e => setF({ ...f, deliveryAddress: e.target.value })} /></div></div>
    <div className="rounded-lg bg-slate-50 p-3 text-sm"><div className="flex justify-between"><span>Total HT</span><Money value={totals.totalHT} strong /></div><div className="flex justify-between"><span>TVA {formatRate(Number(f.vatRateBp))}</span><Money value={totals.totalVAT} /></div><div className="flex justify-between"><span>Total TTC</span><Money value={totals.totalTTC} /></div></div>
    <button disabled={busy} className="btn w-full">Émettre le bon de commande</button></form>);
}
