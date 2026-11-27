"use client";
import { Truck } from "lucide-react";
import { useState } from "react";
import { DataList } from "@/components/shared/DataList";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageTitle } from "@/components/shared/ui";
import { useDemoStore } from "@/hooks/demo-store";
import { todayIso } from "@/lib/clock";
import { canSeeOrder, canSeeOrderAmounts } from "@/lib/access-simulation/purchasing-scope";
import { formatDate } from "@/lib/format";
import { lineProgress } from "@/lib/purchasing/order-progress";
import { Money } from "./Money";
import { StatusPill } from "./StatusPill";

const STATUSES = ["Émis", "Partiellement reçu", "Reçu", "Clôturé", "Annulé"];

export default function OrdersView() {
  const s = useDemoStore(); const [st, setSt] = useState(""), [q, setQ] = useState("");
  const today = todayIso();
  const visible = s.purchaseOrders.filter(o => { const r = s.purchaseRequests.find(x => x.id === o.requestId); return !!r && canSeeOrder(s.currentUser, o, r, s); });
  const rows = visible.filter(o => (!st || o.status === st) && `${o.id} ${s.suppliers.find(x => x.id === o.supplierId)?.name}`.toLowerCase().includes(q.toLowerCase())).sort((a, b) => b.id.localeCompare(a.id));
  const pct = (id: string) => { const o = s.purchaseOrders.find(x => x.id === id)!; const p = lineProgress(o, s.receipts, []); const ordered = p.reduce((t, l) => t + l.ordered - l.cancelled, 0); return ordered ? Math.round((p.reduce((t, l) => t + l.accepted, 0) / ordered) * 100) : 0; };
  return (<><PageTitle t="Bons de commande" s={`${visible.filter(o => o.status === "Émis" || o.status === "Partiellement reçu").length} commande(s) en attente de livraison`} />
    <div className="mb-4 grid gap-2 sm:grid-cols-2"><input placeholder="N° ou fournisseur" aria-label="Rechercher une commande" value={q} onChange={e => setQ(e.target.value)} />
      <select aria-label="Statut" value={st} onChange={e => setSt(e.target.value)}><option value="">Tous les statuts</option>{STATUSES.map(x => <option key={x}>{x}</option>)}</select></div>
    {rows.length ? <DataList rows={rows} href={o => `/purchasing/orders/${o.id}`} cols={[
      { h: "Commande", r: o => <span><b>{o.id}</b><span className="block text-xs font-normal text-slate-500">{s.purchaseRequests.find(r => r.id === o.requestId)?.title}</span></span> },
      { h: "Statut", r: o => <StatusPill v={o.status} /> },
      { h: "Fournisseur", r: o => s.suppliers.find(x => x.id === o.supplierId)?.name },
      { h: "Montant", r: o => { const r = s.purchaseRequests.find(x => x.id === o.requestId); return r && canSeeOrderAmounts(s.currentUser, r, s) ? <Money value={o.totalTTC} suffix="TTC" /> : <span className="text-slate-400">—</span>; } },
      { h: "Livraison prévue", r: o => <span className={(o.status === "Émis" || o.status === "Partiellement reçu") && o.expectedDelivery < today ? "font-medium text-red-700" : ""}>{formatDate(o.expectedDelivery)}</span> },
      { h: "Reçu", r: o => `${pct(o.id)} %` }]} />
      : <div className="card"><EmptyState icon={Truck} title="Aucun bon de commande visible" text="Les commandes liées à vos demandes d’achat apparaîtront ici." /></div>}</>);
}
