import { describe, expect, it } from "vitest";
import { DB_KEY, LEGACY_KEY, loadDocument, LocalDatabase, seedDocument, V2_KEY, type KeyValueStorage } from "./database";

const mem = (init: Record<string, string> = {}): KeyValueStorage & { data: Record<string, string> } =>
  ({ data: { ...init }, getItem(k) { return this.data[k] ?? null; }, setItem(k, v) { this.data[k] = v; } });
const now = () => "2026-11-26T10:00:00.000Z";
// A v2 document as phase 2 stored it: no purchasing collections.
const seedV2Like = () => {
  const { suppliers: _a, purchaseRequests: _b, quotes: _c, purchaseOrders: _d, receipts: _e, invoices: _f, ...rest } = seedDocument();
  return { ...rest, version: 2, validations: rest.validations.filter(v => v.subjectType === "task") };
};

describe("loadDocument", () => {
  it("seeds when empty", () => expect(loadDocument(mem(), now).outcome).toBe("seeded"));
  it("migrates v1 anomalies and notes without deleting v1", () => {
    const v1 = JSON.stringify({ anos: [{ id: "ANO-999", titre: "X" }], notes: { "TES-001": [{ d: "2026-11-01", t: "n", by: "Utilisateur démo" }] } });
    const s = mem({ [LEGACY_KEY]: v1 });
    const { doc, outcome } = loadDocument(s, now);
    expect(outcome).toBe("migrated");
    expect(doc.anos.map(a => a.id)).toEqual(["ANO-999"]);
    expect(doc.notes["TES-001"]).toHaveLength(1);
    expect(doc.users.length).toBeGreaterThan(0);
    expect(doc.activity.some(a => a.action === "demo.migrated")).toBe(true);
    expect(s.data[LEGACY_KEY]).toBe(v1);
  });
  it("migrates v1 with missing notes", () => {
    const { doc } = loadDocument(mem({ [LEGACY_KEY]: JSON.stringify({ anos: [] }) }), now);
    expect(doc.notes).toEqual({});
  });
  it("prefers v2 over v1", () => {
    const v2 = { ...seedV2Like(), tasks: [] };
    const r = loadDocument(mem({ [V2_KEY]: JSON.stringify(v2), [LEGACY_KEY]: JSON.stringify({ anos: [] }) }), now);
    expect(r.outcome).toBe("migrated-v2"); expect(r.doc.tasks).toEqual([]);
  });
  it("migrates a used v2 document without touching it", () => {
    const v2 = { ...seedV2Like(), tasks: [{ id: "TSK-999", title: "créée en v2" }], notifications: [{ id: "NTF-900", readAt: "2026-11-20T00:00:00Z" }] };
    const raw = JSON.stringify(v2); const s = mem({ [V2_KEY]: raw });
    const { doc, outcome } = loadDocument(s, now);
    expect(outcome).toBe("migrated-v2");
    expect(doc.version).toBe(3);
    expect(doc.tasks).toEqual(v2.tasks);
    expect(doc.notifications.filter(n => n.id === "NTF-900")).toEqual(v2.notifications);
    expect(new Set(doc.notifications.map(n => n.id)).size).toBe(doc.notifications.length);
    expect(doc.suppliers.length).toBeGreaterThan(0);
    expect(doc.validations.some(v => v.subjectType === "purchase_request")).toBe(true);
    expect(doc.activity.some(a => a.action === "demo.migrated" && a.entityId === "v2")).toBe(true);
    expect(s.data[V2_KEY]).toBe(raw);
  });
  it("still migrates v1 directly to v3", () => expect(loadDocument(mem({ [LEGACY_KEY]: JSON.stringify({ anos: [] }) }), now).doc.version).toBe(3));
  it("prefers v3 over v2", () => expect(loadDocument(mem({ [DB_KEY]: JSON.stringify(seedDocument()), [V2_KEY]: "{}" }), now).outcome).toBe("v3"));
  it("treats a v3 missing purchasing collections as unreadable", () => {
    const { suppliers: _s, ...broken } = seedDocument();
    expect(loadDocument(mem({ [DB_KEY]: JSON.stringify(broken) }), now).outcome).toBe("recovered");
  });
  it("recovers from corrupted JSON", () => expect(loadDocument(mem({ [DB_KEY]: "{oops" }), now).outcome).toBe("recovered"));
  it("recovers from a v2 document missing collections", () => {
    const r = loadDocument(mem({ [V2_KEY]: JSON.stringify({ version: 2, tasks: [] }) }), now);
    expect(r.outcome).toBe("recovered");
    expect(r.doc.users.length).toBeGreaterThan(0);
  });
  it("recovers from corrupted v1 without touching it", () => {
    const s = mem({ [LEGACY_KEY]: "nope" });
    expect(loadDocument(s, now).outcome).toBe("recovered");
    expect(s.data[LEGACY_KEY]).toBe("nope");
  });
});

describe("LocalDatabase", () => {
  it("persists writes and notifies subscribers", () => {
    const s = mem(); const db = new LocalDatabase(s); let calls = 0; db.subscribe(() => calls++);
    db.write(d => { d.tasks = []; });
    expect(JSON.parse(s.data[DB_KEY]).tasks).toEqual([]); expect(calls).toBe(1);
  });
  it("seed is not mutated by writes", () => {
    const db = new LocalDatabase(null); db.write(d => { d.users.pop(); });
    expect(seedDocument().users.length).toBe(db.read().users.length + 1);
  });
  it("persists a migrated document as v3 immediately", () => {
    const s = mem({ [LEGACY_KEY]: JSON.stringify({ anos: [] }) });
    new LocalDatabase(s, now);
    expect(JSON.parse(s.data[DB_KEY]).version).toBe(3);
  });
});
