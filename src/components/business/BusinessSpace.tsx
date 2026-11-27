"use client";
import { Construction } from "lucide-react";
import { PageTitle } from "@/components/shared/ui";
import { FinanceKpis, HrKpis, ProjectsAtRisk } from "@/components/space/blocks";
import { Money } from "@/components/purchasing/Money";
import { spendByProject } from "@/services/purchasing/reports";
import { Block } from "@/components/space/Block";
import { UserLabel } from "@/components/shared/UserLabel";
import { useDemoStore } from "@/hooks/demo-store";

type Kind = "hr" | "finance";
const META: Record<Kind, { title: string; intro: string; planned: string[] }> = {
  hr: { title: "Ressources humaines", intro: "Indicateurs calculés à partir de l’organisation partagée.", planned: ["Dossiers collaborateurs et contrats", "Congés et absences, avec impact sur la charge des équipes", "Plan de formation et habilitations techniques"] },
  finance: { title: "Finance", intro: "Lecture des projets sous l’angle des échéances et des priorités.", planned: ["Budgets par projet et suivi des engagements", "Coûts des essais et des prototypes", "Rapprochement avec les achats"] },
};

function Planned({ kind }: { kind: Kind }) {
  return (<section className="card border-dashed lg:col-span-2"><div className="flex items-start gap-3"><Construction className="mt-0.5 shrink-0 text-amber-600" size={20} aria-hidden />
    <div><h2 className="text-sm font-semibold">Module à venir</h2><p className="text-sm text-slate-600">Cet espace est volontairement minimal dans la phase 2. Prévu ensuite :</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">{META[kind].planned.map(x => <li key={x}>{x}</li>)}</ul></div></div></section>);
}

function HrDetail() {
  const { users, departments } = useDemoStore(); const active = users.filter(u => u.active);
  return (<>
    <Block title="Effectif par département">{departments.map(d => { const n = active.filter(u => u.departmentId === d.id).length; return <div key={d.id} className="flex items-center gap-3 py-1.5 text-sm"><span className="w-48 truncate">{d.name}</span><div className="h-2 flex-1 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-rose-400" style={{ width: `${(n / active.length) * 100}%` }} /></div><span className="w-6 text-right tabular-nums">{n}</span></div>; })}</Block>
    <Block title="À régulariser" href="/organization?tab=people">{active.filter(u => !u.teamId || !u.managerId).map(u => <div key={u.id} className="flex items-center justify-between gap-2 border-b py-2 text-sm last:border-0"><UserLabel userId={u.id} /><span className="text-xs text-slate-500">{[!u.teamId && "sans équipe", !u.managerId && "sans responsable"].filter(Boolean).join(", ")}</span></div>)}</Block></>);
}

function FinanceDetail() {
  const s = useDemoStore();
  const transmitted = s.invoices.filter(i => i.status === "Transmise à la Finance").sort((a, b) => (b.transmittedAt ?? "").localeCompare(a.transmittedAt ?? ""));
  const byProject = spendByProject(s.purchaseOrders).sort((a, b) => b.totalHT - a.totalHT);
  return (<>
    <Block title="Factures transmises par les Achats">
      {transmitted.length ? transmitted.map(i => <div key={i.id} className="flex items-center justify-between gap-2 border-b py-2.5 text-sm last:border-0">
        <span className="min-w-0"><span className="block font-medium">{i.id}, n° {i.supplierInvoiceNo}</span><span className="block truncate text-xs text-slate-500">{s.suppliers.find(x => x.id === i.supplierId)?.name}, BC {i.orderId}, échéance {i.dueDate.split("-").reverse().join("/")}</span></span>
        <span className="text-right text-xs"><Money value={i.totalHT} suffix="HT" /><span className="block"><Money value={i.totalVAT} suffix="TVA" /></span><span className="block font-semibold"><Money value={i.totalTTC} suffix="TTC" /></span></span></div>)
        : <p className="text-sm text-slate-500">Aucune facture transmise.</p>}
      <p className="mt-2 text-xs text-slate-500">Bon à payer et paiement relèveront du futur module Finance.</p></Block>
    <Block title="Engagements par projet (bons de commande)">
      {byProject.map(r => <div key={r.projectId ?? "none"} className="flex justify-between gap-2 border-b py-2 text-sm last:border-0"><span className="truncate">{r.projectId ? `${r.projectId} ${s.projects.find(p => p.id === r.projectId)?.name ?? ""}` : "Hors projet"}</span><Money value={r.totalHT} suffix="HT" /></div>)}
      <p className="mt-2 text-xs text-slate-500">Engagé = bons de commande émis, nets des reliquats abandonnés. Lecture seule.</p></Block></>);
}

export default function BusinessSpace({ kind }: { kind: Kind }) {
  return (<><PageTitle t={META[kind].title} s={META[kind].intro} />
    <div className="grid gap-4 lg:grid-cols-2">
      {kind === "hr" && <><HrKpis /><HrDetail /></>}
      {kind === "finance" && <><FinanceKpis /><FinanceDetail /><ProjectsAtRisk /></>}
      <Planned kind={kind} /></div></>);
}
