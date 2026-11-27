"use client";
import { useState } from "react";
import { useDemoStore } from "@/hooks/demo-store";
import { canDecideValidation, canUpdateTask } from "@/lib/access-simulation/permissions";
import { allowedTransitions } from "@/services/tasks.service";
import type { Task, TaskStatus } from "@/types";

const LABEL = (from: TaskStatus, to: TaskStatus) => to === "En cours" ? (from === "Bloquée" ? "Reprendre" : "Démarrer") : to === "Bloquée" ? "Signaler un blocage" : to === "Terminée" ? "Terminer" : to;

/** Workflow buttons computed from the task state and the simulated profile. */
export function TaskActions({ task, size = "sm" }: { task: Task; size?: "sm" | "md" }) {
  const s = useDemoStore(); const me = s.currentUser;
  const [rejecting, setRejecting] = useState(false), [comment, setComment] = useState(""), [busy, setBusy] = useState(false);
  const scope = { projects: s.projects, projectMembers: s.projectMembers, users: s.users };
  const canUpdate = canUpdateTask(me, task, scope);
  const pending = s.validations.find(v => v.subjectId === task.id && v.status === "En attente");
  const canDecide = !!pending && canDecideValidation(me, pending);
  const canSubmit = task.status === "En cours" && !!task.validatorId && !!task.assigneeId && (task.assigneeId === me.id || me.systemRole === "ADMIN");
  const btn = `btn-o ${size === "sm" ? "btn-sm" : ""}`;
  const act = async (fn: () => Promise<boolean>) => { setBusy(true); await fn(); setBusy(false); };

  const transitions = canUpdate ? allowedTransitions(task) : [];
  if (!transitions.length && !canSubmit && !canDecide) return null;
  return (<div className="flex flex-wrap items-center gap-2" onClick={e => e.stopPropagation()}>
    {transitions.map(to => <button key={to} disabled={busy} className={to === "Bloquée" ? `${btn} text-red-700` : btn} onClick={() => act(() => s.changeTaskStatus(task.id, to))}>{LABEL(task.status, to)}</button>)}
    {canSubmit && <button disabled={busy} className={`btn ${size === "sm" ? "btn-sm" : ""}`} onClick={() => act(() => s.submitForValidation(task.id))}>Soumettre à validation</button>}
    {canDecide && !rejecting && <>
      <button disabled={busy} className={`btn ${size === "sm" ? "btn-sm" : ""}`} onClick={() => act(() => s.decideValidation(pending!.id, "approve"))}>Approuver</button>
      <button disabled={busy} className={`${btn} text-red-700`} onClick={() => setRejecting(true)}>Rejeter…</button></>}
    {canDecide && rejecting && <form className="flex w-full flex-col gap-2 sm:flex-row" onSubmit={async e => { e.preventDefault(); setBusy(true); const ok = await s.decideValidation(pending!.id, "reject", comment); setBusy(false); if (ok) { setRejecting(false); setComment(""); } }}>
      <input autoFocus value={comment} onChange={e => setComment(e.target.value)} placeholder="Motif du rejet (obligatoire)" aria-label="Motif du rejet" />
      <div className="flex gap-2"><button disabled={busy} className="btn-danger btn-sm">Rejeter</button><button type="button" className="btn-o btn-sm" onClick={() => setRejecting(false)}>Annuler</button></div></form>}
  </div>);
}
