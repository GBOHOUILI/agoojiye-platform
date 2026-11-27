import { COMPS } from "@/data/seed";
import { todayIso } from "@/lib/clock";
import type { AnomalyInput } from "@/lib/validations/anomaly";
import { Ano, STATUTS, Statut } from "@/types";
export const GRAVITES = ["Critique", "Élevée", "Moyenne", "Faible"];
export const nextStatut = (a: Ano): Statut | undefined => STATUTS[STATUTS.indexOf(a.s) + 1];
export const isOpen = (a: Ano) => a.s !== "Résolue";
export const filterAnomalies = (anos: Ano[], f: { q: string; proto: string; g: string; open: boolean }) => anos.filter(a => (!f.proto || a.proto === f.proto) && (!f.g || a.g === f.g) && (!f.open || isOpen(a)) && (a.titre + a.id).toLowerCase().includes(f.q.toLowerCase()));
export function buildAnomaly(anos: Ano[], i: AnomalyInput, by = "Utilisateur démo", reporterId?: string, day: string = todayIso()): Ano {
  const c = COMPS.find(x => x.ref === i.comp)!;
  // Max existing number + 1 (not length + 1): migrated data may have gaps, and save() upserts by id.
  const next = anos.reduce((m, a) => Math.max(m, Number(a.id.slice(4)) || 0), 0) + 1;
  return { id: "ANO-" + String(next).padStart(3, "0"), proto: i.proto, comp: c.ref, cat: c.cat, titre: i.titre, g: i.g, s: "Déclarée", date: day, resp: i.resp, ...(i.respTeamId ? { respTeamId: i.respTeamId } : {}), desc: i.desc || "Anomalie déclarée via la démonstration.", ...(reporterId ? { reporterId } : {}), tl: [{ d: day, t: "Anomalie déclarée", by }], act: [] };
}
export const applyStatut = (a: Ano, s: Statut, note: string, by = "Utilisateur démo", day: string = todayIso()): Ano => ({ ...a, s, tl: [...a.tl, { d: day, t: `Statut : ${s}${note ? " — " + note : ""}`, by }], act: s === "Résolue" ? a.act.map(x => ({ ...x, done: true })) : a.act });
