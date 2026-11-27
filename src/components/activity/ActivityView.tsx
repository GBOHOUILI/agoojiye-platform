"use client";
import { Time } from "@/components/shared/Time";
import { History } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Avatar } from "@/components/shared/Avatar";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageTitle } from "@/components/shared/ui";
import { useDemoStore } from "@/hooks/demo-store";
import { canSeeProject } from "@/lib/access-simulation/permissions";
import { formatDate, groupByDay } from "@/lib/format";
import { displayName } from "@/lib/people";
import type { ActivityEntry, EntityType } from "@/types";

const TYPES: { id: EntityType; label: string }[] = [{ id: "project", label: "Projets" }, { id: "task", label: "Tâches" }, { id: "anomaly", label: "Anomalies" }, { id: "test", label: "Essais" }, { id: "user", label: "Collaborateurs" }, { id: "purchase", label: "Achats" }, { id: "supplier", label: "Fournisseurs" }, { id: "demo", label: "Démonstration" }];
const LINK: Partial<Record<EntityType, (id: string) => string>> = { project: id => `/projects/${id}`, task: id => `/tasks/${id}`, anomaly: id => `/anomalies/${id}`, test: id => `/tests/${id}`, user: id => `/organization?user=${id}`,
  purchase: id => (id.startsWith("DA-") ? `/purchasing/requests/${id}` : id.startsWith("BC-") ? `/purchasing/orders/${id}` : "/purchasing/invoices"),
  supplier: id => `/purchasing/suppliers/${id}` };

export default function ActivityView() {
  const s = useDemoStore(); const me = s.currentUser; const all = s.can("activity:read_all");
  const [actor, setActor] = useState(""), [type, setType] = useState(""), [period, setPeriod] = useState("all");
  const scope = { projects: s.projects, projectMembers: s.projectMembers, users: s.users };
  const projectOf = (e: ActivityEntry) => e.entityType === "project" ? e.entityId : e.entityType === "task" ? s.tasks.find(t => t.id === e.entityId)?.projectId : undefined;
  const visible = s.activity.filter(e => all || e.actorId === me.id || (() => { const p = projectOf(e); return !!p && canSeeProject(me, p, scope); })());
  const since = period === "all" ? "" : new Date(Date.now() - Number(period) * 86_400_000).toISOString();
  const rows = visible.filter(e => (!actor || e.actorId === actor) && (!type || e.entityType === type) && e.at >= since);
  const actors = s.users.filter(u => visible.some(e => e.actorId === u.id));
  return (<><PageTitle t={all ? "Journal d’activité" : "Mon activité"} s={all ? "Toutes les actions effectuées dans la démonstration" : "Vos actions et celles qui concernent vos projets"} />
    <div className="mb-4 grid gap-2 sm:grid-cols-3">
      <select aria-label="Acteur" value={actor} onChange={e => setActor(e.target.value)}><option value="">Tous les acteurs</option>{actors.map(u => <option key={u.id} value={u.id}>{displayName(u)}</option>)}</select>
      <select aria-label="Type d’objet" value={type} onChange={e => setType(e.target.value)}><option value="">Tous les objets</option>{TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}</select>
      <select aria-label="Période" value={period} onChange={e => setPeriod(e.target.value)}><option value="7">7 derniers jours</option><option value="30">30 derniers jours</option><option value="all">Toute la période</option></select></div>
    {rows.length ? <div className="space-y-4">{groupByDay(rows, e => e.at).map(g => (
      <section key={g.day} className="card"><h2 className="mb-1 text-sm font-semibold">{formatDate(g.day)}</h2>
        <ol>{g.items.map(e => { const u = s.users.find(x => x.id === e.actorId); const href = LINK[e.entityType]?.(e.entityId); return (
          <li key={e.id} className="flex gap-3 border-b py-2.5 last:border-0"><Avatar user={u} size="sm" />
            <div className="min-w-0 flex-1 text-sm">{href ? <Link href={href} className="hover:text-gold-800">{e.summary}</Link> : e.summary}
              <div className="text-xs text-slate-500"><Time iso={e.at} mode="time" /></div></div></li>); })}</ol></section>))}</div>
      : <div className="card"><EmptyState icon={History} title="Aucune action sur cette période" /></div>}</>);
}
