"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge, fmt, PageTitle } from "@/components/shared/ui";
import { DataList } from "@/components/shared/DataList";
import { Can } from "@/components/shared/Can";
import { useDemoStore } from "@/hooks/demo-store";
import { anomalySchema } from "@/lib/validations/anomaly";
import { filterAnomalies, GRAVITES } from "@/services/anomalies.service";
import { componentsOf } from "@/services/components.service";
import { getPrototypes } from "@/services/prototypes.service";
export default function AnomaliesView({ initialG = "", initialOpen = false, initialDeclare = false }: { initialG?: string; initialOpen?: boolean; initialDeclare?: boolean }) {
  const { anos, declare, can, teams, seedOffsetDays } = useDemoStore();
  // Teams that own engineering anomalies (Engineering department).
  const ownerTeams = teams.filter(t => t.departmentId === "D-ENG"); const router = useRouter();
  const [q, setQ] = useState(""), [p, setP] = useState(""), [g, setG] = useState(initialG), [op, setOp] = useState(initialOpen);
  const [show, setShow] = useState(initialDeclare), [err, setErr] = useState(""), [f, setF] = useState({ titre: "", proto: "AG-01", comp: "", g: "Moyenne", resp: "Équipe Essais", respTeamId: "T-ESS", desc: "" });
  const comps = componentsOf(f.proto);
  const submit = (e: React.FormEvent) => { e.preventDefault(); const r = anomalySchema.safeParse({ ...f, comp: f.comp || comps[0].ref }); if (!r.success) return setErr(r.error.issues[0].message); setErr(""); router.push(`/anomalies/${declare(r.data)}`); };
  return (<><PageTitle t="Anomalies" s={`${filterAnomalies(anos, { q, proto: p, g, open: op }).length} anomalie(s)`}><Can perm="incident:declare"><button className="btn w-full sm:w-auto" onClick={() => setShow(!show)}>{show ? "Fermer" : "Déclarer une anomalie"}</button></Can></PageTitle>
    {show && can("incident:declare") && <form onSubmit={submit} className="card mb-4 grid gap-3 sm:grid-cols-2"><div className="sm:col-span-2"><label className="text-xs text-slate-500">Titre *</label><input value={f.titre} onChange={e => setF({ ...f, titre: e.target.value })} />{err && <p className="mt-1 text-xs text-red-700">{err}</p>}</div>
      <div><label className="text-xs text-slate-500">Prototype</label><select value={f.proto} onChange={e => setF({ ...f, proto: e.target.value, comp: "" })}>{getPrototypes(seedOffsetDays).map(x => <option key={x.id}>{x.id}</option>)}</select></div>
      <div><label className="text-xs text-slate-500">Composant</label><select value={f.comp} onChange={e => setF({ ...f, comp: e.target.value })}>{comps.map(c => <option key={c.ref} value={c.ref}>{c.nom}</option>)}</select></div>
      <div><label className="text-xs text-slate-500">Gravité</label><select value={f.g} onChange={e => setF({ ...f, g: e.target.value })}>{[...GRAVITES].reverse().map(x => <option key={x}>{x}</option>)}</select></div>
      <div><label className="text-xs text-slate-500">Équipe responsable</label><select value={f.respTeamId} onChange={e => setF({ ...f, respTeamId: e.target.value, resp: ownerTeams.find(t => t.id === e.target.value)?.name ?? "" })}>{ownerTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
      <div className="sm:col-span-2"><label className="text-xs text-slate-500">Description</label><textarea rows={3} value={f.desc} onChange={e => setF({ ...f, desc: e.target.value })} /></div><button className="btn sm:col-span-2">Déclarer</button></form>}
    <div className="mb-4 grid gap-2 sm:grid-cols-4"><input placeholder="Rechercher" value={q} onChange={e => setQ(e.target.value)} /><select value={p} onChange={e => setP(e.target.value)}><option value="">Tous les prototypes</option>{getPrototypes(seedOffsetDays).map(x => <option key={x.id}>{x.id}</option>)}</select><select value={g} onChange={e => setG(e.target.value)}><option value="">Toutes les gravités</option>{GRAVITES.map(x => <option key={x}>{x}</option>)}</select>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="!w-5" checked={op} onChange={e => setOp(e.target.checked)} />Ouvertes uniquement</label></div>
    <DataList rows={filterAnomalies(anos, { q, proto: p, g, open: op })} href={a => `/anomalies/${a.id}`} cols={[{ h: "Réf.", r: a => <b className={a.g === "Critique" ? "text-red-700" : ""}>{a.id}</b> }, { h: "Titre", r: a => a.titre }, { h: "Prototype", r: a => a.proto }, { h: "Gravité", r: a => <Badge v={a.g} /> }, { h: "Statut", r: a => a.s }, { h: "Déclarée", r: a => fmt(a.date) }]} /></>);
}
