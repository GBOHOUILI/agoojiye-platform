"use client";
import { Receipt } from "lucide-react";
import { useState } from "react";
import { DataList } from "@/components/shared/DataList";
import { EmptyState } from "@/components/shared/EmptyState";
import { StatCard } from "@/components/shared/StatCard";
import { PageTitle } from "@/components/shared/ui";
import { useDemoStore } from "@/hooks/demo-store";
import { formatDate } from "@/lib/format";
import { formatFCFA } from "@/lib/purchasing/money";
import { Money } from "./Money";
import { StatusPill } from "./StatusPill";

const STATUSES = ["Enregistrée", "Conforme", "En litige", "Transmise à la Finance", "Annulée"];

export default function InvoicesView() {
  const s = useDemoStore(); const [st, setSt] = useState("");
  const rows = s.invoices.filter(i => !st || i.status === st).sort((a, b) => b.id.localeCompare(a.id));
  const sum = (status: string) => s.invoices.filter(i => i.status === status).reduce((t, i) => t + i.totalTTC, 0);
  return (<><PageTitle t="Factures fournisseurs" s="Rapprochement avec les commandes et les réceptions, puis transmission à la Finance" />
    <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
      <StatCard label="À transmettre" value={s.invoices.filter(i => i.status === "Conforme").length} hint={`${formatFCFA(sum("Conforme"))} TTC`} />
      <StatCard label="En litige" value={s.invoices.filter(i => i.status === "En litige").length} hint={`${formatFCFA(sum("En litige"))} TTC`} tone={s.invoices.some(i => i.status === "En litige") ? "danger" : "default"} />
      <StatCard label="Transmises à la Finance" value={s.invoices.filter(i => i.status === "Transmise à la Finance").length} hint={`${formatFCFA(sum("Transmise à la Finance"))} TTC`} />
      <StatCard label="Annulées" value={s.invoices.filter(i => i.status === "Annulée").length} /></div>
    <div className="mb-4 max-w-xs"><select aria-label="Statut" value={st} onChange={e => setSt(e.target.value)}><option value="">Tous les statuts</option>{STATUSES.map(x => <option key={x}>{x}</option>)}</select></div>
    {rows.length ? <DataList rows={rows} href={i => `/purchasing/orders/${i.orderId}`} cols={[
      { h: "Facture", r: i => <span><b>{i.id}</b><span className="block text-xs font-normal text-slate-500">n° {i.supplierInvoiceNo}, BC {i.orderId}</span></span> },
      { h: "Statut", r: i => <StatusPill v={i.status} /> },
      { h: "Fournisseur", r: i => s.suppliers.find(x => x.id === i.supplierId)?.name },
      { h: "HT", r: i => <Money value={i.totalHT} /> },
      { h: "TTC", r: i => <Money value={i.totalTTC} /> },
      { h: "Échéance", r: i => formatDate(i.dueDate) }]} />
      : <div className="card"><EmptyState icon={Receipt} title="Aucune facture" /></div>}</>);
}
