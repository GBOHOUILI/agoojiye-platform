"use client";
import Link from "next/link";
import { PriorityBadge, TaskStatusBadge } from "@/components/shared/StatusBadge";
import { UserLabel } from "@/components/shared/UserLabel";
import { useDemoStore } from "@/hooks/demo-store";
import { todayIso } from "@/lib/clock";
import { formatDate } from "@/lib/format";
import { isOverdue } from "@/services/tasks.service";
import type { Task } from "@/types";
import { TaskActions } from "./TaskActions";

export const DueDate = ({ task, bare = false }: { task: Task; bare?: boolean }) => {
  const late = isOverdue(task, todayIso());
  return <span className={`text-xs tabular-nums ${late ? "font-medium text-red-700" : "text-slate-500"}`}>{late ? "En retard, " : bare ? "" : "Échéance "}{formatDate(task.dueDate)}</span>;
};

export function TaskRow({ task, showAssignee = false, actions = true }: { task: Task; showAssignee?: boolean; actions?: boolean }) {
  const { projects } = useDemoStore(); const p = projects.find(x => x.id === task.projectId);
  return (<div className="flex flex-col gap-2 border-b py-3 last:border-0 sm:flex-row sm:items-center">
    <div className="min-w-0 flex-1"><Link href={`/tasks/${task.id}`} className="block truncate text-sm font-medium hover:text-gold-800">{task.title}</Link>
      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1"><span className="text-xs text-slate-500">{task.code}, {p?.name}</span><DueDate task={task} />{showAssignee && <UserLabel userId={task.assigneeId} />}</div></div>
    <div className="flex flex-wrap items-center gap-2"><PriorityBadge p={task.priority} /><TaskStatusBadge s={task.status} /></div>
    {actions && <div className="sm:w-auto"><TaskActions task={task} /></div>}</div>);
}
