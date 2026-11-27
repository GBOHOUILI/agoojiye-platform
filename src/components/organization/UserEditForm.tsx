"use client";
import { useState } from "react";
import { useDemoStore } from "@/hooks/demo-store";
import { ROLE_LABELS } from "@/lib/access-simulation/roles";
import { displayName } from "@/lib/people";
import { SYSTEM_ROLES, type SystemRole, type User } from "@/types";

export function UserEditForm({ user }: { user: User }) {
  const s = useDemoStore(); const canRole = s.can("admin:access");
  const [f, setF] = useState({ jobTitle: user.jobTitle, teamId: user.teamId ?? "", managerId: user.managerId ?? "", systemRole: user.systemRole });
  const [busy, setBusy] = useState(false);
  const teams = s.teams.filter(t => t.departmentId === user.departmentId);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const patch = {
      ...(f.jobTitle !== user.jobTitle ? { jobTitle: f.jobTitle } : {}),
      ...(f.teamId !== (user.teamId ?? "") ? { teamId: f.teamId || null } : {}),
      ...(f.managerId !== (user.managerId ?? "") ? { managerId: f.managerId || null } : {}),
      ...(canRole && f.systemRole !== user.systemRole ? { systemRole: f.systemRole } : {}),
    };
    if (!Object.keys(patch).length) return;
    setBusy(true); await s.updateUser(user.id, patch); setBusy(false);
  };
  return (<form onSubmit={submit} className="space-y-3 rounded-lg border border-slate-200 p-3">
    <h3 className="text-sm font-semibold">Modifier la fiche</h3>
    <div><label className="field-label" htmlFor="ue-job">Fonction professionnelle</label><input id="ue-job" value={f.jobTitle} onChange={e => setF({ ...f, jobTitle: e.target.value })} /></div>
    <div className="grid gap-3 sm:grid-cols-2">
      <div><label className="field-label" htmlFor="ue-team">Équipe</label><select id="ue-team" value={f.teamId} onChange={e => setF({ ...f, teamId: e.target.value })}><option value="">Aucune équipe</option>{teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
      <div><label className="field-label" htmlFor="ue-mgr">Responsable hiérarchique</label><select id="ue-mgr" value={f.managerId} onChange={e => setF({ ...f, managerId: e.target.value })}><option value="">Aucun</option>{s.users.filter(u => u.active && u.id !== user.id).map(u => <option key={u.id} value={u.id}>{displayName(u)}</option>)}</select></div></div>
    <div><label className="field-label" htmlFor="ue-role">Rôle système (permissions simulées)</label>
      <select id="ue-role" disabled={!canRole} value={f.systemRole} onChange={e => setF({ ...f, systemRole: e.target.value as SystemRole })}>{SYSTEM_ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</select>
      {!canRole && <p className="mt-1 text-xs text-slate-500">Seul un administrateur peut changer le rôle système.</p>}</div>
    <button disabled={busy} className="btn w-full sm:w-auto">Enregistrer</button></form>);
}
