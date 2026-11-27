import { Ano, Comp, Essai, Gravite, Proto, STATUTS, Statut } from "@/types";
// Phase 1 owners were free text; they are linked to real collaborators and teams of the organisation.
const OWNER_ID: Record<string, string> = { "Karim Adjovi": "U-KAR", "Nadia Sossou": "U-NAD", "Yann Hounkpè": "U-YAN" };
const TEAM_BY_CATEGORY: Record<string, string> = { Batterie: "T-ENE", Électronique: "T-ELE", Propulsion: "T-PRO", Freinage: "T-ESS", "Résistance mécanique": "T-ESS" };
// Jeu de données entièrement fictif — aucune information réelle d'AGOOJIYÉ.
export const TODAY = "2026-11-26";
const PROTOS_RAW: Proto[] = [
  { id: "AG-01", ref: "AG-PR-001", nom: "Prototype électrique urbain", cat: "Véhicule électrique léger", version: "V1.2", statut: "En phase d’essais", resp: "Karim Adjovi", date: "2026-08-12", prog: 72, comps: ["BAT-001", "MOT-001", "CTR-001", "FRE-001", "SUS-001", "SEN-001"] },
  { id: "AG-02", ref: "AG-PR-002", nom: "Prototype utilitaire électrique", cat: "Véhicule utilitaire", version: "V0.8", statut: "En développement", resp: "Nadia Sossou", date: "2026-09-03", prog: 45, comps: ["BAT-002", "MOT-002", "CTR-001", "FRE-001", "CHA-001", "SEN-002"] },
  { id: "AG-03", ref: "AG-PR-003", nom: "Prototype de mobilité expérimentale", cat: "Prototype expérimental", version: "V0.4", statut: "En validation", resp: "Yann Hounkpè", date: "2026-09-15", prog: 88, comps: ["BAT-001", "MOT-001", "CTR-001", "REC-001", "DIR-001", "SEN-001"] },
];
export const PROTOS: Proto[] = PROTOS_RAW.map(p => ({ ...p, respId: OWNER_ID[p.resp] }));
export const COMPS: Comp[] = ([
  ["BAT-001", "Batterie lithium", "Énergie", "V1.2", "Validé"], ["BAT-002", "Batterie haute capacité", "Énergie", "V0.6", "En test"],
  ["MOT-001", "Moteur électrique", "Propulsion", "V1.0", "En test"], ["MOT-002", "Moteur utilitaire", "Propulsion", "V0.5", "En développement"],
  ["CTR-001", "Contrôleur électronique", "Électronique", "V0.9", "En validation"], ["FRE-001", "Système de freinage", "Sécurité", "V1.1", "Validé"],
  ["SUS-001", "Suspension avant", "Châssis", "V1.0", "En développement"], ["SEN-001", "Capteur de température", "Instrumentation", "V1.0", "Validé"],
  ["SEN-002", "Capteur de vitesse", "Instrumentation", "V0.8", "En test"], ["CHA-001", "Châssis modulaire", "Châssis", "V0.7", "En test"],
  ["REC-001", "Chargeur embarqué", "Énergie", "V0.4", "En développement"], ["DIR-001", "Direction assistée", "Sécurité", "V0.3", "En développement"],
] as string[][]).map(([ref, nom, cat, version, statut]) => ({ ref, nom, cat, version, statut }));
type M = [string, number, number, string, "min" | "max"];
const E: [string, string, string, string, string, string, string, string, M | null][] = [
  ["TES-001", "AG-01", "V1.2", "Test d’autonomie", "Autonomie", "Réussi", "2026-11-12", "Karim Adjovi", ["Autonomie", 163, 160, "km", "min"]],
  ["TES-002", "AG-01", "V1.2", "Test de température", "Température", "À surveiller", "2026-11-14", "Karim Adjovi", ["Température batterie", 47, 45, "°C", "max"]],
  ["TES-003", "AG-02", "V0.8", "Test de freinage", "Freinage", "Échoué", "2026-11-15", "Nadia Sossou", ["Distance de freinage", 8.4, 7.5, "m", "max"]],
  ["TES-004", "AG-02", "V0.8", "Test de batterie", "Batterie", "En attente", "2026-11-18", "Nadia Sossou", null],
  ["TES-005", "AG-03", "V0.4", "Test de résistance", "Résistance mécanique", "Réussi", "2026-11-19", "Yann Hounkpè", ["Charge supportée", 1250, 1200, "kg", "min"]],
  ["TES-006", "AG-01", "V1.1", "Test de propulsion", "Propulsion", "Réussi", "2026-10-20", "Karim Adjovi", ["Puissance maximale", 58, 55, "kW", "min"]],
  ["TES-007", "AG-01", "V1.1", "Test d’autonomie", "Autonomie", "À surveiller", "2026-10-08", "Karim Adjovi", ["Autonomie", 152, 160, "km", "min"]],
  ["TES-008", "AG-02", "V0.7", "Test de performance", "Performance", "Réussi", "2026-10-27", "Nadia Sossou", ["Accélération 0–50 km/h", 6.2, 7, "s", "max"]],
  ["TES-009", "AG-02", "V0.8", "Test de sécurité", "Sécurité", "Réussi", "2026-11-10", "Nadia Sossou", ["Temps de coupure", 0.4, 0.5, "s", "max"]],
  ["TES-010", "AG-03", "V0.4", "Test de température", "Température", "Réussi", "2026-11-05", "Yann Hounkpè", ["Température moteur", 68, 75, "°C", "max"]],
  ["TES-011", "AG-03", "V0.3", "Test de freinage", "Freinage", "Réussi", "2026-10-14", "Yann Hounkpè", ["Distance de freinage", 7.2, 7.5, "m", "max"]],
  ["TES-012", "AG-03", "V0.4", "Test de batterie", "Batterie", "Réussi", "2026-11-21", "Yann Hounkpè", ["Capacité restituée", 94, 90, "%", "min"]],
  ["TES-013", "AG-01", "V1.2", "Test de freinage", "Freinage", "Réussi", "2026-11-22", "Karim Adjovi", ["Distance de freinage", 7.3, 7.5, "m", "max"]],
  ["TES-014", "AG-01", "V1.0", "Test de résistance", "Résistance mécanique", "Échoué", "2026-09-25", "Karim Adjovi", ["Charge supportée", 1120, 1200, "kg", "min"]],
  ["TES-015", "AG-02", "V0.8", "Test de température", "Température", "En attente", "2026-11-24", "Nadia Sossou", null],
];
export const ESSAIS: Essai[] = E.map(([id, proto, ver, titre, cat, res, date, resp, m]) => ({ id, proto, ver, titre, cat, res, date, resp, respId: OWNER_ID[resp], m: m ? [{ nom: m[0], val: m[1], cible: m[2], unit: m[3], sens: m[4] }] : [] }));
const A: [string, string, string | undefined, string, string, string, Gravite, Statut, string, string, string][] = [
  ["ANO-001", "AG-01", "TES-002", "BAT-001", "Batterie", "Température supérieure à la plage cible", "Élevée", "En analyse", "2026-11-14", "Équipe technique", "Température supérieure à la valeur cible observée pendant l’essai."],
  ["ANO-002", "AG-02", "TES-003", "FRE-001", "Freinage", "Distance de freinage supérieure à la cible", "Critique", "Action corrective", "2026-11-15", "Équipe essais", "Distance mesurée de 8,4 m pour une cible fictive de 7,5 m."],
  ["ANO-003", "AG-03", undefined, "SEN-001", "Électronique", "Instabilité intermittente d’un capteur", "Moyenne", "Résolue", "2026-11-17", "Équipe technique", "Valeurs instables par intermittence sur le capteur de température."],
  ["ANO-004", "AG-01", "TES-007", "BAT-001", "Batterie", "Autonomie inférieure à la cible", "Moyenne", "Résolue", "2026-10-08", "Équipe technique", "Autonomie de 152 km pour une cible fictive de 160 km."],
  ["ANO-005", "AG-01", "TES-014", "SUS-001", "Résistance mécanique", "Déformation sous charge de la suspension", "Élevée", "Résolue", "2026-09-25", "Équipe essais", "Charge supportée inférieure à la cible lors de l’essai de résistance."],
  ["ANO-006", "AG-02", undefined, "CTR-001", "Électronique", "Message d’erreur intermittent du contrôleur", "Moyenne", "Déclarée", "2026-11-23", "Équipe technique", "Message d’erreur affiché de façon non reproductible."],
  ["ANO-007", "AG-02", undefined, "MOT-002", "Propulsion", "Vibrations du moteur à haut régime", "Faible", "En analyse", "2026-11-20", "Équipe essais", "Vibrations perceptibles au-delà d’un régime élevé."],
  ["ANO-008", "AG-03", undefined, "REC-001", "Batterie", "Temps de charge supérieur à la cible", "Faible", "Déclarée", "2026-11-22", "Équipe technique", "Temps de charge supérieur à l’objectif fixé pour la démonstration."],
];
export const ANOS0: Ano[] = A.map(([id, proto, essai, comp, cat, titre, g, s, date, resp, desc]) => ({
  id, proto, essai, comp, cat, titre, g, s, date, resp, respTeamId: TEAM_BY_CATEGORY[cat], desc,
  tl: STATUTS.slice(0, STATUTS.indexOf(s) + 1).map((st, i) => ({ d: date, t: i === 0 ? "Anomalie déclarée" : `Statut : ${st}`, by: resp })),
  act: [], // A1: corrective actions are the corrective tasks (Task.anomalyId); no generated placeholder
}));
