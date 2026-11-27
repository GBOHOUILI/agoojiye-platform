"use client";
import { useState } from "react";
import { Badge, fmt, PageTitle } from "@/components/shared/ui";
import { DataList } from "@/components/shared/DataList";
import { getPrototypes } from "@/services/prototypes.service";
import { filterTests, RESULTS } from "@/services/tests.service";
import { useDemoStore } from "@/hooks/demo-store";
export default function TestsView({ initialRes = "" }: { initialRes?: string }) {
  const [q, setQ] = useState(""), [p, setP] = useState(""), [r, setR] = useState(initialRes);
  const { seedOffsetDays } = useDemoStore();
  const rows = filterTests({ q, proto: p, res: r }, seedOffsetDays);
  return (<><PageTitle t="Essais techniques" s={`${rows.length} essai(s)`} />
    <div className="mb-4 grid gap-2 sm:grid-cols-3"><input placeholder="Rechercher un essai" value={q} onChange={e => setQ(e.target.value)} /><select value={p} onChange={e => setP(e.target.value)}><option value="">Tous les prototypes</option>{getPrototypes(seedOffsetDays).map(x => <option key={x.id}>{x.id}</option>)}</select><select value={r} onChange={e => setR(e.target.value)}><option value="">Tous les résultats</option>{RESULTS.map(x => <option key={x}>{x}</option>)}</select></div>
    <DataList rows={rows} href={e => `/tests/${e.id}`} cols={[{ h: "Réf.", r: e => <b>{e.id}</b> }, { h: "Essai", r: e => e.titre }, { h: "Prototype", r: e => `${e.proto} ${e.ver}` }, { h: "Catégorie", r: e => e.cat }, { h: "Date", r: e => fmt(e.date) }, { h: "Résultat", r: e => <Badge v={e.res} /> }]} /></>);
}
