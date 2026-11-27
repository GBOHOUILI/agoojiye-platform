"use client";
import { Time } from "@/components/shared/Time";
import Link from "next/link";
import { useState } from "react";
import { History } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { ProgressBar } from "@/components/shared/ProgressBar";
import { PriorityBadge, TaskStatusBadge } from "@/components/shared/StatusBadge";
import { Back, NotFoundCard } from "@/components/shared/ui";
import { UserLabel } from "@/components/shared/UserLabel";
import { useDemoStore } from "@/hooks/demo-store";
import { canSeeProject, canUpdateTask, hasPermission } from "@/lib/access-simulation/permissions";
import { formatDate } from "@/lib/format";
import { displayName, nameOf } from "@/lib/people";
import { TaskActions } from "./TaskActions";
import { LinkedPurchases } from "@/components/purchasing/LinkedPurchases";
import { DueDate } from "./TaskRow";
import { assigneeCandidates } from "./task-scope";

const STEPS = [0, 25, 50, 75];

export default function TaskDetailView({ id }: { id: string }) {
  const s = useDemoStore(); const me = s.currentUser; const [assignee, setAssignee] = useState("");
  const t = s.tasks.find(x => x.id === id);
  const scope = { projects: s.projects, projectMembers: s.projectMembers, users: s.users };
  const visible = t && (canSeeProject(me, t.projectId, scope) || t.assigneeId === me.id || t.validatorId === me.id || me.systemRole === "ADMIN");
  if (!t || (s.ready && !visible)) return s.ready ? <NotFoundCard href="/tasks" l="Retour aux tâches" /> : <div className="card animate-pulse py-10 text-center text-sm text-slate-500">Chargement…</div>;
  const project = s.projects.find(p => p.id === t.projectId);
  const editable = canUpdateTask(me, t, scope) && t.status !== "Terminée" && t.status !== "En validation";
  const reassign = hasPermission(me, "task:assign") && t.status !== "Terminée" && t.status !== "En validation" ? assigneeCandidates(s, me, t.projectId).filter(u => u.id !== t.assigneeId) : [];
  const validations = s.validations.filter(v => v.subjectId === t.id).sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
  const history = s.activity.filter(e => e.entityId === t.id).sort((a, b) => b.at.localeCompare(a.at));

  return (<><Back href="/tasks" l="Tâches" />
    <div className="card mb-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><div className="text-xs text-slate-500">{t.code}, projet <Link className="text-gold-700 hover:underline" href={`/projects/${t.projectId}`}>{project?.name}</Link></div>
      <h1 className="text-xl font-semibold sm:text-2xl">{t.title}</h1>{t.description && <p className="mt-1 max-w-prose text-sm text-slate-600">{t.description}</p>}</div>
      <div className="flex flex-wrap gap-2"><TaskStatusBadge s={t.status} /><PriorityBadge p={t.priority} /></div></div>
      <dl className="mt-4 grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
        <div><dt className="text-xs text-slate-500">Auteur</dt><dd className="mt-1"><UserLabel userId={t.authorId} /></dd></div>
        <div><dt className="text-xs text-slate-500">Responsable</dt><dd className="mt-1"><UserLabel userId={t.assigneeId} /></dd></div>
        <div><dt className="text-xs text-slate-500">Validateur</dt><dd className="mt-1"><UserLabel userId={t.validatorId} empty="Aucune validation requise" /></dd></div>
        <div><dt className="text-xs text-slate-500">Échéance</dt><dd className="mt-1"><DueDate task={t} bare /></dd></div></dl>
      {t.anomalyId && <p className="mt-3 text-sm">Action corrective de l’anomalie <Link className="font-medium text-gold-800 underline" href={`/anomalies/${t.anomalyId}`}>{t.anomalyId}</Link></p>}
      <div className="mt-4 border-t pt-4"><div className="mb-1 text-xs text-slate-500">Avancement</div><ProgressBar value={t.progress} />
        {editable && <div className="mt-2 flex flex-wrap gap-2">{STEPS.map(v => <button key={v} className={`btn-o btn-sm ${t.progress === v ? "border-gold-700 text-gold-800" : ""}`} onClick={() => void s.setTaskProgress(t.id, v)}>{v} %</button>)}</div>}</div>
      <div className="mt-4 border-t pt-4"><TaskActions task={t} size="md" /></div>
      {reassign.length > 0 && <form className="mt-4 flex flex-col gap-2 border-t pt-4 sm:flex-row" onSubmit={async e => { e.preventDefault(); if (assignee && await s.assignTask(t.id, assignee)) setAssignee(""); }}>
        <select aria-label="Nouveau responsable" value={assignee} onChange={e => setAssignee(e.target.value)}><option value="">{t.assigneeId ? "Réattribuer à…" : "Attribuer à…"}</option>{reassign.map(u => <option key={u.id} value={u.id}>{displayName(u)}</option>)}</select>
        <button className="btn-o" disabled={!assignee}>{t.assigneeId ? "Réattribuer" : "Attribuer"}</button></form>}</div>

    <div className="grid gap-4 lg:grid-cols-2">
      <section className="card"><h2 className="mb-2 text-sm font-semibold">Validation</h2>
        {validations.length ? validations.map(v => <div key={v.id} className="border-b py-2.5 text-sm last:border-0">
          <div className="flex items-center justify-between gap-2"><span>Soumise par {nameOf(s.users, v.ownerId)}</span><span className={`text-xs font-medium ${v.status === "Approuvée" ? "text-emerald-700" : v.status === "Rejetée" ? "text-red-700" : "text-amber-700"}`}>{v.status}</span></div>
          <div className="text-xs text-slate-500">Demandée le <Time iso={v.requestedAt} mode="datetime" />{v.decidedAt ? <>, décidée par {nameOf(s.users, v.validatorId)} le <Time iso={v.decidedAt} mode="datetime" /></> : `, en attente de ${nameOf(s.users, v.validatorId)}`}</div>
          {v.comment && <p className="mt-1 rounded bg-slate-50 px-2 py-1 text-sm">« {v.comment} »</p>}</div>)
          : <p className="text-sm text-slate-500">{t.validatorId ? "Pas encore soumise à validation." : "Cette tâche ne requiert pas de validation."}</p>}</section>
      <section className="card"><h2 className="mb-2 text-sm font-semibold">Historique</h2>
        {history.length ? history.map(e => <div key={e.id} className="border-b py-2 text-sm last:border-0">{e.summary}<div className="text-xs text-slate-500"><Time iso={e.at} /></div></div>)
          : <EmptyState icon={History} title="Aucun historique" text={`Tâche créée le ${formatDate(t.createdAt)}.`} />}</section>
      {s.purchaseRequests.some(r => r.taskId === t.id) && <div className="lg:col-span-2"><LinkedPurchases taskId={t.id} /></div>}</div></>);
}
