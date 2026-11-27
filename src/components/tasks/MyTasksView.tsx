"use client";
import { CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { PageTitle } from "@/components/shared/ui";
import { EmptyState } from "@/components/shared/EmptyState";
import { useDemoStore } from "@/hooks/demo-store";
import { myTasks } from "@/services/space.service";
import { TASK_STATUSES } from "@/types";
import { TaskRow } from "./TaskRow";

export default function MyTasksView() {
  const s = useDemoStore(); const [showDone, setShowDone] = useState(false);
  const mine = myTasks(s, s.currentUser.id).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const groups = TASK_STATUSES.filter(st => st !== "Terminée" || showDone).map(st => ({ st, items: mine.filter(t => t.status === st) })).filter(g => g.items.length);
  const open = mine.filter(t => t.status !== "Terminée").length;
  return (<><PageTitle t="Mes tâches" s={`${open} tâche(s) ouverte(s) dont vous êtes responsable`}>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="!w-5" checked={showDone} onChange={e => setShowDone(e.target.checked)} />Afficher les tâches terminées</label></PageTitle>
    {groups.length ? <div className="space-y-4">{groups.map(g => <section key={g.st} className="card"><h2 className="mb-1 text-sm font-semibold">{g.st} <span className="font-normal text-slate-500">({g.items.length})</span></h2>{g.items.map(t => <TaskRow key={t.id} task={t} />)}</section>)}</div>
      : <div className="card"><EmptyState icon={CheckCircle2} title="Aucune tâche ne vous est attribuée" text="Quand un chef de projet ou un responsable d’équipe vous attribue une tâche, elle apparaît ici et vous êtes notifié." /></div>}</>);
}
