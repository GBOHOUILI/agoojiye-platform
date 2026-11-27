"use client";
import { useState } from "react";
import { useDemoStore } from "@/hooks/demo-store";
import { hasPermission } from "@/lib/access-simulation/permissions";
import { displayName } from "@/lib/people";
import { projectSchema } from "@/lib/validations/project";
import { PRIORITIES, type Priority } from "@/types";
import { todayIso } from "@/lib/clock";

export function ProjectForm({ onDone }: { onDone: (id: string) => void }) {
  const s = useDemoStore(); const me = s.currentUser;
  // Only an administrator may create a project on behalf of another manager (enforced by the service).
  const owners = me.systemRole === "ADMIN" ? s.users.filter(u => u.active && hasPermission(u, "project:manage") && u.systemRole !== "ADMIN") : [me];
  const [f, setF] = useState({ name: "", description: "", priority: "Normale" as Priority, startDate: todayIso(), dueDate: "", ownerId: owners.some(o => o.id === me.id) ? me.id : owners[0]?.id ?? "", departmentId: me.departmentId, memberIds: [] as string[] });
  const [errors, setErrors] = useState<Record<string, string>>({}), [busy, setBusy] = useState(false);
  const toggle = (id: string) => setF(p => ({ ...p, memberIds: p.memberIds.includes(id) ? p.memberIds.filter(x => x !== id) : [...p.memberIds, id] }));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = projectSchema.safeParse(f);
    if (!r.success) { setErrors(Object.fromEntries(r.error.issues.map(i => [String(i.path[0]), i.message]))); return; }
    setErrors({}); setBusy(true); const id = await s.createProject(f); setBusy(false); if (id) onDone(id);
  };
  const Err = ({ k }: { k: string }) => errors[k] ? <p className="field-error">{errors[k]}</p> : null;
  return (<form onSubmit={submit} className="space-y-4" noValidate>
    <div><label className="field-label" htmlFor="pf-name">Nom du projet *</label><input id="pf-name" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /><Err k="name" /></div>
    <div><label className="field-label" htmlFor="pf-desc">Description</label><textarea id="pf-desc" rows={3} value={f.description} onChange={e => setF({ ...f, description: e.target.value })} /></div>
    <div className="grid gap-3 sm:grid-cols-2">
      <div><label className="field-label" htmlFor="pf-owner">Chef de projet *</label><select id="pf-owner" disabled={owners.length < 2} value={f.ownerId} onChange={e => setF({ ...f, ownerId: e.target.value })}>{owners.map(u => <option key={u.id} value={u.id}>{displayName(u)}</option>)}</select><Err k="ownerId" /></div>
      <div><label className="field-label" htmlFor="pf-prio">Priorité</label><select id="pf-prio" value={f.priority} onChange={e => setF({ ...f, priority: e.target.value as Priority })}>{PRIORITIES.map(p => <option key={p}>{p}</option>)}</select></div>
      <div><label className="field-label" htmlFor="pf-start">Début *</label><input id="pf-start" type="date" value={f.startDate} onChange={e => setF({ ...f, startDate: e.target.value })} /><Err k="startDate" /></div>
      <div><label className="field-label" htmlFor="pf-due">Échéance *</label><input id="pf-due" type="date" value={f.dueDate} onChange={e => setF({ ...f, dueDate: e.target.value })} /><Err k="dueDate" /></div>
      <div className="sm:col-span-2"><label className="field-label" htmlFor="pf-dept">Département</label><select id="pf-dept" value={f.departmentId} onChange={e => setF({ ...f, departmentId: e.target.value })}>{s.departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div></div>
    <fieldset><legend className="field-label">Membres ({f.memberIds.length})</legend>
      <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200">{s.users.filter(u => u.active && u.id !== f.ownerId).map(u => (
        <label key={u.id} className="flex cursor-pointer items-center gap-3 border-b px-3 py-2 text-sm last:border-0 hover:bg-slate-50"><input type="checkbox" className="!w-4" checked={f.memberIds.includes(u.id)} onChange={() => toggle(u.id)} />
          <span className="flex-1">{displayName(u)}<span className="block text-xs text-slate-500">{u.jobTitle}</span></span></label>))}</div>
      <p className="mt-1 text-xs text-slate-500">Les membres ajoutés reçoivent une notification.</p></fieldset>
    <button disabled={busy} className="btn w-full">Créer le projet</button></form>);
}
