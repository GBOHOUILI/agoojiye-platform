"use client";
import Link from "next/link";
import { useDemoStore } from "@/hooks/demo-store";
import { canSeeRequest } from "@/lib/access-simulation/purchasing-scope";
import { committedHT } from "@/services/purchasing/reports";
import { requestTotalHT } from "@/services/purchasing/requests.service";
import { Money } from "./Money";
import { StatusPill } from "./StatusPill";

/** Purchases attached to a project or a task. The committed total is an aggregate; details follow request visibility. */
export function LinkedPurchases({ projectId, taskId }: { projectId?: string; taskId?: string }) {
  const s = useDemoStore();
  const all = s.purchaseRequests.filter(r => (taskId ? r.taskId === taskId : r.projectId === projectId) && r.status !== "Annulée");
  const visible = all.filter(r => canSeeRequest(s.currentUser, r, s));
  const orders = s.purchaseOrders.filter(o => o.status !== "Annulé" && all.some(r => r.id === o.requestId));
  const committed = orders.reduce((t, o) => t + committedHT(o), 0);
  return (<section className="card"><div className="mb-2 flex flex-wrap items-baseline justify-between gap-2"><h2 className="text-sm font-semibold">Achats {taskId ? "liés à la tâche" : "du projet"}</h2>
    <span className="text-sm">Engagé : <Money value={committed} suffix="HT" strong /></span></div>
    {visible.length ? visible.map(r => { const o = orders.find(x => x.requestId === r.id); return (
      <Link key={r.id} href={`/purchasing/requests/${r.id}`} className="flex items-center justify-between gap-2 border-b py-2.5 text-sm last:border-0 hover:bg-slate-50">
        <span className="min-w-0"><span className="block truncate font-medium">{r.title}</span><span className="text-xs text-slate-500">{r.id}{o ? `, ${o.id}` : ""}</span></span>
        <span className="text-right"><Money value={o?.totalHT ?? r.approvedAmountHT ?? requestTotalHT(r)} suffix="HT" /><span className="mt-0.5 block"><StatusPill v={r.status} /></span></span></Link>); })
      : <p className="text-sm text-slate-500">{all.length ? `${all.length} demande(s) d’achat, non visibles pour ce profil.` : "Aucune demande d’achat."}</p>}
    {s.can("purchase:request") && <Link href="/purchasing/requests?new=1" className="btn-o btn-sm mt-3">Nouvelle demande d’achat</Link>}</section>);
}
