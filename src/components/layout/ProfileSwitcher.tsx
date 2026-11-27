"use client";
import { Check, ChevronDown, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Avatar } from "@/components/shared/Avatar";
import { ROLE_TONE } from "@/components/shared/tones";
import { useDemoStore } from "@/hooks/demo-store";
import { ROLE_LABELS } from "@/lib/access-simulation/roles";
import { displayName } from "@/lib/people";
import { SYSTEM_ROLES } from "@/types";

export function ProfileSwitcher() {
  const { users, teams, currentUser, switchUser, ready } = useDemoStore();
  const [open, setOpen] = useState(false), [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown); document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);
  const groups = useMemo(() => {
    const s = q.trim().toLowerCase();
    const match = users.filter(u => u.active && (!s || `${displayName(u)} ${u.jobTitle} ${ROLE_LABELS[u.systemRole]}`.toLowerCase().includes(s)));
    return SYSTEM_ROLES.map(r => ({ role: r, users: match.filter(u => u.systemRole === r) })).filter(g => g.users.length);
  }, [users, q]);
  const teamName = (id?: string) => teams.find(t => t.id === id)?.name;

  return (<div ref={ref} className="relative">
    <button onClick={() => setOpen(!open)} aria-expanded={open} aria-haspopup="dialog" aria-label={`Profil simulé : ${displayName(currentUser)}, ${ROLE_LABELS[currentUser.systemRole]}. Changer de profil`}
      className={`flex min-h-[40px] items-center gap-2 rounded-xl border border-slate-200 bg-white py-1 pl-1 pr-2 hover:bg-slate-50 ${ready ? "" : "opacity-60"}`}>
      <Avatar user={currentUser} size="md" />
      <span className="hidden text-left leading-tight sm:block"><span className="block text-sm font-medium">{displayName(currentUser)}</span><span className="block text-xs text-slate-500">{ROLE_LABELS[currentUser.systemRole]}</span></span>
      <ChevronDown size={16} className="text-slate-400" aria-hidden /></button>
    {open && (<div role="dialog" aria-label="Changer de profil simulé" className="fixed inset-x-2 top-16 z-50 flex max-h-[75vh] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96">
      <div className="border-b p-3"><div className="mb-2 text-sm font-semibold">Voir la plateforme en tant que…</div>
        <label className="relative block"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden /><input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Nom, fonction ou rôle" className="!pl-9" aria-label="Rechercher un profil" /></label></div>
      <div className="flex-1 overflow-y-auto py-1">
        {groups.map(g => (<div key={g.role} className="py-1"><div className="flex items-center gap-2 px-3 py-1 text-xs font-medium text-slate-500"><span className={`h-2 w-2 rounded-full ${ROLE_TONE[g.role].dot}`} aria-hidden />{ROLE_LABELS[g.role]}</div>
          {g.users.map(u => { const on = u.id === currentUser.id; return (
            <button key={u.id} onClick={() => { switchUser(u.id); setOpen(false); setQ(""); }} className={`flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-slate-50 ${on ? "bg-gold-50" : ""}`}>
              <Avatar user={u} size="sm" /><span className="min-w-0 flex-1"><span className="block truncate text-sm">{displayName(u)}</span><span className="block truncate text-xs text-slate-500">{u.jobTitle}{teamName(u.teamId) ? `, ${teamName(u.teamId)}` : ""}</span></span>
              {on && <Check size={16} className="text-gold-700" aria-label="Profil actif" />}</button>); })}</div>))}
        {!groups.length && <p className="px-3 py-6 text-center text-sm text-slate-500">Aucun profil ne correspond.</p>}</div>
      <div className="border-t bg-amber-50 px-3 py-2 text-xs text-amber-900">Simulation : aucun mot de passe, aucun contrôle d’accès réel. Le profil choisi détermine seulement ce que l’interface affiche.</div></div>)}
    <span className="sr-only" aria-live="polite">{ready ? `Profil actif : ${displayName(currentUser)}` : ""}</span>
  </div>);
}
