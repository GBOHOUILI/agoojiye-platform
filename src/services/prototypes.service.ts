import { PROTOS } from "@/data/seed";
import { engineeringData } from "@/data/engineering";
// Dated reads take the demo document's seed offset (store: seedOffsetDays); existence checks need no date.
export const prototypeExists = (id: string) => PROTOS.some(p => p.id === id);
export const getPrototypes = (offset: number) => engineeringData(offset).prototypes;
export const getPrototype = (id: string, offset: number) => getPrototypes(offset).find(p => p.id === id);
export const prototypeStatuses = () => [...new Set(PROTOS.map(p => p.statut))];
export const searchPrototypes = (q: string, st: string, offset: number) => getPrototypes(offset).filter(p => (!st || p.statut === st) && (p.nom + p.ref + p.id).toLowerCase().includes(q.toLowerCase()));
