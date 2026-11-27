"use client";
import { Download, Printer } from "lucide-react";
import { PageTitle } from "@/components/shared/ui";
import { useDemoStore } from "@/hooks/demo-store";
import { getTests } from "@/services/tests.service";
function csv(name: string, rows: (string | number)[][]) {
  const body = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
  const url = URL.createObjectURL(new Blob(["\ufeff" + body], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}
export default function ReportsView() {
  const { anos, seedOffsetDays } = useDemoStore();
  const R = [
    ["Export des anomalies (CSV)", "Toutes les anomalies avec gravité, statut et composant.", () => csv("anomalies-demo.csv", [["Réf.", "Titre", "Prototype", "Composant", "Gravité", "Statut", "Date"], ...anos.map(a => [a.id, a.titre, a.proto, a.comp, a.g, a.s, a.date])])],
    ["Export des essais (CSV)", "Essais, versions de prototype, résultats et mesures.", () => csv("essais-demo.csv", [["Réf.", "Essai", "Prototype", "Version", "Résultat", "Date", "Mesure"], ...getTests(seedOffsetDays).map(e => [e.id, e.titre, e.proto, e.ver, e.res, e.date, e.m.map(m => `${m.nom}: ${m.val} ${m.unit}`).join(" | ")])])],
  ] as const;
  return (<><PageTitle t="Rapports et documentation" s="Exports de démonstration à partir des données fictives" />
    <div className="grid gap-4 md:grid-cols-3">{R.map(([t, d, fn]) => <div key={t} className="card"><h2 className="font-semibold">{t}</h2><p className="my-2 text-sm text-slate-500">{d}</p><button className="btn w-full" onClick={fn}><Download size={16} />Télécharger</button></div>)}
      <div className="card"><h2 className="font-semibold">Synthèse imprimable</h2><p className="my-2 text-sm text-slate-500">Imprimer ou enregistrer la page en PDF depuis le navigateur.</p><button className="btn-o w-full" onClick={() => window.print()}><Printer size={16} />Imprimer / PDF</button></div></div></>);
}
