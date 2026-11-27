"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Drawer } from "@/components/shared/Drawer";
import { Back, NotFoundCard } from "@/components/shared/ui";
import { Time } from "@/components/shared/Time";
import { UserLabel } from "@/components/shared/UserLabel";
import { useDemoStore } from "@/hooks/demo-store";
import { canSeeRequest } from "@/lib/access-simulation/purchasing-scope";
import { formatDate } from "@/lib/format";
import { requestTotalHT } from "@/services/purchasing/requests.service";
import { ApprovalTimeline } from "./ApprovalTimeline";
import { Money } from "./Money";
import { OrderIssueForm } from "./OrderIssueForm";
import { QuoteForm } from "./QuoteForm";
import { QuotesComparison } from "./QuotesComparison";
import { RequestForm } from "./RequestForm";
import { StatusPill } from "./StatusPill";

export default function RequestDetailView({ id }: { id: string }) {
  const s = useDemoStore(); const me = s.currentUser; const router = useRouter();
  const [panel, setPanel] = useState<"edit" | "quote" | "order" | null>(null), [cancelling, setCancelling] = useState(false), [reason, setReason] = useState("");
  const r = s.purchaseRequests.find(x => x.id === id);
  if (!r || (s.ready && !canSeeRequest(me, r, s))) return s.ready ? <NotFoundCard href="/purchasing/requests" l="Retour aux demandes" /> : <div className="card animate-pulse py-10 text-center text-sm text-slate-500">Chargement…</div>;
  const mine = r.requesterId === me.id, total = requestTotalHT(r);
  const project = s.projects.find(p => p.id === r.projectId), task = s.tasks.find(t => t.id === r.taskId);
  const order = s.purchaseOrders.find(o => o.requestId === r.id && o.status !== "Annulé");
  const selected = s.quotes.find(q => q.id === r.selectedQuoteId && q.status === "Retenu");
  const canCancel = (mine && ["Brouillon", "En validation", "Rejetée"].includes(r.status)) || (s.can("purchase:order") && ["Approuvée", "En consultation", "Validation complémentaire"].includes(r.status));
  const canIssue = s.can("purchase:order") && r.status === "En consultation" && !!selected && (r.approvedAmountHT ?? 0) >= selected.totalHT;

  return (<><Back href="/purchasing/requests" l="Demandes d’achat" />
    <div className="card mb-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0">
      <div className="text-xs text-slate-500">{r.id}{project ? <>, projet <Link className="text-gold-800 hover:underline" href={`/projects/${project.id}`}>{project.name}</Link></> : ", hors projet"}{task && <>, tâche <Link className="text-gold-800 hover:underline" href={`/tasks/${task.id}`}>{task.code}</Link></>}</div>
      <h1 className="text-xl font-semibold sm:text-2xl">{r.title}</h1><p className="mt-1 max-w-prose text-sm text-slate-600">{r.justification}</p></div>
      <div className="flex flex-wrap gap-2"><StatusPill v={r.status} /><StatusPill v={r.urgency} /></div></div>
      <dl className="mt-4 grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
        <div><dt className="text-xs text-slate-500">Demandeur</dt><dd className="mt-1"><UserLabel userId={r.requesterId} /></dd></div>
        <div><dt className="text-xs text-slate-500">Besoin le</dt><dd className="mt-1">{formatDate(r.neededBy)}</dd></div>
        <div><dt className="text-xs text-slate-500">Estimation</dt><dd className="mt-1"><Money value={total} suffix="HT" strong /></dd></div>
        <div><dt className="text-xs text-slate-500">Montant validé</dt><dd className="mt-1">{r.approvedAmountHT !== undefined ? <Money value={r.approvedAmountHT} suffix="HT" /> : "—"}</dd></div></dl>
      {(r.singleSourceReason || r.overrunReason || r.cancelReason) && <div className="mt-3 space-y-1 text-sm">
        {r.singleSourceReason && <p><span className="font-medium">Devis unique :</span> {r.singleSourceReason}</p>}
        {r.overrunReason && <p><span className="font-medium">Dépassement :</span> {r.overrunReason}</p>}
        {r.cancelReason && <p className="text-red-800"><span className="font-medium">Annulation :</span> {r.cancelReason}</p>}</div>}
      <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
        {mine && (r.status === "Brouillon" || r.status === "Rejetée") && <button className="btn-o btn-sm" onClick={() => setPanel("edit")}>{r.status === "Rejetée" ? "Corriger la demande" : "Modifier"}</button>}
        {mine && r.status === "Brouillon" && <button className="btn btn-sm" onClick={() => void s.submitPurchaseRequest(r.id)}>Soumettre à validation</button>}
        {s.can("purchase:quote") && (r.status === "Approuvée" || r.status === "En consultation") && <button className="btn-o btn-sm" onClick={() => setPanel("quote")}>Saisir un devis</button>}
        {canIssue && <button className="btn btn-sm" onClick={() => setPanel("order")}>Émettre le bon de commande</button>}
        {order && <Link className="btn-o btn-sm" href={`/purchasing/orders/${order.id}`}>Voir le bon de commande {order.id}</Link>}
        {canCancel && !cancelling && <button className="btn-o btn-sm text-red-700" onClick={() => setCancelling(true)}>Annuler la demande…</button>}
        {r.status === "Validation complémentaire" && <p className="w-full text-sm text-orange-800">Le devis retenu exige une validation complémentaire avant l’émission du bon de commande.</p>}</div>
      {cancelling && <form className="mt-3 flex flex-col gap-2 sm:flex-row" onSubmit={async e => { e.preventDefault(); if (await s.cancelPurchaseRequest(r.id, reason)) setCancelling(false); }}>
        <input autoFocus value={reason} onChange={e => setReason(e.target.value)} placeholder="Motif de l’annulation (obligatoire)" aria-label="Motif de l’annulation" />
        <div className="flex gap-2"><button className="btn-danger btn-sm">Annuler la demande</button><button type="button" className="btn-o btn-sm" onClick={() => setCancelling(false)}>Retour</button></div></form>}</div>

    <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
      <div className="min-w-0 space-y-4">
        <section className="card"><h2 className="mb-2 text-sm font-semibold">Lignes ({r.lines.length})</h2>
          <div className="-mx-4 overflow-x-auto px-4"><table className="w-full min-w-[30rem] text-sm"><thead><tr className="border-b text-left text-xs text-slate-500"><th className="py-2 font-medium">Désignation</th><th className="py-2 text-right font-medium">Qté</th><th className="py-2 text-right font-medium">PU estimé HT</th><th className="py-2 text-right font-medium">Total HT</th></tr></thead>
            <tbody>{r.lines.map(l => <tr key={l.id} className="border-b last:border-0"><td className="py-2">{l.designation}{l.itemRef && <span className="ml-1 text-xs text-slate-500">({l.itemRef})</span>}</td><td className="py-2 text-right tabular-nums">{l.quantity} {l.unit}</td><td className="py-2 text-right"><Money value={l.estimatedUnitPriceHT} /></td><td className="py-2 text-right"><Money value={l.quantity * l.estimatedUnitPriceHT} /></td></tr>)}</tbody>
            <tfoot><tr><td colSpan={3} className="pt-2 text-right font-medium">Estimation totale</td><td className="pt-2 text-right"><Money value={total} suffix="HT" strong /></td></tr></tfoot></table></div></section>
        <QuotesComparison request={r} />
      </div>
      <div className="space-y-4"><ApprovalTimeline request={r} />
        <section className="card text-xs text-slate-500">Créée <Time iso={r.createdAt} />{r.submittedAt && <>, soumise <Time iso={r.submittedAt} /></>}{r.approvedAt && <>, approuvée <Time iso={r.approvedAt} /></>}.</section></div></div>

    <Drawer open={panel === "edit"} onClose={() => setPanel(null)} title={`Modifier ${r.id}`}>{panel === "edit" && <RequestForm request={r} onDone={() => setPanel(null)} />}</Drawer>
    <Drawer open={panel === "quote"} onClose={() => setPanel(null)} title={`Devis pour ${r.id}`}>{panel === "quote" && <QuoteForm request={r} onDone={() => setPanel(null)} />}</Drawer>
    <Drawer open={panel === "order"} onClose={() => setPanel(null)} title={`Bon de commande pour ${r.id}`}>{panel === "order" && selected && <OrderIssueForm request={r} quote={selected} onDone={oid => { setPanel(null); router.push(`/purchasing/orders/${oid}`); }} />}</Drawer></>);
}
