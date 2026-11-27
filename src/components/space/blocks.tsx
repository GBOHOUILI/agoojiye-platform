"use client";
import { Time } from "@/components/shared/Time";
import Link from "next/link";
import { AlertTriangle, BadgeCheck, CheckCircle2, Clock, History, ListChecks, ShoppingBag } from "lucide-react";
import { StatusPill } from "@/components/purchasing/StatusPill";
import { formatFCFA } from "@/lib/purchasing/money";
import { committedHT } from "@/services/purchasing/reports";
import { Badge } from "@/components/shared/ui";
import { EmptyState } from "@/components/shared/EmptyState";
import { ProgressBar } from "@/components/shared/ProgressBar";
import { StatCard } from "@/components/shared/StatCard";
import { UserLabel } from "@/components/shared/UserLabel";
import { TaskRow } from "@/components/tasks/TaskRow";
import { useDemoStore } from "@/hooks/demo-store";
import { todayIso } from "@/lib/clock";
import { formatDate } from "@/lib/format";
import { nameOf } from "@/lib/people";
import { isOpen } from "@/services/anomalies.service";
import { projectProgress } from "@/services/projects.service";
import { myTasks, overdueTasks, pendingValidationsFor, projectsAtRisk, teamWorkload, visibleProjects } from "@/services/space.service";
import { Block } from "./Block";

const byDue = <T extends { dueDate: string }>(a: T, b: T) => a.dueDate.localeCompare(b.dueDate);

export function OrgKpis() {
  const s = useDemoStore(), today = todayIso();
  return (<div className="grid grid-cols-2 gap-3 lg:col-span-2 xl:grid-cols-4">
    <StatCard label="Collaborateurs actifs" value={s.users.filter(u => u.active).length} hint={`${s.departments.length} départements, ${s.teams.length} équipes`} href={s.can("org:read") ? "/organization" : undefined} />
    <StatCard label="Projets en cours" value={s.projects.filter(p => p.status === "En cours").length} hint={`${projectsAtRisk(s, today).length} à risque`} tone={projectsAtRisk(s, today).length ? "warn" : "default"} href="/projects" />
    <StatCard label="Tâches en retard" value={overdueTasks(s.tasks, today).length} hint={`${s.tasks.filter(t => t.status !== "Terminée").length} tâches ouvertes`} tone={overdueTasks(s.tasks, today).length ? "danger" : "default"} href="/tasks?scope=all&late=1" />
    <StatCard label="Anomalies ouvertes" value={s.anos.filter(isOpen).length} hint={`${s.anos.filter(a => isOpen(a) && a.g === "Critique").length} critique(s)`} href={s.can("engineering:read") ? "/anomalies?open=1" : undefined} /></div>);
}

export function ProjectsAtRisk() {
  const s = useDemoStore(), list = projectsAtRisk(s, todayIso());
  return (<Block title="Projets à surveiller" href="/projects">
    {list.length ? list.map(p => (<Link key={p.id} href={`/projects/${p.id}`} className="block border-b py-2.5 last:border-0 hover:bg-slate-50">
      <div className="flex items-center justify-between gap-2 text-sm"><span className="truncate font-medium">{p.name}</span><span className="shrink-0 text-xs text-slate-500">Échéance {formatDate(p.dueDate)}</span></div>
      <div className="mt-1.5"><ProgressBar value={projectProgress(s.tasks, p.id)} /></div></Link>))
      : <EmptyState icon={CheckCircle2} title="Aucun projet à risque" text="Échéances et retards sont sous contrôle." />}</Block>);
}

export function CriticalIncidents() {
  const { anos, can } = useDemoStore(); const list = anos.filter(a => isOpen(a) && (a.g === "Critique" || a.g === "Élevée"));
  return (<Block title="Anomalies critiques et élevées" href={can("engineering:read") ? "/anomalies?open=1" : undefined}>
    {list.length ? list.map(a => (<Link key={a.id} href={`/anomalies/${a.id}`} className="flex items-center justify-between gap-2 border-b py-2.5 text-sm last:border-0 hover:bg-slate-50">
      <span className="min-w-0"><span className="block truncate">{a.titre}</span><span className="text-xs text-slate-500">{a.id}, {a.proto}, {a.s}</span></span><Badge v={a.g} /></Link>))
      : <EmptyState icon={CheckCircle2} title="Aucune anomalie critique ouverte" />}</Block>);
}

export function PendingValidations() {
  const s = useDemoStore(), list = pendingValidationsFor(s, s.currentUser);
  return (<Block title="Validations à décider" href="/validations">
    {list.length ? list.map(v => { const purchase = v.subjectType === "purchase_request"; const title = purchase ? `Achat ${v.subjectId} (étape ${v.step}) : ${s.purchaseRequests.find(x => x.id === v.subjectId)?.title ?? ""}` : s.tasks.find(x => x.id === v.subjectId)?.title; return (
      <Link key={v.id} href={purchase ? `/purchasing/requests/${v.subjectId}` : `/tasks/${v.subjectId}`} className="block border-b py-2.5 text-sm last:border-0 hover:bg-slate-50">
        <span className="block truncate font-medium">{title}</span><span className="text-xs text-slate-500">Soumise par {nameOf(s.users, v.ownerId)}, <Time iso={v.requestedAt} /></span></Link>); })
      : <EmptyState icon={BadgeCheck} title="Aucune validation en attente" text="Les demandes qui vous sont adressées apparaîtront ici." />}</Block>);
}

export function MyProjects() {
  const s = useDemoStore(), me = s.currentUser;
  const list = visibleProjects(s, me).filter(p => p.ownerId === me.id || s.projectMembers.some(m => m.projectId === p.id && m.userId === me.id));
  return (<Block title="Mes projets" href="/projects">
    {list.length ? list.map(p => (<Link key={p.id} href={`/projects/${p.id}`} className="block border-b py-2.5 last:border-0 hover:bg-slate-50">
      <div className="flex items-center justify-between gap-2 text-sm"><span className="truncate font-medium">{p.name}</span><span className="shrink-0 text-xs text-slate-500">{p.ownerId === me.id ? "Chef de projet" : "Membre"}</span></div>
      <div className="mt-1.5"><ProgressBar value={projectProgress(s.tasks, p.id)} /></div></Link>))
      : <EmptyState icon={ListChecks} title="Vous ne participez à aucun projet" />}</Block>);
}

export function MyTasksBlock() {
  const s = useDemoStore(), list = myTasks(s, s.currentUser.id).filter(t => t.status !== "Terminée").sort(byDue);
  return (<Block title="Mes tâches" href="/my-tasks" wide>
    {list.length ? list.slice(0, 6).map(t => <TaskRow key={t.id} task={t} />) : <EmptyState icon={CheckCircle2} title="Aucune tâche ouverte" text="Les tâches qui vous sont attribuées apparaîtront ici." />}</Block>);
}

export function OverdueTasksBlock() {
  const s = useDemoStore(), me = s.currentUser;
  const mine = new Set(s.projects.filter(p => p.ownerId === me.id).map(p => p.id));
  const list = overdueTasks(s.tasks, todayIso()).filter(t => me.systemRole !== "PROJECT_MANAGER" || mine.has(t.projectId)).sort(byDue);
  return (<Block title="Tâches en retard sur mes projets" href="/tasks?scope=projects&late=1" wide>
    {list.length ? list.map(t => <TaskRow key={t.id} task={t} showAssignee actions={false} />) : <EmptyState icon={Clock} title="Aucune tâche en retard" />}</Block>);
}

export function TeamWorkload() {
  const s = useDemoStore(), team = s.teams.find(t => t.id === s.currentUser.teamId);
  if (!team) return <Block title="Charge de l’équipe"><EmptyState icon={ListChecks} title="Vous n’êtes rattaché à aucune équipe" /></Block>;
  const rows = teamWorkload(s, team.id, todayIso());
  return (<Block title={`Charge de l’${team.name.charAt(0).toLowerCase()}${team.name.slice(1)}`} href="/tasks?scope=team">
    <table className="w-full text-sm"><thead><tr className="text-left text-xs text-slate-500"><th className="py-1 font-medium">Membre</th><th className="py-1 text-right font-medium">Ouvertes</th><th className="py-1 text-right font-medium">En retard</th></tr></thead>
      <tbody>{rows.map(r => <tr key={r.user.id} className="border-t"><td className="py-2"><UserLabel userId={r.user.id} /></td><td className="py-2 text-right tabular-nums">{r.open}</td><td className={`py-2 text-right tabular-nums ${r.overdue ? "font-medium text-red-700" : ""}`}>{r.overdue}</td></tr>)}</tbody></table></Block>);
}

export function DeclareShortcut() {
  const { anos, currentUser, can } = useDemoStore(); const mine = anos.filter(a => a.reporterId === currentUser.id);
  return (<Block title="Signaler un incident">
    <p className="text-sm text-slate-600">Un résultat d’essai anormal ou un défaut constaté ? Déclarez-le : la qualité et le chef de projet concerné sont prévenus automatiquement.</p>
    {can("incident:declare") && <Link href="/anomalies?declare=1" className="btn mt-3 w-full sm:w-auto"><AlertTriangle size={16} aria-hidden />Déclarer une anomalie</Link>}
    <p className="mt-2 text-xs text-slate-500">{mine.length ? `${mine.length} anomalie(s) déclarée(s) par vous.` : "Vous n’avez encore déclaré aucune anomalie."}</p></Block>);
}

export function VerificationQueue() {
  const { anos } = useDemoStore(); const list = anos.filter(a => a.s === "En vérification");
  return (<Block title="Anomalies en attente de vérification" href="/validations">
    {list.length ? list.map(a => <Link key={a.id} href={`/anomalies/${a.id}`} className="flex items-center justify-between gap-2 border-b py-2.5 text-sm last:border-0 hover:bg-slate-50"><span className="truncate">{a.titre}</span><Badge v={a.g} /></Link>)
      : <EmptyState icon={BadgeCheck} title="Aucune anomalie à vérifier" text="Les anomalies passées « En vérification » apparaîtront ici." />}</Block>);
}

export function RecentActivity() {
  const s = useDemoStore(), all = s.can("activity:read_all");
  const list = [...s.activity].filter(e => all || e.actorId === s.currentUser.id).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 6);
  return (<Block title={all ? "Activité récente" : "Ma dernière activité"} href="/activity">
    {list.length ? list.map(e => <div key={e.id} className="border-b py-2 text-sm last:border-0">{e.summary}<div className="text-xs text-slate-500"><Time iso={e.at} /></div></div>)
      : <EmptyState icon={History} title="Aucune activité pour l’instant" />}</Block>);
}

export function HrKpis() {
  const s = useDemoStore(), active = s.users.filter(u => u.active);
  return (<div className="grid grid-cols-2 gap-3 lg:col-span-2 xl:grid-cols-4">
    <StatCard label="Effectif actif" value={active.length} href="/organization?tab=people" />
    <StatCard label="Départements" value={s.departments.length} href="/organization" />
    <StatCard label="Sans équipe" value={active.filter(u => !u.teamId).length} tone={active.some(u => !u.teamId) ? "warn" : "default"} href="/hr" />
    <StatCard label="Sans responsable" value={active.filter(u => !u.managerId).length} hint="Direction comprise" href="/hr" /></div>);
}

export function FinanceKpis() {
  const s = useDemoStore(), today = todayIso(), active = s.projects.filter(p => p.status !== "Terminé");
  return (<div className="grid grid-cols-2 gap-3 lg:col-span-2 xl:grid-cols-4">
    <StatCard label="Projets actifs" value={active.length} href="/projects" />
    <StatCard label="Projets à risque" value={projectsAtRisk(s, today).length} tone={projectsAtRisk(s, today).length ? "warn" : "default"} href="/finance" />
    <StatCard label="Projets urgents" value={active.filter(p => p.priority === "Urgente").length} />
    <StatCard label="Échéance sous 30 jours" value={active.filter(p => (Date.parse(p.dueDate) - Date.parse(today)) / 86_400_000 <= 30).length} /></div>);
}

export function PurchasingKpis() {
  const s = useDemoStore(), today = todayIso();
  const toHandle = s.purchaseRequests.filter(r => r.status === "Approuvée" || r.status === "En consultation").length;
  const open = s.purchaseOrders.filter(o => o.status === "Émis" || o.status === "Partiellement reçu");
  const committed = s.purchaseOrders.filter(o => o.status !== "Annulé").reduce((t, o) => t + committedHT(o), 0);
  const disputes = s.invoices.filter(i => i.status === "En litige").length;
  return (<div className="grid grid-cols-2 gap-3 lg:col-span-2 xl:grid-cols-4">
    <StatCard label="Demandes à traiter" value={toHandle} hint="Approuvées ou en consultation" href="/purchasing/requests" />
    <StatCard label="Commandes en cours" value={open.length} hint={`${open.filter(o => o.expectedDelivery < today).length} en retard`} tone={open.some(o => o.expectedDelivery < today) ? "danger" : "default"} href="/purchasing/orders" />
    <StatCard label="Montant engagé" value={formatFCFA(committed)} hint="HT, bons de commande" href="/purchasing/reports" />
    <StatCard label="Factures en litige" value={disputes} tone={disputes ? "warn" : "default"} href="/purchasing/invoices" /></div>);
}

export function MyPurchases() {
  const s = useDemoStore(); const mine = s.purchaseRequests.filter(r => r.requesterId === s.currentUser.id).sort((a, b) => b.id.localeCompare(a.id));
  return (<Block title="Mes demandes d’achat" href="/purchasing/requests">
    {mine.length ? mine.slice(0, 5).map(r => <Link key={r.id} href={`/purchasing/requests/${r.id}`} className="flex items-center justify-between gap-2 border-b py-2.5 text-sm last:border-0 hover:bg-slate-50">
      <span className="min-w-0"><span className="block truncate font-medium">{r.title}</span><span className="text-xs text-slate-500">{r.id}</span></span><StatusPill v={r.status} /></Link>)
      : <EmptyState icon={ShoppingBag} title="Aucune demande d’achat" text="Besoin de matériel ? Créez une demande : elle suivra le bon circuit de validation." action={<Link href="/purchasing/requests?new=1" className="btn-o btn-sm">Nouvelle demande</Link>} />}</Block>);
}

export function PurchasingQueue() {
  const s = useDemoStore();
  const items = [
    ...s.purchaseRequests.filter(r => r.status === "Approuvée").map(r => ({ id: r.id, href: `/purchasing/requests/${r.id}`, label: r.title, todo: "Consulter les fournisseurs" })),
    ...s.purchaseRequests.filter(r => r.status === "En consultation" && !r.selectedQuoteId).map(r => ({ id: r.id, href: `/purchasing/requests/${r.id}`, label: r.title, todo: "Retenir un devis" })),
    ...s.purchaseRequests.filter(r => r.status === "En consultation" && r.selectedQuoteId).map(r => ({ id: r.id, href: `/purchasing/requests/${r.id}`, label: r.title, todo: "Émettre le bon de commande" })),
    ...s.invoices.filter(i => i.status === "En litige").map(i => ({ id: i.id, href: `/purchasing/orders/${i.orderId}`, label: `Facture ${i.supplierInvoiceNo}`, todo: "Résoudre le litige" })),
    ...s.invoices.filter(i => i.status === "Conforme").map(i => ({ id: i.id, href: `/purchasing/orders/${i.orderId}`, label: `Facture ${i.supplierInvoiceNo}`, todo: "Transmettre à la Finance" })),
  ];
  return (<Block title="Achats à traiter" href="/purchasing">
    {items.length ? items.map(x => <Link key={`${x.id}-${x.todo}`} href={x.href} className="flex items-center justify-between gap-2 border-b py-2.5 text-sm last:border-0 hover:bg-slate-50">
      <span className="min-w-0"><span className="block truncate font-medium">{x.label}</span><span className="text-xs text-slate-500">{x.id}</span></span><span className="shrink-0 text-xs font-medium text-gold-800">{x.todo}</span></Link>)
      : <EmptyState icon={CheckCircle2} title="Rien à traiter" />}</Block>);
}

export function AdminShortcuts() {
  const { reset } = useDemoStore();
  return (<Block title="Administration de la démonstration">
    <div className="flex flex-wrap gap-2"><Link href="/admin" className="btn-o btn-sm">Utilisateurs et rôles</Link><Link href="/admin?tab=matrix" className="btn-o btn-sm">Matrice des permissions</Link>
      <button className="btn-o btn-sm text-red-700" onClick={() => { if (window.confirm("Réinitialiser toutes les données de démonstration ?")) reset(); }}>Réinitialiser la démo</button></div></Block>);
}

