"use client";
import { useMemo, useState } from "react";
import { useDemoStore } from "@/hooks/demo-store";
import { displayName } from "@/lib/people";
import { taskSchema } from "@/lib/validations/task";
import { PRIORITIES, type Priority } from "@/types";
import { assigneeCandidates, creatableProjects, validatorCandidates } from "./task-scope";

// With `anomaly`, the form creates its corrective task: the project is imposed by the anomaly's prototype.
export function TaskForm({ initialProject, anomaly, onDone }: { initialProject?: string; anomaly?: { id: string; titre: string; projectId: string }; onDone: (id: string) => void }) {
  const s = useDemoStore(); const me = s.currentUser;
  const projects = creatableProjects(s, me).filter(p => !anomaly || p.id === anomaly.projectId);
  const [f, setF] = useState({ projectId: anomaly?.projectId ?? (projects.some(p => p.id === initialProject) ? initialProject! : projects[0]?.id ?? ""), title: anomaly ? `Action corrective : ${anomaly.titre}` : "", description: "", priority: "Normale" as Priority, dueDate: "", assigneeId: "", validatorId: "" });
  const [errors, setErrors] = useState<Record<string, string>>({}), [busy, setBusy] = useState(false);
  const assignees = useMemo(() => f.projectId ? assigneeCandidates(s, me, f.projectId) : [], [s, me, f.projectId]);
  const validators = validatorCandidates(s);
  if (!projects.length) return <p className="text-sm text-slate-600">Aucun projet ne vous permet de créer une tâche avec ce profil.</p>;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const input = { ...f, assigneeId: f.assigneeId || undefined, validatorId: f.validatorId || undefined, anomalyId: anomaly?.id };
    const r = taskSchema.safeParse(input);
    if (!r.success) { setErrors(Object.fromEntries(r.error.issues.map(i => [String(i.path[0]), i.message]))); return; }
    setErrors({}); setBusy(true); const id = await s.createTask(input); setBusy(false); if (id) onDone(id);
  };
  const Err = ({ k }: { k: string }) => errors[k] ? <p className="field-error">{errors[k]}</p> : null;
  return (<form onSubmit={submit} className="space-y-4" noValidate>
    {anomaly && <p className="rounded-md bg-gold-50 px-3 py-2 text-sm text-gold-800">Action corrective de {anomaly.id}, dans le projet du prototype concerné.</p>}
    <div><label className="field-label" htmlFor="tf-project">Projet *</label><select id="tf-project" disabled={!!anomaly} value={f.projectId} onChange={e => setF({ ...f, projectId: e.target.value, assigneeId: "" })}>{projects.map(p => <option key={p.id} value={p.id}>{p.code} {p.name}</option>)}</select><Err k="projectId" /></div>
    <div><label className="field-label" htmlFor="tf-title">Titre *</label><input id="tf-title" value={f.title} onChange={e => setF({ ...f, title: e.target.value })} /><Err k="title" /></div>
    <div><label className="field-label" htmlFor="tf-desc">Description</label><textarea id="tf-desc" rows={3} value={f.description} onChange={e => setF({ ...f, description: e.target.value })} /></div>
    <div className="grid gap-3 sm:grid-cols-2">
      <div><label className="field-label" htmlFor="tf-prio">Priorité</label><select id="tf-prio" value={f.priority} onChange={e => setF({ ...f, priority: e.target.value as Priority })}>{PRIORITIES.map(p => <option key={p}>{p}</option>)}</select></div>
      <div><label className="field-label" htmlFor="tf-due">Échéance *</label><input id="tf-due" type="date" value={f.dueDate} onChange={e => setF({ ...f, dueDate: e.target.value })} /><Err k="dueDate" /></div>
      <div><label className="field-label" htmlFor="tf-assignee">Responsable</label><select id="tf-assignee" value={f.assigneeId} onChange={e => setF({ ...f, assigneeId: e.target.value })}><option value="">Non attribuée</option>{assignees.map(u => <option key={u.id} value={u.id}>{displayName(u)}</option>)}</select>
        <p className="mt-1 text-xs text-slate-500">{me.systemRole === "TEAM_LEAD" ? "Membres de votre équipe uniquement." : "Membres du projet."}</p></div>
      <div><label className="field-label" htmlFor="tf-validator">Validateur</label><select id="tf-validator" value={f.validatorId} onChange={e => setF({ ...f, validatorId: e.target.value })}><option value="">Aucune validation</option>{validators.map(u => <option key={u.id} value={u.id}>{displayName(u)}</option>)}</select>
        <p className="mt-1 text-xs text-slate-500">Avec un validateur, la tâche doit être approuvée avant d’être terminée.</p></div></div>
    <button disabled={busy} className="btn w-full">Créer la tâche</button></form>);
}
