"use client";
import Link from "next/link";
import { useState } from "react";
import { Badge, PageTitle } from "@/components/shared/ui";
import { useDemoStore } from "@/hooks/demo-store";
import { getPrototypes, prototypeStatuses, searchPrototypes } from "@/services/prototypes.service";
import { testsOf } from "@/services/tests.service";
import { isOpen } from "@/services/anomalies.service";
export default function PrototypesView() {
  const { anos, seedOffsetDays } = useDemoStore(); const [q, setQ] = useState(""), [st, setSt] = useState("");
  const rows = searchPrototypes(q, st, seedOffsetDays);
  return (<><PageTitle t="Prototypes" s={`${getPrototypes(seedOffsetDays).length} prototypes suivis`} />
    <div className="mb-4 flex flex-col gap-2 sm:flex-row"><input placeholder="Rechercher par référence ou nom" value={q} onChange={e => setQ(e.target.value)} /><select className="sm:max-w-xs" value={st} onChange={e => setSt(e.target.value)}><option value="">Tous les statuts</option>{prototypeStatuses().map(s => <option key={s}>{s}</option>)}</select></div>
    {rows.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{rows.map(p => <Link key={p.id} href={`/prototypes/${p.id}`} className="card hover:border-gold-600">
      <div className="flex items-start justify-between gap-2"><div><div className="text-xs text-slate-500">{p.ref} · {p.version}</div><div className="font-semibold">{p.nom}</div></div><Badge v={p.statut} /></div>
      <div className="my-3 h-2 rounded bg-slate-200"><div className="h-full rounded bg-gold-500" style={{ width: p.prog + "%" }} /></div>
      <div className="grid grid-cols-3 text-center text-xs"><div><b className="text-base">{p.prog} %</b><br />avancement technique</div><div><b className="text-base">{testsOf(p.id, seedOffsetDays).length}</b><br />essais</div><div><b className="text-base">{anos.filter(a => a.proto === p.id && isOpen(a)).length}</b><br />anomalies</div></div></Link>)}</div>
      : <div className="card py-10 text-center text-sm text-slate-500">Aucun prototype ne correspond à la recherche.</div>}</>);
}
