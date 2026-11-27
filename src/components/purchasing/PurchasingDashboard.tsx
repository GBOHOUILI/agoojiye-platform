"use client";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatCard } from "@/components/shared/StatCard";
import { PageTitle } from "@/components/shared/ui";
import { Block } from "@/components/space/Block";
import { useDemoStore } from "@/hooks/demo-store";
import { todayIso } from "@/lib/clock";
import { formatDate } from "@/lib/format";
import { formatFCFA } from "@/lib/purchasing/money";
import { committedHT } from "@/services/purchasing/reports";
import { requestTotalHT } from "@/services/purchasing/requests.service";
import { Money } from "./Money";
import { StatusPill } from "./StatusPill";

export default function PurchasingDashboard() {
  const s = useDemoStore(); const today = todayIso();
  const inApproval = s.purchaseRequests.filter(r => r.status === "En validation" || r.status === "Validation complémentaire");
  const toHandle = s.purchaseRequests.filter(r => r.status === "Approuvée" || r.status === "En consultation");
  const openOrders = s.purchaseOrders.filter(o => o.status === "Émis" || o.status === "Partiellement reçu").sort((a, b) => a.expectedDelivery.localeCompare(b.expectedDelivery));
  const late = openOrders.filter(o => o.expectedDelivery < today);
  const disputes = s.invoices.filter(i => i.status === "En litige"), toTransmit = s.invoices.filter(i => i.status === "Conforme");
  const committed = s.purchaseOrders.filter(o => o.status !== "Annulé").reduce((t, o) => t + committedHT(o), 0);
  const nonConf = s.receipts.filter(r => r.lines.some(l => l.rejected > 0)).sort((a, b) => b.receivedAt.localeCompare(a.receivedAt)).slice(0, 5);
  return (<><PageTitle t="Tableau de bord achats" s="Demandes, commandes, livraisons et factures en un coup d’œil" />
    <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
      <StatCard label="Montant engagé" value={formatFCFA(committed)} hint="Bons de commande non annulés, HT" />
      <StatCard label="Demandes en validation" value={inApproval.length} href="/purchasing/requests" />
      <StatCard label="Livraisons en retard" value={late.length} hint={`${openOrders.length} commande(s) en cours`} tone={late.length ? "danger" : "default"} href="/purchasing/orders" />
      <StatCard label="Factures en litige" value={disputes.length} hint={`${toTransmit.length} à transmettre`} tone={disputes.length ? "warn" : "default"} href="/purchasing/invoices" /></div>
    <div className="grid gap-4 lg:grid-cols-2">
      <Block title="Demandes à traiter par les Achats" href="/purchasing/requests">
        {toHandle.length ? toHandle.map(r => <Link key={r.id} href={`/purchasing/requests/${r.id}`} className="flex items-center justify-between gap-2 border-b py-2.5 text-sm last:border-0 hover:bg-slate-50">
          <span className="min-w-0"><span className="block truncate font-medium">{r.title}</span><span className="text-xs text-slate-500">{r.id}, {s.quotes.filter(q => q.requestId === r.id).length} devis, besoin le {formatDate(r.neededBy)}</span></span>
          <span className="text-right"><Money value={r.approvedAmountHT ?? requestTotalHT(r)} suffix="HT" /><span className="mt-0.5 block"><StatusPill v={r.status} /></span></span></Link>)
          : <EmptyState icon={CheckCircle2} title="Aucune demande en attente des Achats" />}</Block>
      <Block title="Livraisons attendues" href="/purchasing/orders">
        {openOrders.length ? openOrders.map(o => <Link key={o.id} href={`/purchasing/orders/${o.id}`} className="flex items-center justify-between gap-2 border-b py-2.5 text-sm last:border-0 hover:bg-slate-50">
          <span className="min-w-0"><span className="block font-medium">{o.id}</span><span className="block truncate text-xs text-slate-500">{s.suppliers.find(x => x.id === o.supplierId)?.name}</span></span>
          <span className={`text-right text-xs ${o.expectedDelivery < today ? "font-medium text-red-700" : "text-slate-600"}`}>{formatDate(o.expectedDelivery)}<span className="mt-0.5 block"><StatusPill v={o.status} /></span></span></Link>)
          : <EmptyState icon={CheckCircle2} title="Aucune livraison en attente" />}</Block>
      <Block title="Factures à traiter" href="/purchasing/invoices">
        {[...disputes, ...toTransmit].length ? [...disputes, ...toTransmit].map(i => <Link key={i.id} href={`/purchasing/orders/${i.orderId}`} className="flex items-center justify-between gap-2 border-b py-2.5 text-sm last:border-0 hover:bg-slate-50">
          <span className="min-w-0"><span className="block font-medium">{i.id}, n° {i.supplierInvoiceNo}</span><span className="block truncate text-xs text-slate-500">{i.issues[0] ?? "Rapprochement conforme, prête à transmettre"}</span></span>
          <span className="text-right"><Money value={i.totalTTC} suffix="TTC" /><span className="mt-0.5 block"><StatusPill v={i.status} /></span></span></Link>)
          : <EmptyState icon={CheckCircle2} title="Aucune facture en attente" />}</Block>
      <Block title="Non-conformités récentes">
        {nonConf.length ? nonConf.map(r => <Link key={r.id} href={`/purchasing/orders/${r.orderId}`} className="block border-b py-2.5 text-sm last:border-0 hover:bg-slate-50"><span className="font-medium">{r.orderId}</span>, réception {r.id}
          <span className="block text-xs text-red-700">{r.lines.filter(l => l.rejected).map(l => `${l.rejected} rejeté(s) : ${l.rejectReason}`).join(" ; ")}</span></Link>)
          : <EmptyState icon={CheckCircle2} title="Aucune non-conformité" />}</Block></div></>);
}
