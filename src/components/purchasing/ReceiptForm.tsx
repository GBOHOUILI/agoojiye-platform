"use client";
import { useState } from "react";
import { useDemoStore } from "@/hooks/demo-store";
import { lineProgress } from "@/lib/purchasing/order-progress";
import type { PurchaseOrder } from "@/types";

type L = { orderLineId: string; received: string; accepted: string; rejected: string; rejectReason: string };
const n = (v: string) => (v.trim() === "" ? 0 : Number(v));

export function ReceiptForm({ order, onDone }: { order: PurchaseOrder; onDone: () => void }) {
  const s = useDemoStore();
  const progress = lineProgress(order, s.receipts, []);
  const open = order.lines.filter(l => (progress.find(p => p.orderLineId === l.id)?.missing ?? 0) > 0);
  const [ref, setRef] = useState(""), [comment, setComment] = useState(""), [busy, setBusy] = useState(false);
  const [lines, setLines] = useState<L[]>(open.map(l => { const m = String(progress.find(p => p.orderLineId === l.id)!.missing); return { orderLineId: l.id, received: m, accepted: m, rejected: "0", rejectReason: "" }; }));
  const set = (i: number, patch: Partial<L>) => setLines(ls => ls.map((l, k) => {
    if (k !== i) return l;
    const next = { ...l, ...patch };
    // Keep accepted = received − rejected while the user edits received or rejected.
    if ("received" in patch || "rejected" in patch) next.accepted = String(Math.max(0, n(next.received) - n(next.rejected)));
    return next;
  }));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    const ok = await s.recordReceipt(order.id, { deliveryNoteRef: ref, comment: comment || undefined, lines: lines.map(l => ({ orderLineId: l.orderLineId, received: n(l.received), accepted: n(l.accepted), rejected: n(l.rejected), rejectReason: l.rejectReason || undefined })) });
    setBusy(false); if (ok) onDone();
  };
  if (!open.length) return <p className="text-sm text-slate-600">Tout a été réceptionné sur ce bon de commande.</p>;
  return (<form onSubmit={submit} className="space-y-4">
    <div><label className="field-label" htmlFor="rc-ref">Référence du bon de livraison *</label><input id="rc-ref" value={ref} onChange={e => setRef(e.target.value)} placeholder="BL-…" /></div>
    {lines.map((l, i) => { const ol = order.lines.find(x => x.id === l.orderLineId)!, missing = progress.find(p => p.orderLineId === ol.id)!.missing, ok = n(l.accepted) + n(l.rejected) === n(l.received); return (
      <fieldset key={l.orderLineId} className="rounded-lg border border-slate-200 p-3"><legend className="px-1 text-sm font-medium">{ol.designation}</legend>
        <p className="mb-2 text-xs text-slate-500">Reste à recevoir : {missing} {ol.unit}</p>
        <div className="grid grid-cols-3 gap-2">
          <div><label className="field-label" htmlFor={`rc-r-${i}`}>Reçu</label><input id={`rc-r-${i}`} inputMode="numeric" value={l.received} onChange={e => set(i, { received: e.target.value })} /></div>
          <div><label className="field-label" htmlFor={`rc-a-${i}`}>Accepté</label><input id={`rc-a-${i}`} inputMode="numeric" value={l.accepted} onChange={e => set(i, { accepted: e.target.value })} /></div>
          <div><label className="field-label" htmlFor={`rc-j-${i}`}>Rejeté</label><input id={`rc-j-${i}`} inputMode="numeric" value={l.rejected} onChange={e => set(i, { rejected: e.target.value })} /></div></div>
        {!ok && <p className="field-error">Accepté + rejeté doit être égal au reçu.</p>}
        {n(l.received) > missing && <p className="field-error">Dépasse le reliquat ({missing}).</p>}
        {n(l.rejected) > 0 && <div className="mt-2"><label className="field-label" htmlFor={`rc-m-${i}`}>Motif du rejet *</label><input id={`rc-m-${i}`} value={l.rejectReason} onChange={e => set(i, { rejectReason: e.target.value })} /></div>}</fieldset>); })}
    <div><label className="field-label" htmlFor="rc-c">Commentaire</label><textarea id="rc-c" rows={2} value={comment} onChange={e => setComment(e.target.value)} /></div>
    <p className="text-xs text-slate-500">Seules les quantités acceptées seront transmises au futur module Stock.</p>
    <button disabled={busy} className="btn w-full">Enregistrer la réception</button></form>);
}
