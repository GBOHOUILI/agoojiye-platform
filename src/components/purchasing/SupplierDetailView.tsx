"use client";
import Link from "next/link";
import { useState } from "react";
import { Can } from "@/components/shared/Can";
import { Drawer } from "@/components/shared/Drawer";
import { StatCard } from "@/components/shared/StatCard";
import { Back, NotFoundCard } from "@/components/shared/ui";
import { useDemoStore } from "@/hooks/demo-store";
import { formatFCFA } from "@/lib/purchasing/money";
import { supplierStats } from "@/services/purchasing/reports";
import { Money } from "./Money";
import { StatusPill } from "./StatusPill";
import { SupplierForm } from "./SupplierForm";

export default function SupplierDetailView({ id }: { id: string }) {
  const s = useDemoStore(); const [editing, setEditing] = useState(false);
  const sup = s.suppliers.find(x => x.id === id);
  if (!sup) return s.ready ? <NotFoundCard href="/purchasing/suppliers" l="Retour aux fournisseurs" /> : <div className="card animate-pulse py-10 text-center text-sm text-slate-500">Chargement…</div>;
  const st = supplierStats(sup.id, s.purchaseOrders, s.receipts, s.invoices);
  const quotes = s.quotes.filter(q => q.supplierId === sup.id), orders = s.purchaseOrders.filter(o => o.supplierId === sup.id);
  const toggle = () => {
    const next = sup.status === "Actif" ? "Suspendu" : "Actif";
    if (window.confirm(next === "Suspendu" ? `Suspendre ${sup.name} ? Aucun devis ni bon de commande ne pourra plus lui être adressé.` : `Réactiver ${sup.name} ?`)) void s.updateSupplier(sup.id, { status: next });
  };
  return (<><Back href="/purchasing/suppliers" l="Fournisseurs" />
    <div className="card mb-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="text-xs text-slate-500">{sup.id}, {sup.category}</div>
      <h1 className="text-xl font-semibold sm:text-2xl">{sup.name}</h1><p className="text-sm text-slate-600">{sup.address}, {sup.city}</p></div>
      <div className="flex flex-wrap items-center gap-2"><StatusPill v={sup.status} />
        <Can perm="supplier:manage"><button className="btn-o btn-sm" onClick={() => setEditing(true)}>Modifier</button>
          <button className={`btn-o btn-sm ${sup.status === "Actif" ? "text-red-700" : ""}`} onClick={toggle}>{sup.status === "Actif" ? "Suspendre" : "Réactiver"}</button></Can></div></div>
      <dl className="mt-4 grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
        <div><dt className="text-xs text-slate-500">Contact</dt><dd>{sup.contactName}</dd></div>
        <div><dt className="text-xs text-slate-500">Téléphone</dt><dd><a className="hover:text-gold-800" href={`tel:${sup.phone.replace(/\s/g, "")}`}>{sup.phone}</a></dd></div>
        <div className="min-w-0"><dt className="text-xs text-slate-500">E-mail</dt><dd className="truncate"><a className="hover:text-gold-800" href={`mailto:${sup.email}`}>{sup.email}</a></dd></div>
        <div><dt className="text-xs text-slate-500">IFU, RCCM</dt><dd className="text-xs">{sup.taxId}<br />{sup.rccm}</dd></div></dl></div>
    <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
      <StatCard label="Montant commandé" value={formatFCFA(st.orderedHT)} hint={`${st.orders} bon(s) de commande, HT`} />
      <StatCard label="Livraisons à l’heure" value={st.onTimeRate === null ? "—" : `${st.onTimeRate} %`} />
      <StatCard label="Non-conformité" value={st.nonConformityRate === null ? "—" : `${st.nonConformityRate.toFixed(1).replace(".", ",")} %`} tone={st.nonConformityRate ? "warn" : "default"} />
      <StatCard label="Factures en litige" value={st.openDisputes} tone={st.openDisputes ? "danger" : "default"} />
    </div>
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="card"><h2 className="mb-2 text-sm font-semibold">Bons de commande</h2>
        {orders.length ? orders.map(o => <Link key={o.id} href={`/purchasing/orders/${o.id}`} className="flex items-center justify-between gap-2 border-b py-2.5 text-sm last:border-0 hover:bg-slate-50"><span>{o.id}<span className="block text-xs text-slate-500">{s.purchaseRequests.find(r => r.id === o.requestId)?.title}</span></span><span className="text-right"><Money value={o.totalTTC} suffix="TTC" /><span className="mt-0.5 block"><StatusPill v={o.status} /></span></span></Link>)
          : <p className="text-sm text-slate-500">Aucun bon de commande.</p>}</section>
      <section className="card"><h2 className="mb-2 text-sm font-semibold">Devis</h2>
        {quotes.length ? quotes.map(q => <Link key={q.id} href={`/purchasing/requests/${q.requestId}`} className="flex items-center justify-between gap-2 border-b py-2.5 text-sm last:border-0 hover:bg-slate-50"><span>{q.id} pour {q.requestId}<span className="block text-xs text-slate-500">Réf. {q.supplierRef}, {q.deliveryDays} j</span></span><span className="text-right"><Money value={q.totalHT} suffix="HT" /><span className="mt-0.5 block"><StatusPill v={q.status} quote /></span></span></Link>)
          : <p className="text-sm text-slate-500">Aucun devis.</p>}</section></div>
    <Drawer open={editing} onClose={() => setEditing(false)} title={`Modifier ${sup.name}`}>{editing && <SupplierForm supplier={sup} onDone={() => setEditing(false)} />}</Drawer></>);
}
