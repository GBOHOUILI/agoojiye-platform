"use client";
import { useState } from "react";
import { useDemoStore } from "@/hooks/demo-store";
import { todayIso } from "@/lib/clock";
import { documentTotals, formatRate } from "@/lib/purchasing/money";
import { PURCHASING_RULES } from "@/lib/purchasing/rules";
import type { PurchaseRequest } from "@/types";
import { Money } from "./Money";

export function QuoteForm({ request, onDone }: { request: PurchaseRequest; onDone: () => void }) {
  const s = useDemoStore();
  const suppliers = s.suppliers.filter(x => x.status === "Actif");
  const [f, setF] = useState({ supplierId: suppliers[0]?.id ?? "", supplierRef: "", receivedAt: todayIso(), validUntil: "", deliveryDays: "7", vatRateBp: String(PURCHASING_RULES.defaultVatRateBp) });
  const [prices, setPrices] = useState<Record<string, string>>({}), [busy, setBusy] = useState(false);
  const num = (v: string | undefined) => Number((v ?? "").replace(/\s/g, ""));
  const totals = documentTotals(request.lines.map(l => ({ quantity: l.quantity, unitPriceHT: num(prices[l.id]) || 0 })), Number(f.vatRateBp));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    const ok = await s.recordQuote(request.id, { supplierId: f.supplierId, supplierRef: f.supplierRef, receivedAt: f.receivedAt, validUntil: f.validUntil, deliveryDays: num(f.deliveryDays), vatRateBp: Number(f.vatRateBp),
      prices: request.lines.map(l => ({ lineId: l.id, unitPriceHT: prices[l.id] ? num(prices[l.id]) : NaN })) });
    setBusy(false); if (ok) onDone();
  };
  return (<form onSubmit={submit} className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2"><label className="field-label" htmlFor="qf-sup">Fournisseur (actifs uniquement)</label><select id="qf-sup" value={f.supplierId} onChange={e => setF({ ...f, supplierId: e.target.value })}>{suppliers.map(x => <option key={x.id} value={x.id}>{x.name}, {x.city}</option>)}</select></div>
      <div><label className="field-label" htmlFor="qf-ref">Référence du devis</label><input id="qf-ref" value={f.supplierRef} onChange={e => setF({ ...f, supplierRef: e.target.value })} /></div>
      <div><label className="field-label" htmlFor="qf-days">Délai de livraison (jours)</label><input id="qf-days" inputMode="numeric" value={f.deliveryDays} onChange={e => setF({ ...f, deliveryDays: e.target.value })} /></div>
      <div><label className="field-label" htmlFor="qf-rec">Reçu le</label><input id="qf-rec" type="date" value={f.receivedAt} onChange={e => setF({ ...f, receivedAt: e.target.value })} /></div>
      <div><label className="field-label" htmlFor="qf-val">Valable jusqu’au</label><input id="qf-val" type="date" value={f.validUntil} onChange={e => setF({ ...f, validUntil: e.target.value })} /></div>
      <div><label className="field-label" htmlFor="qf-vat">TVA</label><select id="qf-vat" value={f.vatRateBp} onChange={e => setF({ ...f, vatRateBp: e.target.value })}>{PURCHASING_RULES.allowedVatRatesBp.map(r => <option key={r} value={r}>{formatRate(r)}</option>)}</select></div></div>
    <fieldset><legend className="field-label">Prix unitaires HT (FCFA)</legend>
      {request.lines.map(l => <div key={l.id} className="flex items-center gap-3 border-b py-2 last:border-0"><label htmlFor={`qf-${l.id}`} className="min-w-0 flex-1 text-sm">{l.designation}<span className="block text-xs text-slate-500">{l.quantity} {l.unit}, estimé <Money value={l.estimatedUnitPriceHT} /></span></label>
        <input id={`qf-${l.id}`} className="!w-36 text-right" inputMode="numeric" value={prices[l.id] ?? ""} onChange={e => setPrices({ ...prices, [l.id]: e.target.value })} /></div>)}</fieldset>
    <div className="rounded-lg bg-slate-50 p-3 text-sm"><div className="flex justify-between"><span>Total HT</span><Money value={totals.totalHT} strong /></div><div className="flex justify-between"><span>TVA</span><Money value={totals.totalVAT} /></div><div className="flex justify-between"><span>Total TTC</span><Money value={totals.totalTTC} /></div></div>
    <button disabled={busy} className="btn w-full">Enregistrer le devis</button></form>);
}
