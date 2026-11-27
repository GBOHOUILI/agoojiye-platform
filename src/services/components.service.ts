import { COMPS, PROTOS } from "@/data/seed";
export const getComponents = () => COMPS;
export const getComponent = (ref: string) => COMPS.find(c => c.ref === ref);
export const componentCategories = () => [...new Set(COMPS.map(c => c.cat))];
export const componentsOf = (protoId: string) => (PROTOS.find(p => p.id === protoId)?.comps ?? []).map(r => COMPS.find(c => c.ref === r)!).filter(Boolean);
export const usedBy = (ref: string) => PROTOS.filter(p => p.comps.includes(ref));
export const searchComponents = (q: string, cat: string) => COMPS.filter(c => (!cat || c.cat === cat) && (c.nom + c.ref).toLowerCase().includes(q.toLowerCase()));
