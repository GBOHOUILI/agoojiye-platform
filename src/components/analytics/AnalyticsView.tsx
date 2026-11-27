"use client";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageTitle } from "@/components/shared/ui";
import { useDemoStore } from "@/hooks/demo-store";
import { analyticsStats } from "@/services/analytics.service";
import { getPrototypes } from "@/services/prototypes.service";
import { testCategories } from "@/services/tests.service";
const Chart = ({ t, children }: { t: string; children: React.ReactElement }) => <div className="card min-w-0"><h2 className="mb-3 text-sm font-semibold">{t}</h2><div className="h-60"><ResponsiveContainer>{children}</ResponsiveContainer></div></div>;
export default function AnalyticsView() {
  const { anos, seedOffsetDays } = useDemoStore(); const [p, setP] = useState(""), [c, setC] = useState("");
  const { mois, taux, cats, byComp } = analyticsStats(anos, p, c, seedOffsetDays);
  return (<><PageTitle t="Analyse et performance" s="Calculée à partir des mêmes données que les autres modules"><div className="flex w-full gap-2 sm:w-auto"><select value={p} onChange={e => setP(e.target.value)}><option value="">Tous les prototypes</option>{getPrototypes(seedOffsetDays).map(x => <option key={x.id}>{x.id}</option>)}</select><select value={c} onChange={e => setC(e.target.value)}><option value="">Toutes les catégories</option>{testCategories().map(x => <option key={x}>{x}</option>)}</select></div></PageTitle>
    <div className="grid gap-4 lg:grid-cols-2">
      <Chart t="Résultats des essais par mois"><BarChart data={mois}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="m" fontSize={11} /><YAxis allowDecimals={false} width={24} fontSize={11} /><Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} /><Bar dataKey="Réussis" fill="#059669" /><Bar dataKey="Échoués / à surveiller" fill="#d97706" /></BarChart></Chart>
      <Chart t="Taux de réussite par prototype (%)"><BarChart data={taux}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="k" fontSize={11} /><YAxis domain={[0, 100]} width={30} fontSize={11} /><Tooltip /><Bar dataKey="taux" name="Taux (%)" fill="#c79a2b" radius={[4, 4, 0, 0]} /></BarChart></Chart>
      <Chart t="Anomalies par catégorie"><BarChart data={cats} layout="vertical"><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" allowDecimals={false} fontSize={11} /><YAxis type="category" dataKey="k" width={100} fontSize={11} /><Tooltip /><Bar dataKey="n" name="Anomalies" fill="#b45309" /></BarChart></Chart>
      <div className="card"><h2 className="mb-3 text-sm font-semibold">Composants présentant le plus d’anomalies</h2>{byComp.length ? byComp.map(x => <div key={x.k} className="flex items-center gap-3 border-b py-2.5 text-sm last:border-0"><span className="flex-1">{x.k}</span><div className="h-2 w-24 rounded bg-slate-200"><div className="h-full rounded bg-amber-600" style={{ width: x.n / byComp[0].n * 100 + "%" }} /></div><b>{x.n}</b></div>) : <p className="text-sm text-slate-500">Aucune anomalie pour ces filtres.</p>}</div></div></>);
}
