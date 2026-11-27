import { COMPS } from "@/data/seed";
import { engineeringData } from "@/data/engineering";
import { todayIso } from "@/lib/clock";
import { Ano } from "@/types";
import { GRAVITES, isOpen } from "./anomalies.service";
const days = (today: string, d: string) => (Date.parse(today) - Date.parse(d)) / 864e5;
// Last three calendar months ending with the month of `today` ("YYYY-MM").
const lastMonths = (today: string, n = 3) => Array.from({ length: n }, (_, i) => { const d = new Date(Date.UTC(+today.slice(0, 4), +today.slice(5, 7) - 1 - (n - 1 - i), 1)); return d.toISOString().slice(0, 7); });
const count = <T,>(x: T[], f: (v: T) => string) => Object.entries(x.reduce<Record<string, number>>((o, v) => { const k = f(v); o[k] = (o[k] || 0) + 1; return o; }, {})).map(([k, n]) => ({ k, n })).sort((a, b) => b.n - a.n);
// `offset` dates the read-only engineering data like the stored ones; `today` anchors the period windows.
export function dashboardStats(anos: Ano[], per: string, pf: string, offset: number, today: string = todayIso()) {
  const { prototypes: PROTOS, tests: ESSAIS } = engineeringData(offset);
  const es = ESSAIS.filter(e => (!pf || e.proto === pf) && (per === "all" || days(today, e.date) <= +per));
  const ouv = anos.filter(a => (!pf || a.proto === pf) && isOpen(a));
  const faits = es.filter(e => e.res !== "En attente"), ok = es.filter(e => e.res === "Réussi"), pr = PROTOS.filter(p => !pf || p.id === pf);
  const kpis: [string, string | number, string][] = [
    ["Prototypes", pr.length, "/prototypes"], ["En développement", pr.filter(p => p.statut === "En développement").length, "/prototypes"], ["En phase d’essais", pr.filter(p => p.statut.includes("essais")).length, "/prototypes"],
    ["Essais réalisés", faits.length, "/tests"], ["Essais réussis", ok.length, "/tests?res=Réussi"], ["Essais en attente", es.length - faits.length, "/tests?res=En attente"],
    ["Anomalies ouvertes", ouv.length, "/anomalies?open=1"], ["Anomalies critiques", ouv.filter(a => a.g === "Critique").length, "/anomalies?open=1&g=Critique"], ["Taux de réussite", faits.length ? Math.round(ok.length / faits.length * 100) + " %" : "—", "/analytics"]];
  const gdata = GRAVITES.map(g => ({ g, n: ouv.filter(a => a.g === g).length }));
  const pdata = pr.map(p => { const x = es.filter(e => e.proto === p.id); const c = (r: string) => x.filter(e => e.res === r).length; return { p: p.id, Réussi: c("Réussi"), "À surveiller": c("À surveiller"), Échoué: c("Échoué"), "En attente": c("En attente") }; });
  const act = [...anos.flatMap(a => a.tl.map(t => ({ d: t.d, by: t.by, to: `/anomalies/${a.id}`, l: `${a.id} · ${t.t}` }))), ...ESSAIS.map(e => ({ d: e.date, by: e.resp, to: `/tests/${e.id}`, l: `${e.id} · ${e.titre} (${e.res})` }))].sort((a, b) => b.d.localeCompare(a.d)).slice(0, 7);
  const att = [...ouv.filter(a => a.g === "Critique" || a.g === "Élevée").map(a => ({ to: `/anomalies/${a.id}`, l: `${a.id} · ${a.titre}`, b: a.g as string })), ...es.filter(e => e.res === "Échoué" || e.res === "À surveiller").map(e => ({ to: `/tests/${e.id}`, l: `${e.id} · ${e.titre}`, b: e.res }))];
  return { kpis, gdata, pdata, act, att };
}
export function analyticsStats(anos: Ano[], p: string, c: string, offset: number, today: string = todayIso()) {
  const { prototypes: PROTOS, tests: ESSAIS } = engineeringData(offset);
  const es = ESSAIS.filter(e => (!p || e.proto === p) && (!c || e.cat === c) && e.res !== "En attente"), an = anos.filter(a => (!p || a.proto === p) && (!c || a.cat === c));
  const mois = lastMonths(today).map(m => { const x = es.filter(e => e.date.startsWith(m)); return { m: `${m.slice(5)}/${m.slice(0, 4)}`, Réussis: x.filter(e => e.res === "Réussi").length, "Échoués / à surveiller": x.filter(e => e.res !== "Réussi").length }; });
  const taux = PROTOS.map(x => { const y = ESSAIS.filter(e => e.proto === x.id && e.res !== "En attente"); return { k: x.id, taux: y.length ? Math.round(y.filter(e => e.res === "Réussi").length / y.length * 100) : 0 }; });
  return { mois, taux, cats: count(an, a => a.cat), byComp: count(an, a => COMPS.find(x => x.ref === a.comp)!.nom).slice(0, 5) };
}
