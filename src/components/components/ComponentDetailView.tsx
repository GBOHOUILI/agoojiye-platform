"use client";
import Link from "next/link";
import { Back, Badge, NotFoundCard } from "@/components/shared/ui";
import { useDemoStore } from "@/hooks/demo-store";
import { getComponent, usedBy } from "@/services/components.service";
export default function ComponentDetailView({ id }: { id: string }) {
  const { anos } = useDemoStore(); const c = getComponent(id);
  if (!c) return <NotFoundCard href="/components" l="Retour aux composants" />;
  const ps = usedBy(c.ref), an = anos.filter(a => a.comp === c.ref);
  return (<><Back href="/components" l="Composants" />
    <div className="card mb-4"><div className="flex items-start justify-between gap-2"><div><div className="text-xs text-slate-500">{c.ref} · {c.cat} · {c.version}</div><h1 className="text-xl font-semibold">{c.nom}</h1></div><Badge v={c.statut} /></div></div>
    <div className="grid gap-4 md:grid-cols-2"><div className="card"><h2 className="mb-2 text-sm font-semibold">Utilisé par ({ps.length})</h2>{ps.map(p => <Link key={p.id} href={`/prototypes/${p.id}`} className="block border-b py-2.5 text-sm last:border-0">{p.id} · {p.nom}</Link>)}</div>
      <div className="card"><h2 className="mb-2 text-sm font-semibold">Anomalies liées ({an.length})</h2>{an.length ? an.map(a => <Link key={a.id} href={`/anomalies/${a.id}`} className="flex justify-between gap-2 border-b py-2.5 text-sm last:border-0"><span>{a.id} · {a.titre}</span><Badge v={a.g} /></Link>) : <p className="text-sm text-slate-500">Aucune anomalie liée.</p>}</div></div></>);
}
