"use client";
import { KanbanSquare, List, ListChecks, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Can } from "@/components/shared/Can";
import { DataList } from "@/components/shared/DataList";
import { Drawer } from "@/components/shared/Drawer";
import { EmptyState } from "@/components/shared/EmptyState";
import { PriorityBadge, TaskStatusBadge } from "@/components/shared/StatusBadge";
import { PageTitle } from "@/components/shared/ui";
import { UserLabel } from "@/components/shared/UserLabel";
import { useDemoStore } from "@/hooks/demo-store";
import { todayIso } from "@/lib/clock";
import { isOverdue } from "@/services/tasks.service";
import { PRIORITIES, TASK_STATUSES } from "@/types";
import { TaskBoard } from "./TaskBoard";
import { TaskForm } from "./TaskForm";
import { DueDate } from "./TaskRow";
import { defaultScope, scopesFor, tasksInScope, type TaskScope } from "./task-scope";

export interface TasksViewProps { initialScope?: string; initialProject?: string; initialLate?: boolean; openNew?: boolean }

export default function TasksView({ initialScope, initialProject = "", initialLate = false, openNew = false }: TasksViewProps) {
  const s = useDemoStore(); const me = s.currentUser; const router = useRouter();
  const scopes = scopesFor(me);
  const valid = (x?: string) => scopes.some(o => o.id === x) ? (x as TaskScope) : defaultScope(me);
  const [scope, setScope] = useState<TaskScope>(valid(initialScope));
  const [project, setProject] = useState(initialProject), [prio, setPrio] = useState(""), [status, setStatus] = useState(""), [late, setLate] = useState(initialLate), [q, setQ] = useState("");
  const [view, setView] = useState<"board" | "list">("board"), [creating, setCreating] = useState(openNew);
  // The profile can change while on the page: fall back to a scope it can use.
  useEffect(() => { if (!scopes.some(o => o.id === scope)) setScope(defaultScope(me)); }, [me.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const today = todayIso();
  const base = tasksInScope(s, me, scope);
  const rows = base.filter(t => (!project || t.projectId === project) && (!prio || t.priority === prio) && (!status || t.status === status) && (!late || isOverdue(t, today)) && `${t.code} ${t.title}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const projectOptions = s.projects.filter(p => base.some(t => t.projectId === p.id));

  return (<><PageTitle t="Tâches" s={`${rows.length} tâche(s) affichée(s)`}>
    <div className="flex w-full gap-2 sm:w-auto">
      <div className="flex rounded-lg border border-slate-300 p-0.5" role="group" aria-label="Affichage">
        <button aria-pressed={view === "board"} onClick={() => setView("board")} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm ${view === "board" ? "bg-slate-900 text-white" : "text-slate-600"}`}><KanbanSquare size={15} aria-hidden />Tableau</button>
        <button aria-pressed={view === "list"} onClick={() => setView("list")} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm ${view === "list" ? "bg-slate-900 text-white" : "text-slate-600"}`}><List size={15} aria-hidden />Liste</button></div>
      <Can perm="task:create"><button className="btn flex-1 sm:flex-none" onClick={() => setCreating(true)}><Plus size={16} aria-hidden />Nouvelle tâche</button></Can></div></PageTitle>

    <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Périmètre">{scopes.map(o => <button key={o.id} aria-pressed={scope === o.id} onClick={() => setScope(o.id)} className={`rounded-full border px-3 py-1.5 text-sm ${scope === o.id ? "border-gold-700 bg-gold-50 font-medium text-gold-800" : "border-slate-300 text-slate-600 hover:bg-slate-100"}`}>{o.label}</button>)}</div>
    <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
      <input placeholder="Rechercher" aria-label="Rechercher une tâche" value={q} onChange={e => setQ(e.target.value)} />
      <select aria-label="Projet" value={project} onChange={e => setProject(e.target.value)}><option value="">Tous les projets</option>{projectOptions.map(p => <option key={p.id} value={p.id}>{p.code} {p.name}</option>)}</select>
      <select aria-label="Priorité" value={prio} onChange={e => setPrio(e.target.value)}><option value="">Toutes les priorités</option>{PRIORITIES.map(x => <option key={x}>{x}</option>)}</select>
      <select aria-label="Statut" value={status} onChange={e => setStatus(e.target.value)}><option value="">Tous les statuts</option>{TASK_STATUSES.map(x => <option key={x}>{x}</option>)}</select>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="!w-5" checked={late} onChange={e => setLate(e.target.checked)} />En retard uniquement</label></div>

    {!base.length ? <div className="card"><EmptyState icon={ListChecks} title="Aucune tâche dans ce périmètre" text="Changez de périmètre ou de profil pour voir d’autres tâches." /></div>
      : view === "board" ? <TaskBoard tasks={rows} />
      : <DataList rows={rows} href={t => `/tasks/${t.id}`} cols={[
        { h: "Tâche", r: t => <span><b>{t.title}</b><span className="block text-xs font-normal text-slate-500">{t.code}, {s.projects.find(p => p.id === t.projectId)?.code}</span></span> },
        { h: "Statut", r: t => <TaskStatusBadge s={t.status} /> },
        { h: "Priorité", r: t => <PriorityBadge p={t.priority} /> },
        { h: "Responsable", r: t => <UserLabel userId={t.assigneeId} link={false} /> },
        { h: "Échéance", r: t => <DueDate task={t} /> },
        { h: "Avancement", r: t => `${t.progress} %` }]} />}
    <Drawer open={creating} onClose={() => setCreating(false)} title="Nouvelle tâche">{s.ready && <TaskForm key={me.id} initialProject={project || initialProject} onDone={id => { setCreating(false); router.push(`/tasks/${id}`); }} />}</Drawer></>);
}
