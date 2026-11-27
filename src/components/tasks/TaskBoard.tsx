"use client";
import Link from "next/link";
import { Avatar } from "@/components/shared/Avatar";
import { PriorityBadge } from "@/components/shared/StatusBadge";
import { useDemoStore } from "@/hooks/demo-store";
import { displayName } from "@/lib/people";
import { TASK_STATUSES, type Task } from "@/types";
import { TaskActions } from "./TaskActions";
import { DueDate } from "./TaskRow";

const COLUMN_TONE: Record<string, string> = { "À faire": "border-t-slate-400", "En cours": "border-t-sky-500", Bloquée: "border-t-red-600", "En validation": "border-t-amber-500", Terminée: "border-t-emerald-600" };

export function TaskBoard({ tasks }: { tasks: Task[] }) {
  const { users, projects } = useDemoStore();
  return (<div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0 2xl:grid 2xl:grid-cols-5 2xl:overflow-visible">
    {TASK_STATUSES.map(st => { const col = tasks.filter(t => t.status === st); return (
      <section key={st} aria-label={`Colonne ${st}`} className={`flex w-72 shrink-0 snap-start flex-col rounded-xl border border-t-4 border-slate-200 bg-slate-100/70 2xl:w-auto ${COLUMN_TONE[st]}`}>
        <h2 className="flex items-center justify-between px-3 py-2 text-sm font-semibold">{st}<span className="rounded-full bg-white px-2 text-xs tabular-nums text-slate-600">{col.length}</span></h2>
        <div className="flex-1 space-y-2 px-2 pb-2">{col.map(t => { const a = users.find(u => u.id === t.assigneeId); return (
          <article key={t.id} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
            <div className="mb-1 flex items-center justify-between gap-2"><span className="text-xs text-slate-500">{t.code}, {projects.find(p => p.id === t.projectId)?.code}</span><PriorityBadge p={t.priority} /></div>
            <Link href={`/tasks/${t.id}`} className="block text-sm font-medium leading-snug hover:text-gold-800">{t.title}</Link>
            <div className="mt-2 flex items-center justify-between gap-2"><DueDate task={t} />{a ? <span title={displayName(a)}><Avatar user={a} size="sm" /></span> : <span className="text-xs text-slate-400">Non attribuée</span>}</div>
            {t.validatorId && <div className="mt-1 text-xs text-slate-500">Validation : {displayName(users.find(u => u.id === t.validatorId) ?? { firstName: "?", lastName: "" })}</div>}
            <div className="mt-2"><TaskActions task={t} /></div></article>); })}
          {!col.length && <p className="px-2 py-4 text-center text-xs text-slate-400">Aucune tâche</p>}</div></section>); })}
  </div>);
}
