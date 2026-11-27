export type Gravite = "Faible" | "Moyenne" | "Élevée" | "Critique";
export const STATUTS = ["Déclarée", "En analyse", "Action corrective", "En vérification", "Résolue"] as const;
export type Statut = (typeof STATUTS)[number];
export interface Proto { id: string; ref: string; nom: string; cat: string; version: string; statut: string; resp: string; respId?: string; date: string; prog: number; comps: string[] }
export interface Comp { ref: string; nom: string; cat: string; version: string; statut: string }
export interface Mesure { nom: string; val: number; cible: number; unit: string; sens: "min" | "max" }
export interface Essai { id: string; proto: string; ver: string; titre: string; cat: string; res: string; date: string; resp: string; respId?: string; m: Mesure[] }
export interface Ev { d: string; t: string; by: string }
export interface Ano { id: string; proto: string; essai?: string; comp: string; cat: string; titre: string; g: Gravite; s: Statut; date: string; resp: string; respTeamId?: string; desc: string; reporterId?: string; tl: Ev[]; act: { t: string; resp: string; done: boolean }[] }
export * from "./org";
export * from "./work";
export * from "./events";
export * from "./purchasing";
