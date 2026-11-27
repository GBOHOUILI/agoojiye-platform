"use client";
import { useState } from "react";
import { useDemoStore } from "@/hooks/demo-store";
import { formatRate } from "@/lib/purchasing/money";
import { PURCHASING_RULES } from "@/lib/purchasing/rules";
import { compareQuotes } from "@/services/purchasing/quotes.service";
import { requestTotalHT } from "@/services/purchasing/requests.service";
import type { PurchaseRequest, Quote } from "@/types";
import { Money } from "./Money";
import { StatusPill } from "./StatusPill";

/** Side-by-side comparison; the selection form only asks for the justifications the rules require. */
export function QuotesComparison({ request }: { request: PurchaseRequest }) {
  const s = useDemoStore();
  const quotes = s.quotes.filter(q => q.requestId === request.id);
  const [selecting, setSelecting] = useState<Quote | null>(null), [f, setF] = useState({ selectionNote: "", singleSourceReason: "", overrunReason: "" }), [busy, setBusy] = useState(false);
  if (!quotes.length) return null;
  const { cheapestId, fastestId } = compareQuotes(quotes);
  const R = PURCHASING_RULES, approved = request.approvedAmountHT ?? requestTotalHT(request);
  const canSelect = s.can("purchase:quote") && request.status === "En consultation";
  const needs = (q: Quote) => ({
    singleSource: requestTotalHT(request) >= R.minQuotesAboveHT && quotes.length < R.minQuotes,
    note: quotes.some(x => x.status !== "Écarté" && x.totalHT < q.totalHT),
    overrun: q.totalHT * 100 > approved * (100 + R.overrunTolerancePct),
  });
  const supplier = (id: string) => s.suppliers.find(x => x.id === id);
  const submit = async () => { if (!selecting) return; setBusy(true); const ok = await s.selectQuote(selecting.id, f); setBusy(false); if (ok) setSelecting(null); };

  return (<section className="card min-w-0"><h2 className="mb-3 text-sm font-semibold">Comparaison des devis ({quotes.length})</h2>
    <div className="-mx-4 overflow-x-auto px-4"><table className="w-full min-w-[34rem] border-collapse text-sm">
      <thead><tr className="border-b align-bottom"><th className="sticky left-0 bg-white py-2 pr-3 text-left text-xs font-medium text-slate-500">Ligne</th>
        {quotes.map(q => <th key={q.id} className={`px-3 py-2 text-right ${q.status === "Retenu" ? "bg-gold-50" : ""}`}>
          <div className="font-semibold">{supplier(q.supplierId)?.name}</div><div className="text-xs font-normal text-slate-500">{q.id}, réf. {q.supplierRef}</div>
          <div className="mt-1 flex flex-wrap justify-end gap-1">{q.id === cheapestId && <span className="rounded-full bg-ink px-2 text-[11px] text-gold-300">Moins cher</span>}{q.id === fastestId && <span className="rounded-full bg-slate-200 px-2 text-[11px]">Plus rapide</span>}<StatusPill v={q.status} quote /></div></th>)}</tr></thead>
      <tbody>{request.lines.map(l => <tr key={l.id} className="border-b"><th scope="row" className="sticky left-0 bg-white py-2 pr-3 text-left font-normal">{l.designation}<span className="block text-xs text-slate-500">{l.quantity} {l.unit}, estimé <Money value={l.estimatedUnitPriceHT} /></span></th>
        {quotes.map(q => { const p = q.prices.find(x => x.lineId === l.id)?.unitPriceHT ?? 0; return <td key={q.id} className={`px-3 py-2 text-right ${q.status === "Retenu" ? "bg-gold-50" : ""}`}><Money value={p} /><span className="block text-xs text-slate-500"><Money value={p * l.quantity} /></span></td>; })}</tr>)}
        {([["Total HT", "totalHT"], ["TVA", "totalVAT"], ["Total TTC", "totalTTC"]] as const).map(([label, k]) => <tr key={k} className="border-b"><th scope="row" className="sticky left-0 bg-white py-2 pr-3 text-left font-medium">{label}</th>{quotes.map(q => <td key={q.id} className={`px-3 py-2 text-right ${q.status === "Retenu" ? "bg-gold-50" : ""}`}><Money value={q[k]} strong={k === "totalHT"} />{k === "totalVAT" && <span className="block text-xs text-slate-500">{formatRate(q.vatRateBp)}</span>}</td>)}</tr>)}
        <tr className="border-b"><th scope="row" className="sticky left-0 bg-white py-2 pr-3 text-left font-normal">Délai, validité</th>{quotes.map(q => <td key={q.id} className="px-3 py-2 text-right">{q.deliveryDays} j<span className="block text-xs text-slate-500">jusqu’au {q.validUntil.split("-").reverse().join("/")}</span></td>)}</tr>
        {canSelect && <tr><td className="sticky left-0 bg-white" />{quotes.map(q => <td key={q.id} className="px-3 py-2 text-right">{q.status === "Reçu" && <button className="btn-o btn-sm" onClick={() => { setSelecting(q); setF({ selectionNote: "", singleSourceReason: "", overrunReason: "" }); }}>Retenir</button>}</td>)}</tr>}
      </tbody></table></div>
    {quotes.find(q => q.status === "Retenu")?.selectionNote && <p className="mt-3 text-sm text-slate-600">Justification du choix : « {quotes.find(q => q.status === "Retenu")!.selectionNote} »</p>}
    {selecting && (() => { const n = needs(selecting); return (
      <form className="mt-4 space-y-3 rounded-lg border border-gold-300 bg-gold-50 p-3" onSubmit={e => { e.preventDefault(); void submit(); }}>
        <p className="text-sm font-medium">Retenir le devis {selecting.id} ({supplier(selecting.supplierId)?.name}, <Money value={selecting.totalHT} suffix="HT" />)</p>
        {n.singleSource && <div><label className="field-label" htmlFor="qs-single">Exception : un seul devis au-delà de 1 000 000 FCFA HT</label><textarea id="qs-single" rows={2} value={f.singleSourceReason} onChange={e => setF({ ...f, singleSourceReason: e.target.value })} /></div>}
        {n.note && <div><label className="field-label" htmlFor="qs-note">Pourquoi ce devis plutôt que le moins-disant ?</label><textarea id="qs-note" rows={2} value={f.selectionNote} onChange={e => setF({ ...f, selectionNote: e.target.value })} /></div>}
        {n.overrun && <div><label className="field-label" htmlFor="qs-over">Justification du dépassement (plus de {R.overrunTolerancePct} % au-dessus de l’estimation validée)</label><textarea id="qs-over" rows={2} value={f.overrunReason} onChange={e => setF({ ...f, overrunReason: e.target.value })} /></div>}
        <p className="text-xs text-slate-600">Si le montant franchit un seuil non encore validé, des validations complémentaires seront demandées avant l’émission du bon de commande.</p>
        <div className="flex gap-2"><button disabled={busy} className="btn btn-sm">Confirmer le choix</button><button type="button" className="btn-o btn-sm" onClick={() => setSelecting(null)}>Annuler</button></div></form>); })()}
  </section>);
}
