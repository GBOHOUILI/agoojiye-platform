"use client";
import Link from "next/link";
import { Avatar } from "@/components/shared/Avatar";
import { RoleBadge, TaskStatusBadge } from "@/components/shared/StatusBadge";
import { UserLabel } from "@/components/shared/UserLabel";
import { useDemoStore } from "@/hooks/demo-store";
import { displayName } from "@/lib/people";
import { directReports } from "@/services/organization.service";
import type { User } from "@/types";
import { UserEditForm } from "./UserEditForm";

export function UserSheet({ user }: { user: User }) {
  const s = useDemoStore();
  const memberships = s.projectMembers.filter(m => m.userId === user.id);
  const reports = directReports(s.users, user.id);
  const open = s.tasks.filter(t => t.assigneeId === user.id && t.status !== "Terminée");
  const Row = ({ k, children }: { k: string; children: React.ReactNode }) => <div className="grid grid-cols-[9rem_1fr] gap-2 border-b py-2 text-sm last:border-0"><dt className="text-slate-500">{k}</dt><dd className="min-w-0">{children}</dd></div>;
  return (<div className="space-y-5">
    <div className="flex items-center gap-3"><Avatar user={user} size="lg" /><div><div className="text-lg font-semibold">{displayName(user)}</div><div className="text-sm text-slate-600">{user.jobTitle}</div><div className="mt-1"><RoleBadge role={user.systemRole} /></div></div></div>
    <dl>
      <Row k="Rôle système"><RoleBadge role={user.systemRole} /></Row>
      <Row k="Fonction">{user.jobTitle}</Row>
      <Row k="Département">{s.departments.find(d => d.id === user.departmentId)?.name}</Row>
      <Row k="Équipe">{s.teams.find(t => t.id === user.teamId)?.name ?? <span className="text-slate-400">Aucune</span>}</Row>
      <Row k="Responsable">{user.managerId ? <UserLabel userId={user.managerId} /> : <span className="text-slate-400">Aucun</span>}</Row>
      <Row k="E-mail (fictif)">{user.email}</Row></dl>
    <section><h3 className="mb-1 text-sm font-semibold">Collaborateurs directs ({reports.length})</h3>{reports.length ? <div className="flex flex-col gap-1.5">{reports.map(r => <UserLabel key={r.id} userId={r.id} />)}</div> : <p className="text-sm text-slate-500">Aucun.</p>}</section>
    <section><h3 className="mb-1 text-sm font-semibold">Projets ({memberships.length})</h3>{memberships.length ? memberships.map(m => { const p = s.projects.find(x => x.id === m.projectId); return <Link key={m.projectId} href={`/projects/${m.projectId}`} className="flex justify-between gap-2 border-b py-2 text-sm last:border-0 hover:text-gold-800"><span className="truncate">{p?.name}</span><span className="shrink-0 text-xs text-slate-500">{m.projectRole}</span></Link>; }) : <p className="text-sm text-slate-500">Aucun projet.</p>}</section>
    <section><h3 className="mb-1 text-sm font-semibold">Tâches ouvertes ({open.length})</h3>{open.map(t => <Link key={t.id} href={`/tasks/${t.id}`} className="flex items-center justify-between gap-2 border-b py-2 text-sm last:border-0 hover:text-gold-800"><span className="truncate">{t.title}</span><TaskStatusBadge s={t.status} /></Link>)}{!open.length && <p className="text-sm text-slate-500">Aucune.</p>}</section>
    {s.can("org:manage") && <UserEditForm key={`${user.id}-${user.teamId}-${user.managerId}-${user.systemRole}-${user.jobTitle}`} user={user} />}
  </div>);
}
