"use client";
import { Time } from "@/components/shared/Time";
import { Car, History, ListChecks, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { EmptyState } from "@/components/shared/EmptyState";
import { ProgressBar } from "@/components/shared/ProgressBar";
import { PriorityBadge, TaskStatusBadge } from "@/components/shared/StatusBadge";
import { Tabs } from "@/components/shared/Tabs";
import { Back, Badge, NotFoundCard } from "@/components/shared/ui";
import { UserLabel } from "@/components/shared/UserLabel";
import { TaskRow } from "@/components/tasks/TaskRow";
import { LinkedPurchases } from "@/components/purchasing/LinkedPurchases";
import { useDemoStore } from "@/hooks/demo-store";
import { canManageProject, canSeeProject, hasPermission } from "@/lib/access-simulation/permissions";
import { formatDate } from "@/lib/format";
import { displayName } from "@/lib/people";
import { getPrototypes } from "@/services/prototypes.service";
import { projectProgress } from "@/services/projects.service";
import { TASK_STATUSES } from "@/types";

export default function ProjectDetailView({ id }: { id: string }) {
  const s = useDemoStore(); const me = s.currentUser;
  const [tab, setTab] = useState("overview"), [newMember, setNewMember] = useState(""), [proto, setProto] = useState("");
  const scope = { projects: s.projects, projectMembers: s.projectMembers, users: s.users };
  const p = s.projects.find(x => x.id === id);
  if (!p || (s.ready && !canSeeProject(me, p.id, scope))) return s.ready ? <NotFoundCard href="/projects" l="Retour aux projets" /> : <div className="card animate-pulse py-10 text-center text-sm text-slate-500">Chargement…</div>;
  const manage = canManageProject(me, p.id, scope), linkable = manage && hasPermission(me, "prototype:link");
  const tasks = s.tasks.filter(t => t.projectId === p.id).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const members = s.projectMembers.filter(m => m.projectId === p.id);
  const protos = s.prototypeLinks.filter(l => l.projectId === p.id).map(l => getPrototypes(s.seedOffsetDays).find(x => x.id === l.prototypeId)!).filter(Boolean);
  const taskIds = new Set(tasks.map(t => t.id));
  const activity = s.activity.filter(e => e.entityId === p.id || taskIds.has(e.entityId)).sort((a, b) => b.at.localeCompare(a.at));
  const candidates = s.users.filter(u => u.active && !members.some(m => m.userId === u.id));
  const linkOf = (protoId: string) => s.prototypeLinks.find(l => l.prototypeId === protoId);

  const link = async () => {
    if (!proto) return;
    const other = linkOf(proto);
    if (other && other.projectId !== p.id && !window.confirm(`${proto} est rattaché au projet ${s.projects.find(x => x.id === other.projectId)?.code}. Le déplacer vers ${p.code} ?`)) return;
    if (await s.linkPrototype(proto, p.id)) setProto("");
  };

  return (<><Back href="/projects" l="Projets" />
    <div className="card mb-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="text-xs text-slate-500">{p.code}, {s.departments.find(d => d.id === p.departmentId)?.name ?? "sans département"}</div>
      <h1 className="text-xl font-semibold sm:text-2xl">{p.name}</h1>{p.description && <p className="mt-1 max-w-prose text-sm text-slate-600">{p.description}</p>}</div>
      <div className="flex flex-wrap gap-2"><Badge v={p.status} /><PriorityBadge p={p.priority} /></div></div>
      <dl className="mt-4 grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
        <div><dt className="text-xs text-slate-500">Chef de projet</dt><dd className="mt-1"><UserLabel userId={p.ownerId} /></dd></div>
        <div><dt className="text-xs text-slate-500">Période</dt><dd className="mt-1">{formatDate(p.startDate)} au {formatDate(p.dueDate)}</dd></div>
        <div><dt className="text-xs text-slate-500">Tâches</dt><dd className="mt-1">{tasks.filter(t => t.status === "Terminée").length} terminée(s) sur {tasks.length}</dd></div>
        <div><dt className="text-xs text-slate-500">Avancement</dt><dd className="mt-2"><ProgressBar value={projectProgress(s.tasks, p.id)} /></dd></div></dl></div>

    <Tabs value={tab} onChange={setTab} tabs={[{ id: "overview", label: "Aperçu" }, { id: "tasks", label: "Tâches", count: tasks.length }, { id: "members", label: "Membres", count: members.length }, { id: "protos", label: "Prototypes", count: protos.length }, { id: "purchases", label: "Achats", count: s.purchaseRequests.filter(r => r.projectId === p.id && r.status !== "Annulée").length }, { id: "activity", label: "Activité" }]} />

    {tab === "overview" && <div className="grid gap-4 lg:grid-cols-2">
      <section className="card"><h2 className="mb-3 text-sm font-semibold">Répartition des tâches</h2>{TASK_STATUSES.map(st => { const n = tasks.filter(t => t.status === st).length; return (
        <div key={st} className="flex items-center gap-3 py-1.5"><span className="w-28"><TaskStatusBadge s={st} /></span><div className="h-2 flex-1 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-slate-400" style={{ width: `${tasks.length ? (n / tasks.length) * 100 : 0}%` }} /></div><span className="w-6 text-right text-sm tabular-nums">{n}</span></div>); })}</section>
      <section className="card"><h2 className="mb-2 text-sm font-semibold">Dernières actions</h2>{activity.slice(0, 5).map(e => <div key={e.id} className="border-b py-2 text-sm last:border-0">{e.summary}<div className="text-xs text-slate-500"><Time iso={e.at} /></div></div>)}{!activity.length && <EmptyState icon={History} title="Aucune activité enregistrée" />}</section></div>}

    {tab === "tasks" && <section className="card">
      {(manage || hasPermission(me, "task:create")) && <div className="mb-2 flex justify-end"><Link href={`/tasks?new=1&project=${p.id}`} className="btn-o btn-sm"><Plus size={14} aria-hidden />Nouvelle tâche</Link></div>}
      {tasks.length ? tasks.map(t => <TaskRow key={t.id} task={t} showAssignee />) : <EmptyState icon={ListChecks} title="Aucune tâche dans ce projet" />}</section>}

    {tab === "members" && <section className="card">
      {members.map(m => <div key={m.userId} className="flex items-center justify-between gap-2 border-b py-2.5 last:border-0"><UserLabel userId={m.userId} /><span className="text-xs text-slate-500">{m.projectRole}</span></div>)}
      {manage && <form className="mt-3 flex flex-col gap-2 border-t pt-3 sm:flex-row" onSubmit={async e => { e.preventDefault(); if (newMember && await s.addProjectMember(p.id, newMember)) setNewMember(""); }}>
        <select aria-label="Collaborateur à ajouter" value={newMember} onChange={e => setNewMember(e.target.value)}><option value="">Ajouter un collaborateur…</option>{candidates.map(u => <option key={u.id} value={u.id}>{displayName(u)}, {u.jobTitle}</option>)}</select>
        <button className="btn" disabled={!newMember}>Ajouter</button></form>}</section>}

    {tab === "protos" && <section className="card">
      <p className="mb-2 text-sm text-slate-600">Le rattachement d’un prototype à un projet est facultatif. Un prototype appartient au plus à un projet.</p>
      {protos.length ? protos.map(x => <div key={x.id} className="flex items-center justify-between gap-2 border-b py-2.5 last:border-0">
        <Link href={`/prototypes/${x.id}`} className="flex min-w-0 items-center gap-2 text-sm hover:text-gold-800"><Car size={16} className="text-slate-400" aria-hidden /><span className="truncate"><b>{x.id}</b> {x.nom}</span></Link>
        {linkable && <button className="btn-o btn-sm" onClick={() => { if (window.confirm(`Détacher ${x.id} de ${p.code} ?`)) void s.unlinkPrototype(x.id); }}>Détacher</button>}</div>)
        : <EmptyState icon={Car} title="Aucun prototype rattaché" text="Ce projet n’est lié à aucun prototype, ce qui est possible pour un projet transverse." />}
      {linkable && <div className="mt-3 flex flex-col gap-2 border-t pt-3 sm:flex-row">
        <select aria-label="Prototype à rattacher" value={proto} onChange={e => setProto(e.target.value)}><option value="">Rattacher un prototype…</option>
          {getPrototypes(s.seedOffsetDays).filter(x => { const o = linkOf(x.id); return o?.projectId !== p.id && (!o || canManageProject(me, o.projectId, scope)); }).map(x => { const o = linkOf(x.id); return <option key={x.id} value={x.id}>{x.id} {x.nom}{o ? ` (actuellement ${s.projects.find(pp => pp.id === o.projectId)?.code})` : " (non rattaché)"}</option>; })}</select>
        <button className="btn" disabled={!proto} onClick={link}>Rattacher</button></div>}</section>}

    {tab === "purchases" && <LinkedPurchases projectId={p.id} />}

    {tab === "activity" && <section className="card">{activity.length ? activity.map(e => <div key={e.id} className="border-b py-2.5 text-sm last:border-0">{e.summary}<div className="text-xs text-slate-500"><Time iso={e.at} /></div></div>) : <EmptyState icon={History} title="Aucune activité enregistrée" />}</section>}
  </>);
}
