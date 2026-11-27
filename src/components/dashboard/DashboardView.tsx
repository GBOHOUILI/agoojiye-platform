"use client";
import Link from "next/link";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge, fmt, PageTitle } from "@/components/shared/ui";
import { useDemoStore } from "@/hooks/demo-store";
import { dashboardStats } from "@/services/analytics.service";
import { getPrototypes } from "@/services/prototypes.service";
const GC: Record<string, string> = { Critique: "#b91c1c", Élevée: "#ea580c", Moyenne: "#d97706", Faible: "#64748b" };
const RC: [string, string][] = [["Réussi", "#059669"], ["À surveiller", "#d97706"], ["Échoué", "#b91c1c"], ["En attente", "#94a3b8"]];
export default function DashboardView() {
  const { anos, seedOffsetDays } = useDemoStore();
  const [per, setPer] = useState("all"), [pf, setPf] = useState("");
  const { kpis, gdata, pdata, act, att } = dashboardStats(anos, per, pf, seedOffsetDays);
  return (<>
    <PageTitle t="Synthèse ingénierie" s="Vue d’ensemble du suivi technique"><div className="flex w-full gap-2 sm:w-auto">
      <select value={pf} onChange={e => setPf(e.target.value)}><option value="">Tous les prototypes</option>{getPrototypes(seedOffsetDays).map(p => <option key={p.id} value={p.id}>{p.id}</option>)}</select>
      <select value={per} onChange={e => setPer(e.target.value)}><option value="all">Toute la période</option><option value="30">30 derniers jours</option><option value="60">60 derniers jours</option></select></div></PageTitle>
    <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">{kpis.map(([l, v, to]) => <Link key={l} href={to} className="card hover:border-gold-600"><div className="text-2xl font-semibold">{v}</div><div className="text-xs text-slate-500">{l}</div></Link>)}</div>
    <div className="mb-4 grid gap-4 lg:grid-cols-2">
      <div className="card min-w-0"><h2 className="mb-3 text-sm font-semibold">Anomalies ouvertes par gravité</h2><div className="h-56"><ResponsiveContainer><BarChart data={gdata}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="g" fontSize={11} /><YAxis allowDecimals={false} width={24} fontSize={11} /><Tooltip /><Bar dataKey="n" name="Anomalies" radius={[4, 4, 0, 0]}>{gdata.map(d => <Cell key={d.g} fill={GC[d.g]} />)}</Bar></BarChart></ResponsiveContainer></div></div>
      <div className="card min-w-0"><h2 className="mb-3 text-sm font-semibold">Progression des essais par prototype</h2><div className="h-56"><ResponsiveContainer><BarChart data={pdata}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="p" fontSize={11} /><YAxis allowDecimals={false} width={24} fontSize={11} /><Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} />{RC.map(([k, c]) => <Bar key={k} dataKey={k} stackId="a" fill={c} />)}</BarChart></ResponsiveContainer></div></div></div>
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="card"><h2 className="mb-2 text-sm font-semibold">Points nécessitant une attention</h2>{att.length ? att.map(x => <Link key={x.l} href={x.to} className="flex items-center justify-between gap-2 border-b py-2.5 text-sm last:border-0"><span className="min-w-0">{x.l}</span><Badge v={x.b} /></Link>) : <p className="py-4 text-sm text-slate-500">Rien à signaler.</p>}</div>
      <div className="card"><h2 className="mb-2 text-sm font-semibold">Activité récente</h2>{act.map((x, i) => <Link key={i} href={x.to} className="block border-b py-2.5 text-sm last:border-0">{x.l}<div className="text-xs text-slate-500">{fmt(x.d)} · {x.by}</div></Link>)}</div></div></>);
}
