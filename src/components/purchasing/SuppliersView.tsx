"use client";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Can } from "@/components/shared/Can";
import { DataList } from "@/components/shared/DataList";
import { Drawer } from "@/components/shared/Drawer";
import { PageTitle } from "@/components/shared/ui";
import { useDemoStore } from "@/hooks/demo-store";
import { supplierStats } from "@/services/purchasing/reports";
import { Money } from "./Money";
import { StatusPill } from "./StatusPill";
import { SupplierForm } from "./SupplierForm";

export default function SuppliersView() {
  const s = useDemoStore(); const router = useRouter();
  const [q, setQ] = useState(""), [cat, setCat] = useState(""), [st, setSt] = useState(""), [creating, setCreating] = useState(false);
  const cats = [...new Set(s.suppliers.map(x => x.category))].sort();
  const rows = s.suppliers.filter(x => (!cat || x.category === cat) && (!st || x.status === st) && `${x.name} ${x.city} ${x.contactName}`.toLowerCase().includes(q.toLowerCase()));
  return (<><PageTitle t="Fournisseurs" s={`${s.suppliers.filter(x => x.status === "Actif").length} actifs sur ${s.suppliers.length}`}>
    <Can perm="supplier:manage"><button className="btn w-full sm:w-auto" onClick={() => setCreating(true)}><Plus size={16} aria-hidden />Nouveau fournisseur</button></Can></PageTitle>
    <div className="mb-4 grid gap-2 sm:grid-cols-3"><input placeholder="Nom, ville ou contact" aria-label="Rechercher un fournisseur" value={q} onChange={e => setQ(e.target.value)} />
      <select aria-label="Catégorie" value={cat} onChange={e => setCat(e.target.value)}><option value="">Toutes les catégories</option>{cats.map(c => <option key={c}>{c}</option>)}</select>
      <select aria-label="Statut" value={st} onChange={e => setSt(e.target.value)}><option value="">Tous les statuts</option><option>Actif</option><option>Suspendu</option></select></div>
    <DataList rows={rows} href={x => `/purchasing/suppliers/${x.id}`} cols={[
      { h: "Fournisseur", r: x => <span><b>{x.name}</b><span className="block text-xs font-normal text-slate-500">{x.category}</span></span> },
      { h: "Statut", r: x => <StatusPill v={x.status} /> },
      { h: "Ville", r: x => x.city },
      { h: "Contact", r: x => <span>{x.contactName}<span className="block text-xs text-slate-500">{x.phone}</span></span> },
      { h: "Commandé", r: x => <Money value={supplierStats(x.id, s.purchaseOrders, s.receipts, s.invoices).orderedHT} suffix="HT" /> },
      { h: "Paiement", r: x => `${x.paymentTermsDays} j` }]} />
    <Drawer open={creating} onClose={() => setCreating(false)} title="Nouveau fournisseur"><SupplierForm onDone={id => { setCreating(false); router.push(`/purchasing/suppliers/${id}`); }} /></Drawer></>);
}
