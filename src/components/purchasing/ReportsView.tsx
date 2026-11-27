"use client";
import { Download } from "lucide-react";
import { StatCard } from "@/components/shared/StatCard";
import { PageTitle } from "@/components/shared/ui";
import { useDemoStore } from "@/hooks/demo-store";
import { formatFCFA } from "@/lib/purchasing/money";
import { committedHT, cycleTimeDays, nonConformityRate, spendByMonth, spendByProject, spendBySupplier, toCsv } from "@/services/purchasing/reports";
import { Money } from "./Money";

function download(name: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}

function Bars({ rows }: { rows: { label: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map(r => r.value));
  return (<ul className="space-y-2">{rows.map(r => <li key={r.label} className="text-sm"><div className="flex justify-between gap-2"><span className="truncate">{r.label}</span><Money value={r.value} suffix="HT" /></div>
    <div className="mt-1 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-gold-500" style={{ width: `${(r.value / max) * 100}%` }} /></div></li>)}</ul>);
}

export default function ReportsView() {
  const s = useDemoStore();
  const byProject = spendByProject(s.purchaseOrders).map(r => ({ label: r.projectId ? `${r.projectId} ${s.projects.find(p => p.id === r.projectId)?.name ?? ""}` : "Hors projet", value: r.totalHT })).sort((a, b) => b.value - a.value);
  const bySupplier = spendBySupplier(s.purchaseOrders).map(r => ({ label: s.suppliers.find(x => x.id === r.supplierId)?.name ?? r.supplierId, value: r.totalHT }));
  const byMonth = spendByMonth(s.purchaseOrders).map(r => ({ label: r.month.split("-").reverse().join("/"), value: r.totalHT }));
  const cycle = cycleTimeDays(s.purchaseRequests, s.purchaseOrders), nc = nonConformityRate(s.receipts);
  const total = byProject.reduce((t, r) => t + r.value, 0);
  const ordersCsv = () => toCsv(s.purchaseOrders.map(o => ({ "Bon de commande": o.id, Statut: o.status, Demande: o.requestId, Projet: o.projectId ?? "", Fournisseur: s.suppliers.find(x => x.id === o.supplierId)?.name ?? "", "Émis le": o.issuedAt.slice(0, 10), "Total HT": o.totalHT, "TVA (%)": o.vatRateBp / 100, TVA: o.totalVAT, "Total TTC": o.totalTTC, "Engagé HT": o.status === "Annulé" ? 0 : committedHT(o) })));
  return (<><PageTitle t="Rapports achats" s="Montants HT engagés, nets des reliquats abandonnés et hors commandes annulées">
    <div className="flex w-full flex-wrap gap-2 sm:w-auto"><button className="btn-o btn-sm" onClick={() => download("bons-de-commande.csv", ordersCsv())}><Download size={14} aria-hidden />Bons de commande (CSV)</button>
      <button className="btn-o btn-sm" onClick={() => download("depenses-par-fournisseur.csv", toCsv(bySupplier.map(r => ({ Fournisseur: r.label, "Engagé HT": r.value }))))}><Download size={14} aria-hidden />Par fournisseur (CSV)</button></div></PageTitle>
    <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Total engagé" value={formatFCFA(total)} hint="HT" />
      <StatCard label="Délai médian demande → commande" value={cycle === null ? "—" : `${cycle} j`} />
      <StatCard label="Taux de non-conformité" value={nc === null ? "—" : `${nc.toFixed(1).replace(".", ",")} %`} hint="Quantités rejetées / reçues" />
      <StatCard label="Fournisseurs actifs" value={s.suppliers.filter(x => x.status === "Actif").length} /></div>
    <div className="grid gap-4 lg:grid-cols-3">
      <section className="card min-w-0"><h2 className="mb-3 text-sm font-semibold">Par projet</h2><Bars rows={byProject} /></section>
      <section className="card min-w-0"><h2 className="mb-3 text-sm font-semibold">Par fournisseur</h2><Bars rows={bySupplier} /></section>
      <section className="card min-w-0"><h2 className="mb-3 text-sm font-semibold">Par mois d’émission</h2><Bars rows={byMonth} /></section></div></>);
}
