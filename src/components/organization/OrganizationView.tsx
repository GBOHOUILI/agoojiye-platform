"use client";
import { Info } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DataList } from "@/components/shared/DataList";
import { Drawer } from "@/components/shared/Drawer";
import { RoleBadge } from "@/components/shared/StatusBadge";
import { Tabs } from "@/components/shared/Tabs";
import { PageTitle } from "@/components/shared/ui";
import { UserLabel } from "@/components/shared/UserLabel";
import { useDemoStore } from "@/hooks/demo-store";
import { ROLE_LABELS } from "@/lib/access-simulation/roles";
import { displayName, nameOf } from "@/lib/people";
import { teamWorkload } from "@/services/space.service";
import { todayIso } from "@/lib/clock";
import { SYSTEM_ROLES } from "@/types";
import { UserSheet } from "./UserSheet";

export default function OrganizationView({ initialTab = "departments", userId }: { initialTab?: string; userId?: string }) {
  const s = useDemoStore(); const router = useRouter();
  const [tab, setTab] = useState(["departments", "teams", "people"].includes(initialTab) ? initialTab : "departments");
  const [q, setQ] = useState(""), [dept, setDept] = useState(""), [team, setTeam] = useState(""), [role, setRole] = useState("");
  const selected = userId ? s.users.find(u => u.id === userId) : undefined;
  const people = s.users.filter(u => (!dept || u.departmentId === dept) && (!team || u.teamId === team) && (!role || u.systemRole === role) && `${displayName(u)} ${u.jobTitle}`.toLowerCase().includes(q.toLowerCase()));
  const open = (id: string) => router.push(`/organization?tab=${tab}&user=${id}`, { scroll: false });

  return (<><PageTitle t="Organisation" s={`${s.departments.length} départements, ${s.teams.length} équipes, ${s.users.filter(u => u.active).length} collaborateurs`} />
    <details className="card mb-4 text-sm"><summary className="flex cursor-pointer items-center gap-2 font-medium"><Info size={16} className="text-gold-700" aria-hidden />Rôle système, fonction, département, équipe : quelle différence ?</summary>
      <dl className="mt-3 grid gap-3 sm:grid-cols-2">
        <div><dt className="font-medium">Rôle système</dt><dd className="text-slate-600">Profil applicatif qui détermine les permissions et l’espace (simulés dans cette démo).</dd></div>
        <div><dt className="font-medium">Fonction professionnelle</dt><dd className="text-slate-600">Intitulé de poste, purement descriptif. Exemple : « Ingénieure batterie ».</dd></div>
        <div><dt className="font-medium">Département</dt><dd className="text-slate-600">Rattachement administratif. Exemple : Ingénierie.</dd></div>
        <div><dt className="font-medium">Équipe</dt><dd className="text-slate-600">Unité opérationnelle facultative, dans un département. Elle définit le périmètre d’un responsable d’équipe.</dd></div></dl></details>
    <Tabs value={tab} onChange={setTab} tabs={[{ id: "departments", label: "Départements", count: s.departments.length }, { id: "teams", label: "Équipes", count: s.teams.length }, { id: "people", label: "Collaborateurs", count: s.users.length }]} />

    {tab === "departments" && <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{s.departments.map(d => { const members = s.users.filter(u => u.departmentId === d.id), teams = s.teams.filter(t => t.departmentId === d.id); return (
      <section key={d.id} className="card"><div className="flex items-baseline justify-between gap-2"><h2 className="font-semibold">{d.name}</h2><span className="text-xs text-slate-500">{d.code}</span></div>
        <div className="mt-2 text-xs text-slate-500">Responsable</div><div className="mt-1"><UserLabel userId={d.headId} empty="Non défini" /></div>
        <div className="mt-3 text-sm">{members.length} collaborateur(s)</div>
        <div className="mt-2 flex flex-wrap gap-1.5">{teams.map(t => <span key={t.id} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{t.name}</span>)}{!teams.length && <span className="text-xs text-slate-400">Aucune équipe</span>}</div>
        <button className="mt-3 text-xs font-medium text-gold-700 hover:underline" onClick={() => { setDept(d.id); setTeam(""); setTab("people"); }}>Voir les collaborateurs</button></section>); })}</div>}

    {tab === "teams" && <div className="grid gap-4 md:grid-cols-2">{s.teams.map(t => (
      <section key={t.id} className="card"><div className="flex items-baseline justify-between gap-2"><h2 className="font-semibold">{t.name}</h2><span className="text-xs text-slate-500">{s.departments.find(d => d.id === t.departmentId)?.name}</span></div>
        <div className="mt-1 text-xs text-slate-500">Responsable : {nameOf(s.users, t.leadId, "non défini")}</div>
        <table className="mt-2 w-full text-sm"><thead><tr className="text-left text-xs text-slate-500"><th className="py-1 font-medium">Membre</th><th className="py-1 text-right font-medium">Tâches ouvertes</th><th className="py-1 text-right font-medium">En retard</th></tr></thead>
          <tbody>{teamWorkload(s, t.id, todayIso()).map(r => <tr key={r.user.id} className="border-t"><td className="py-2"><button className="text-left" onClick={() => open(r.user.id)}><UserLabel userId={r.user.id} link={false} /></button></td><td className="py-2 text-right tabular-nums">{r.open}</td><td className={`py-2 text-right tabular-nums ${r.overdue ? "font-medium text-red-700" : ""}`}>{r.overdue}</td></tr>)}</tbody></table></section>))}</div>}

    {tab === "people" && <>
      <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4"><input placeholder="Nom ou fonction" aria-label="Rechercher un collaborateur" value={q} onChange={e => setQ(e.target.value)} />
        <select aria-label="Département" value={dept} onChange={e => { setDept(e.target.value); setTeam(""); }}><option value="">Tous les départements</option>{s.departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
        <select aria-label="Équipe" value={team} onChange={e => setTeam(e.target.value)}><option value="">Toutes les équipes</option>{s.teams.filter(t => !dept || t.departmentId === dept).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
        <select aria-label="Rôle système" value={role} onChange={e => setRole(e.target.value)}><option value="">Tous les rôles</option>{SYSTEM_ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</select></div>
      <DataList rows={people} href={u => `/organization?tab=people&user=${u.id}`} cols={[
        { h: "Collaborateur", r: u => <UserLabel userId={u.id} link={false} /> },
        { h: "Rôle système", r: u => <RoleBadge role={u.systemRole} /> },
        { h: "Fonction", r: u => u.jobTitle },
        { h: "Département", r: u => s.departments.find(d => d.id === u.departmentId)?.name },
        { h: "Équipe", r: u => s.teams.find(t => t.id === u.teamId)?.name ?? "—" },
        { h: "Responsable", r: u => nameOf(s.users, u.managerId) }]} /></>}

    <Drawer open={!!selected} onClose={() => router.push(`/organization?tab=${tab}`, { scroll: false })} title={selected ? displayName(selected) : ""}>{selected && <UserSheet user={selected} />}</Drawer></>);
}
