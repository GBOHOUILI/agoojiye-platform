"use client";
import { useState } from "react";
import { Badge, PageTitle } from "@/components/shared/ui";
import { DataList } from "@/components/shared/DataList";
import { componentCategories, searchComponents, usedBy } from "@/services/components.service";
export default function ComponentsView() {
  const [q, setQ] = useState(""), [c, setC] = useState("");
  return (<><PageTitle t="Composants" s="Références, versions et statuts de validation" />
    <div className="mb-4 flex flex-col gap-2 sm:flex-row"><input placeholder="Rechercher un composant" value={q} onChange={e => setQ(e.target.value)} /><select className="sm:max-w-xs" value={c} onChange={e => setC(e.target.value)}><option value="">Toutes les catégories</option>{componentCategories().map(x => <option key={x}>{x}</option>)}</select></div>
    <DataList rows={searchComponents(q, c)} href={x => `/components/${x.ref}`} cols={[{ h: "Réf.", r: x => <b>{x.ref}</b> }, { h: "Composant", r: x => x.nom }, { h: "Catégorie", r: x => x.cat }, { h: "Version", r: x => x.version }, { h: "Statut", r: x => <Badge v={x.statut} /> }, { h: "Prototypes", r: x => usedBy(x.ref).map(p => p.id).join(", ") }]} /></>);
}
