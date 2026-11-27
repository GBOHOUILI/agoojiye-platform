import { ESSAIS } from "@/data/seed";
import { engineeringData } from "@/data/engineering";
import type { Mesure } from "@/types";
export const RESULTS = ["Réussi", "À surveiller", "Échoué", "En attente"];
// Dated reads take the demo document's seed offset (store: seedOffsetDays); existence checks need no date.
export const testExists = (id: string) => ESSAIS.some(e => e.id === id);
export const getTests = (offset: number) => engineeringData(offset).tests;
export const getTest = (id: string, offset: number) => getTests(offset).find(e => e.id === id);
export const testsOf = (proto: string, offset: number) => getTests(offset).filter(e => e.proto === proto);
export const testCategories = () => [...new Set(ESSAIS.map(e => e.cat))];
export const isMeasureOk = (m: Mesure) => (m.sens === "min" ? m.val >= m.cible : m.val <= m.cible);
export const filterTests = (f: { q: string; proto: string; res: string }, offset: number) => getTests(offset).filter(e => (!f.proto || e.proto === f.proto) && (!f.res || e.res === f.res) && (e.titre + e.id + e.cat).toLowerCase().includes(f.q.toLowerCase())).sort((a, b) => b.date.localeCompare(a.date));
