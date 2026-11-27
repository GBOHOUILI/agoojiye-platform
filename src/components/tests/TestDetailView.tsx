"use client";
import Link from "next/link";
import { useState } from "react";
import { Back, Badge, fmt, NotFoundCard } from "@/components/shared/ui";
import { Can } from "@/components/shared/Can";
import { useDemoStore } from "@/hooks/demo-store";
import { componentsOf } from "@/services/components.service";
import { getTest, isMeasureOk } from "@/services/tests.service";
export default function TestDetailView({ id }: { id: string }) {
  const { anos, notes, addNote, seedOffsetDays } = useDemoStore(); const [t, setT] = useState(""); const e = getTest(id, seedOffsetDays);
  if (!e) return <NotFoundCard href="/tests" l="Retour aux essais" />;
  const an = anos.filter(a => a.essai === e.id), ns = notes[e.id] || [];
  return (<><Back href="/tests" l="Essais" />
    <div className="card mb-4"><div className="flex items-start justify-between gap-2"><div><div className="text-xs text-slate-500">{e.id} · {e.cat}</div><h1 className="text-xl font-semibold">{e.titre}</h1><p className="text-sm text-slate-500"><Link className="text-gold-700" href={`/prototypes/${e.proto}`}>{e.proto}</Link> · version {e.ver} · {fmt(e.date)} · {e.resp}</p></div><Badge v={e.res} /></div>
      <p className="mt-3 text-sm">Objectif : vérifier le critère « {e.titre.toLowerCase()} » selon un protocole fictif de démonstration.</p></div>
    <div className="grid gap-4 lg:grid-cols-2"><div className="card"><h2 className="mb-3 text-sm font-semibold">Mesures</h2>
      {e.m.length ? e.m.map(m => { const ok = isMeasureOk(m), pct = Math.min(100, m.val / Math.max(m.val, m.cible) * 100), d = +(m.val - m.cible).toFixed(2); return (<div key={m.nom} className="mb-3"><div className="flex justify-between gap-2 text-sm"><span>{m.nom}</span><b>{m.val} {m.unit}</b></div><div className="my-1.5 h-2 rounded bg-slate-200"><div className={`h-full rounded ${ok ? "bg-emerald-600" : "bg-red-600"}`} style={{ width: pct + "%" }} /></div><div className="text-xs text-slate-500">Cible fictive : {m.sens === "min" ? "≥" : "≤"} {m.cible} {m.unit} · écart {d > 0 ? "+" : ""}{d} {m.unit}</div></div>); }) : <p className="text-sm text-slate-500">Aucune mesure : essai en attente de réalisation.</p>}
      <p className="mt-2 text-xs text-slate-400">Valeurs et cibles fictives, non représentatives de spécifications validées.</p></div>
      <div className="card"><h2 className="mb-2 text-sm font-semibold">Anomalies associées</h2>{an.length ? an.map(a => <Link key={a.id} href={`/anomalies/${a.id}`} className="flex justify-between gap-2 border-b py-2.5 text-sm last:border-0"><span>{a.id} · {a.titre}</span><Badge v={a.g} /></Link>) : <p className="text-sm text-slate-500">Aucune anomalie associée.</p>}
        <h2 className="mb-2 mt-4 text-sm font-semibold">Observations</h2>{ns.map((n, i) => <div key={i} className="border-b py-2 text-sm">{n.t}<div className="text-xs text-slate-500">{fmt(n.d)} · {n.by}</div></div>)}
        <Can perm="note:add"><form className="mt-2 flex flex-col gap-2 sm:flex-row" onSubmit={ev => { ev.preventDefault(); if (t.trim().length < 3) return; addNote(e.id, t.trim()); setT(""); }}><input placeholder="Ajouter une observation" value={t} onChange={x => setT(x.target.value)} /><button className="btn">Ajouter</button></form></Can></div></div>
    <p className="mt-3 text-xs text-slate-400">Configuration {e.proto} : {componentsOf(e.proto).map(c => c.nom).join(", ")}.</p></>);
}
