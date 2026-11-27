"use client";
import Link from "next/link";
import { useState } from "react";
import { Drawer } from "@/components/shared/Drawer";
import { Time } from "@/components/shared/Time";
import { Back, NotFoundCard } from "@/components/shared/ui";
import { UserLabel } from "@/components/shared/UserLabel";
import { useDemoStore } from "@/hooks/demo-store";
import { todayIso } from "@/lib/clock";
import { canSeeOrder, canSeeOrderAmounts, canSeeRequest } from "@/lib/access-simulation/purchasing-scope";
import { formatDate } from "@/lib/format";
import { formatRate } from "@/lib/purchasing/money";
import { closeBlockers, lineProgress } from "@/lib/purchasing/order-progress";
import type { SupplierInvoice } from "@/types";
import { InvoiceForm } from "./InvoiceForm";
import { Money } from "./Money";
import { ReceiptForm } from "./ReceiptForm";
import { StatusPill } from "./StatusPill";

export default function OrderDetailView({ id }: { id: string }) {
  const s = useDemoStore();
  const [panel, setPanel] = useState<"receipt" | "invoice" | null>(null), [editing, setEditing] = useState<SupplierInvoice | null>(null);
  const [reasonFor, setReasonFor] = useState<"cancel" | "close" | string | null>(null), [reason, setReason] = useState("");
  const o = s.purchaseOrders.find(x => x.id === id);
  const r = o && s.purchaseRequests.find(x => x.id === o.requestId);
  if (!o || !r || (s.ready && !canSeeOrder(s.currentUser, o, r, s))) return s.ready ? <NotFoundCard href="/purchasing/orders" l="Retour aux commandes" /> : <div className="card animate-pulse py-10 text-center text-sm text-slate-500">Chargement…</div>;
  const supplier = s.suppliers.find(x => x.id === o.supplierId);
  // Receive-only profiles see quantities to receive, not prices nor invoices.
  const amounts = canSeeOrderAmounts(s.currentUser, r, s);
  const receipts = s.receipts.filter(x => x.orderId === o.id), invoices = s.invoices.filter(x => x.orderId === o.id);
  const progress = lineProgress(o, s.receipts, s.invoices);
  const open = o.status === "Émis" || o.status === "Partiellement reçu";
  const blockers = closeBlockers(o, s.receipts, s.invoices);
  const toInvoice = progress.some(p => p.accepted > p.invoiced);
  const late = open && o.expectedDelivery < todayIso();

  const confirm = async () => {
    if (!reasonFor) return;
    const ok = reasonFor === "cancel" ? await s.cancelOrder(o.id, reason) : reasonFor === "close" ? await s.closeOrder(o.id, reason) : await s.cancelInvoice(reasonFor, reason);
    if (ok) { setReasonFor(null); setReason(""); }
  };

  return (<><Back href="/purchasing/orders" l="Commandes" />
    <div className="card mb-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0">
      <div className="text-xs text-slate-500">Demande {canSeeRequest(s.currentUser, r, s) ? <Link className="text-gold-800 hover:underline" href={`/purchasing/requests/${r.id}`}>{r.id}</Link> : r.id}{o.projectId && <>, projet <Link className="text-gold-800 hover:underline" href={`/projects/${o.projectId}`}>{o.projectId}</Link></>}</div>
      <h1 className="text-xl font-semibold sm:text-2xl">Bon de commande {o.id}</h1>
      <p className="text-sm text-slate-600">{r.title} — {s.can("purchase:read_all") ? <Link className="hover:text-gold-800" href={`/purchasing/suppliers/${o.supplierId}`}>{supplier?.name}</Link> : supplier?.name}</p></div>
      <StatusPill v={o.status} /></div>
      <dl className="mt-4 grid grid-cols-2 gap-4 text-sm md:grid-cols-5">
        {amounts && <><div><dt className="text-xs text-slate-500">Total HT</dt><dd className="mt-1"><Money value={o.totalHT} strong /></dd></div>
        <div><dt className="text-xs text-slate-500">TVA {formatRate(o.vatRateBp)}</dt><dd className="mt-1"><Money value={o.totalVAT} /></dd></div>
        <div><dt className="text-xs text-slate-500">Total TTC</dt><dd className="mt-1"><Money value={o.totalTTC} /></dd></div></>}
        <div><dt className="text-xs text-slate-500">Livraison prévue</dt><dd className={`mt-1 ${late ? "font-medium text-red-700" : ""}`}>{formatDate(o.expectedDelivery)}{late && " (en retard)"}</dd></div>
        <div><dt className="text-xs text-slate-500">Émis par</dt><dd className="mt-1"><UserLabel userId={o.issuedById} /></dd></div></dl>
      <p className="mt-2 text-xs text-slate-500">Livraison : {o.deliveryAddress}. Émis <Time iso={o.issuedAt} />{o.closedAt && <>, clôturé <Time iso={o.closedAt} /></>}.</p>
      {o.closeReason && <p className="mt-1 text-sm">Clôture : « {o.closeReason} »</p>}{o.cancelReason && <p className="mt-1 text-sm text-red-800">Annulation : « {o.cancelReason} »</p>}

      <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
        {s.can("purchase:receive") && open && <button className="btn btn-sm" onClick={() => setPanel("receipt")}>Réceptionner une livraison</button>}
        {s.can("purchase:invoice") && toInvoice && o.status !== "Annulé" && o.status !== "Clôturé" && <button className="btn-o btn-sm" onClick={() => setPanel("invoice")}>Saisir une facture</button>}
        {s.can("purchase:order") && o.status === "Émis" && !receipts.length && <button className="btn-o btn-sm text-red-700" onClick={() => setReasonFor("cancel")}>Annuler le bon de commande…</button>}
        {s.can("purchase:order") && o.status !== "Clôturé" && o.status !== "Annulé" && (blockers.length
          ? <span className="w-full text-xs text-slate-500">Clôture avec solde impossible pour l’instant : {blockers.join(" ")}</span>
          : <button className="btn-o btn-sm" onClick={() => setReasonFor("close")}>Clôturer avec solde…</button>)}</div>
      {reasonFor && <form className="mt-3 flex flex-col gap-2 sm:flex-row" onSubmit={e => { e.preventDefault(); void confirm(); }}>
        <input autoFocus value={reason} onChange={e => setReason(e.target.value)} aria-label="Motif" placeholder={reasonFor === "close" ? "Motif de la clôture (reliquat abandonné)" : "Motif de l’annulation"} />
        <div className="flex gap-2"><button className="btn-danger btn-sm">Confirmer</button><button type="button" className="btn-o btn-sm" onClick={() => setReasonFor(null)}>Retour</button></div></form>}</div>

    <section className="card mb-4"><h2 className="mb-2 text-sm font-semibold">Avancement par ligne</h2>
      <div className="-mx-4 overflow-x-auto px-4"><table className="w-full min-w-[44rem] text-sm"><thead><tr className="border-b text-right text-xs text-slate-500"><th className="py-2 text-left font-medium">Désignation</th>{amounts && <th className="py-2 font-medium">PU HT</th>}<th className="py-2 font-medium">Commandé</th><th className="py-2 font-medium">Annulé</th><th className="py-2 font-medium">Reçu</th><th className="py-2 font-medium">Accepté</th><th className="py-2 font-medium">Rejeté</th><th className="py-2 font-medium">Manquant</th><th className="py-2 font-medium">Facturé</th></tr></thead>
        <tbody>{o.lines.map(l => { const p = progress.find(x => x.orderLineId === l.id)!; return <tr key={l.id} className="border-b text-right tabular-nums last:border-0">
          <td className="py-2 text-left">{l.designation}{l.itemRef && <span className="ml-1 text-xs text-slate-500">({l.itemRef})</span>}</td>{amounts && <td className="py-2"><Money value={l.unitPriceHT} /></td>}<td className="py-2">{p.ordered}</td><td className="py-2">{p.cancelled || "—"}</td><td className="py-2">{p.received}</td>
          <td className="py-2 text-emerald-700">{p.accepted}</td><td className={`py-2 ${p.rejected ? "text-red-700" : ""}`}>{p.rejected}</td><td className={`py-2 ${p.missing ? "font-medium text-orange-700" : ""}`}>{p.missing}</td><td className="py-2">{p.invoiced}</td></tr>; })}</tbody></table></div></section>

    <div className="grid gap-4 lg:grid-cols-2">
      <section className="card"><h2 className="mb-2 text-sm font-semibold">Réceptions ({receipts.length})</h2>
        {receipts.length ? receipts.map(rc => <div key={rc.id} className="border-b py-2.5 text-sm last:border-0">
          <div className="flex justify-between gap-2"><span className="font-medium">{rc.id}, BL {rc.deliveryNoteRef}</span><span className="text-xs text-slate-500"><Time iso={rc.receivedAt} /></span></div>
          <div className="text-xs text-slate-500">par {s.users.find(u => u.id === rc.receivedById)?.firstName} {s.users.find(u => u.id === rc.receivedById)?.lastName}</div>
          <ul className="mt-1 text-xs">{rc.lines.filter(l => l.received).map(l => <li key={l.orderLineId}>{o.lines.find(x => x.id === l.orderLineId)?.designation} : {l.accepted} accepté(s){l.rejected ? <span className="text-red-700">, {l.rejected} rejeté(s) — {l.rejectReason}</span> : ""}</li>)}</ul></div>)
          : <p className="text-sm text-slate-500">Aucune livraison réceptionnée.</p>}</section>
      {amounts && <section className="card"><h2 className="mb-2 text-sm font-semibold">Factures ({invoices.length})</h2>
        {invoices.length ? invoices.map(i => <div key={i.id} className="border-b py-2.5 text-sm last:border-0">
          <div className="flex flex-wrap items-center justify-between gap-2"><span className="font-medium">{i.id}, n° {i.supplierInvoiceNo}</span><StatusPill v={i.status} /></div>
          <div className="mt-1 flex flex-wrap justify-between gap-2 text-xs text-slate-500"><span>du {formatDate(i.invoiceDate)}, échéance {formatDate(i.dueDate)}</span><span><Money value={i.totalHT} suffix="HT" /> · <Money value={i.totalTTC} suffix="TTC" /></span></div>
          {i.issues.length > 0 && i.status === "En litige" && <ul className="mt-1 list-disc pl-4 text-xs text-red-800">{i.issues.map(x => <li key={x}>{x}</li>)}</ul>}
          {i.cancelReason && <p className="mt-1 text-xs text-slate-500">Annulée : « {i.cancelReason} »</p>}
          {s.can("purchase:invoice") && (i.status === "Conforme" || i.status === "En litige" || i.status === "Enregistrée") && <div className="mt-2 flex flex-wrap gap-2">
            {i.status === "Conforme" && <button className="btn btn-sm" onClick={() => void s.transmitInvoice(i.id)}>Transmettre à la Finance</button>}
            <button className="btn-o btn-sm" onClick={() => setEditing(i)}>Corriger</button>
            <button className="btn-o btn-sm text-red-700" onClick={() => setReasonFor(i.id)}>Annuler…</button></div>}</div>)
          : <p className="text-sm text-slate-500">Aucune facture.</p>}</section>}</div>

    <Drawer open={panel === "receipt"} onClose={() => setPanel(null)} title={`Réception sur ${o.id}`}>{panel === "receipt" && <ReceiptForm order={o} onDone={() => setPanel(null)} />}</Drawer>
    <Drawer open={panel === "invoice" || !!editing} onClose={() => { setPanel(null); setEditing(null); }} title={editing ? `Corriger ${editing.id}` : `Facture sur ${o.id}`}>
      {(panel === "invoice" || editing) && <InvoiceForm key={editing?.id ?? "new"} order={o} invoice={editing ?? undefined} onDone={() => { setPanel(null); setEditing(null); }} />}</Drawer></>);
}
