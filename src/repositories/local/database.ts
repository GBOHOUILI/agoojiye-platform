import { ANOS0 } from "@/data/seed";
import { DEPARTMENTS0, TEAMS0, USERS0 } from "@/data/seed-org";
import { ACTIVITY0, NOTIFICATIONS0, PROJECT_MEMBERS0, PROJECTS0, PROTOTYPE_LINKS0, TASKS0, VALIDATIONS0 } from "@/data/seed-work";
import { INVOICES0, PURCHASE_ACTIVITY0, PURCHASE_NOTIFICATIONS0, PURCHASE_ORDERS0, PURCHASE_REQUESTS0, PURCHASE_VALIDATIONS0, QUOTES0, RECEIPTS0, SUPPLIERS0 } from "@/data/seed-purchasing";
import { nowIso, todayIso } from "@/lib/clock";
import { dayOffset, SEED_ANCHOR } from "@/lib/demo-clock";
import { rebaseDocument } from "@/data/rebase";
import type { ActivityEntry, Ano, Department, Ev, GoodsReceipt, Notification, Project, ProjectMember, PrototypeLink, PurchaseOrder, PurchaseRequest, Quote, Supplier, SupplierInvoice, Task, Team, User, ValidationRequest } from "@/types";

export const DB_KEY = "agj-demo-next-v3", V2_KEY = "agj-demo-next-v2", LEGACY_KEY = "agj-demo-next-v1";
export interface KeyValueStorage { getItem(k: string): string | null; setItem(k: string, v: string): void }

export interface PurchasingCollections {
  suppliers: Supplier[]; purchaseRequests: PurchaseRequest[]; quotes: Quote[]; purchaseOrders: PurchaseOrder[]; receipts: GoodsReceipt[]; invoices: SupplierInvoice[];
}
export interface DbDocument extends PurchasingCollections {
  version: 3; users: User[]; departments: Department[]; teams: Team[];
  projects: Project[]; projectMembers: ProjectMember[]; prototypeLinks: PrototypeLink[]; tasks: Task[];
  validations: ValidationRequest[]; anos: Ano[]; notes: Record<string, Ev[]>; notifications: Notification[]; activity: ActivityEntry[];
  /** Days the fictitious data were shifted by when this document was seeded; fixed for the document's life. */
  seedOffsetDays: number;
}

// Appended rows continue the existing sequence so they never collide with ids already in the document.
const maxSeq = (xs: { id: string }[]) => xs.reduce((m, x) => Math.max(m, Number(x.id.split("-").pop()) || 0), 0);
const seq = <T>(xs: T[], prefix: string, after: { id: string }[]) => xs.map((x, i) => ({ ...x, id: `${prefix}-${String(maxSeq(after) + 1 + i).padStart(3, "0")}` }));

const purchasingSeed = (): PurchasingCollections => ({
  suppliers: SUPPLIERS0, purchaseRequests: PURCHASE_REQUESTS0, quotes: QUOTES0, purchaseOrders: PURCHASE_ORDERS0, receipts: RECEIPTS0, invoices: INVOICES0,
});

// Appends the purchasing seed to a phase 2 document (fresh seed or migrated v2), renumbering appended notifications/activity.
// The appended seed rows are shifted by `days`; the base document keeps its own dates.
function withPurchasing(base: Omit<DbDocument, "version" | "seedOffsetDays" | keyof PurchasingCollections>, days: number): DbDocument {
  const p = rebaseDocument({ ...purchasingSeed(), validations: PURCHASE_VALIDATIONS0, notifications: seq(PURCHASE_NOTIFICATIONS0, "NTF", base.notifications), activity: seq(PURCHASE_ACTIVITY0, "ACT", base.activity) }, days);
  return structuredClone({
    ...base, version: 3, seedOffsetDays: days, suppliers: p.suppliers, purchaseRequests: p.purchaseRequests, quotes: p.quotes, purchaseOrders: p.purchaseOrders, receipts: p.receipts, invoices: p.invoices,
    validations: [...base.validations, ...p.validations!],
    notifications: [...base.notifications, ...p.notifications!],
    activity: [...base.activity, ...p.activity!],
  } as DbDocument);
}

/** Fictitious data shifted so that the demo always looks "current" on `today` (gaps between dates preserved). */
export const seedDocument = (today: string = todayIso()): DbDocument => {
  const days = dayOffset(today);
  return withPurchasing(rebaseDocument({
    users: USERS0, departments: DEPARTMENTS0, teams: TEAMS0, projects: PROJECTS0, projectMembers: PROJECT_MEMBERS0,
    prototypeLinks: PROTOTYPE_LINKS0, tasks: TASKS0, validations: VALIDATIONS0, anos: ANOS0, notes: {}, notifications: NOTIFICATIONS0, activity: ACTIVITY0,
  }, days), days);
};

const V2_COLLECTIONS = ["users", "departments", "teams", "projects", "projectMembers", "prototypeLinks", "tasks", "validations", "anos", "notifications", "activity"] as const;
const V3_COLLECTIONS = [...V2_COLLECTIONS, "suppliers", "purchaseRequests", "quotes", "purchaseOrders", "receipts", "invoices"] as const;

export const seedFor = (now: () => string) => seedDocument(todayIso(new Date(now())));

// Documents stored before the offset existed carry none: it is read back from a seeded anomaly, whose declaration date never changes.
export function inferSeedOffset(doc: { anos: Ano[] }): number {
  const seeded = ANOS0[0], storedAno = doc.anos.find(a => a.id === seeded.id);
  const days = storedAno && typeof storedAno.date === "string" ? dayOffset(storedAno.date.slice(0, 10), seeded.date) : 0;
  return Number.isFinite(days) ? days : 0;
}

export type LoadOutcome = "v3" | "migrated-v2" | "migrated" | "seeded" | "recovered";

const parse = (raw: string): unknown => { try { return JSON.parse(raw); } catch { return undefined; } };
const isObject = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null;

export function loadDocument(s: KeyValueStorage, now: () => string): { doc: DbDocument; outcome: LoadOutcome } {
  const fresh = () => seedFor(now);
  const valid = (x: unknown, version: number, keys: readonly string[]): x is Record<string, unknown> =>
    isObject(x) && x.version === version && keys.every(k => Array.isArray(x[k])) && isObject(x.notes);
  const rawV3 = s.getItem(DB_KEY);
  if (rawV3 !== null) {
    const v3 = parse(rawV3);
    if (!valid(v3, 3, V3_COLLECTIONS)) return { doc: fresh(), outcome: "recovered" };
    const doc = v3 as unknown as DbDocument;
    return { doc: typeof doc.seedOffsetDays === "number" ? doc : { ...doc, seedOffsetDays: inferSeedOffset(doc) }, outcome: "v3" };
  }
  const rawV2 = s.getItem(V2_KEY);
  if (rawV2 !== null) {
    const v2 = parse(rawV2);
    if (!valid(v2, 2, V2_COLLECTIONS)) return { doc: fresh(), outcome: "recovered" };
    // Phase 2 data is kept as-is (its seed was never shifted), so the added purchasing seed is not shifted either:
    // both stay on the same time base. The v2 key is never written.
    const doc = withPurchasing(v2 as unknown as Omit<DbDocument, "version" | "seedOffsetDays" | keyof PurchasingCollections>, 0);
    doc.activity.push({ id: `ACT-${String(maxSeq(doc.activity) + 1).padStart(3, "0")}`, at: now(), actorId: "system", action: "demo.migrated", entityType: "demo", entityId: "v2", summary: "Données migrées depuis la version 2 : module Achats ajouté, données existantes conservées." });
    return { doc, outcome: "migrated-v2" };
  }
  const rawV1 = s.getItem(LEGACY_KEY);
  if (rawV1 === null) return { doc: fresh(), outcome: "seeded" };
  const v1 = parse(rawV1);
  if (!isObject(v1) || !Array.isArray(v1.anos)) return { doc: fresh(), outcome: "recovered" };
  // v1 only held anomalies and notes, dated on the unshifted seed or by real use; the rest of the seed is not shifted
  // either, so everything stays on one time base. The v1 key is left untouched.
  const doc = seedDocument(SEED_ANCHOR);
  doc.anos = v1.anos as Ano[];
  doc.notes = isObject(v1.notes) ? (v1.notes as Record<string, Ev[]>) : {};
  doc.activity.push({ id: `ACT-${String(doc.activity.length + 1).padStart(3, "0")}`, at: now(), actorId: "system", action: "demo.migrated", entityType: "demo", entityId: "v1", summary: "Données migrées depuis la version 1 de la démonstration (anomalies et observations conservées)." });
  return { doc, outcome: "migrated" };
}

export class LocalDatabase {
  private doc: DbDocument;
  private listeners = new Set<() => void>();
  readonly outcome: LoadOutcome;

  constructor(private storage: KeyValueStorage | null, private now: () => string = nowIso) {
    if (!storage) { this.doc = seedFor(now); this.outcome = "seeded"; return; }
    const r = loadDocument(storage, now);
    this.doc = r.doc; this.outcome = r.outcome;
    if (r.outcome !== "v3") this.persist();
  }

  read(): DbDocument { return this.doc; }

  write(mutate: (d: DbDocument) => void): void {
    const next = structuredClone(this.doc);
    mutate(next);
    this.doc = next;
    this.persist(); this.emit();
  }

  replace(doc: DbDocument): void { this.doc = structuredClone(doc); this.persist(); this.emit(); }

  reloadFromStorage(): void {
    if (!this.storage) return;
    this.doc = loadDocument(this.storage, this.now).doc;
    this.emit();
  }

  subscribe(fn: () => void): () => void { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; }

  private persist() { try { this.storage?.setItem(DB_KEY, JSON.stringify(this.doc)); } catch { /* quota or private mode: keep in memory */ } }
  private emit() { this.listeners.forEach(fn => fn()); }
}
