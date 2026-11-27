import { describe, expect, it } from "vitest";
import { ANOS0, ESSAIS, PROTOS } from "@/data/seed";
import { TASKS0 } from "@/data/seed-work";
import { PURCHASE_REQUESTS0 } from "@/data/seed-purchasing";
import { SEED_ANCHOR, shiftDate } from "@/lib/demo-clock";
import { getTest } from "@/services/tests.service";
import { getPrototype } from "@/services/prototypes.service";
import { DB_KEY, LEGACY_KEY, LocalDatabase, seedDocument, V2_KEY, type KeyValueStorage } from "./database";
import { createLocalRepositories } from "./index";

// The shift applied to the fictitious data is chosen once, when the demo is seeded, and stored
// with the document. Everything dated (stored data and read-only engineering data) follows that stored shift.
const mem = (init: Record<string, string> = {}): KeyValueStorage => { const m = new Map(Object.entries(init)); return { getItem: k => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) }; };
const at = (iso: string) => () => iso;
const JAN10 = at("2027-01-10T09:00:00.000Z"), JAN20 = at("2027-01-20T09:00:00.000Z");
const seedAno = (id: string) => ANOS0.find(a => a.id === id)!;
const stored = (s: KeyValueStorage) => JSON.parse(s.getItem(DB_KEY)!);

describe("seed offset stored with the document", () => {
  it("is recorded when the demo is first seeded", () => {
    const s = mem(), db = new LocalDatabase(s, JAN10);
    expect(db.read().seedOffsetDays).toBe(45);
    expect(stored(s).seedOffsetDays).toBe(45);
    expect(db.read().anos.find(a => a.id === "ANO-001")?.date).toBe(shiftDate(seedAno("ANO-001").date, 45));
  });

  it("a reload on a later day or another tab does not shift again", () => {
    const s = mem(), first = new LocalDatabase(s, JAN10).read();
    expect(new LocalDatabase(s, JAN20).read()).toEqual(first);
    const tab = new LocalDatabase(s, JAN20); tab.reloadFromStorage();
    expect(tab.read()).toEqual(first);
    expect(stored(s)).toEqual(first);
  });

  it("the repository exposes the stored offset", async () =>
    expect(await createLocalRepositories(new LocalDatabase(mem(), JAN10), JAN20).demo.seedOffsetDays()).toBe(45));

  it("a reset builds a new coherent set for the reset day", async () => {
    const s = mem(), db = new LocalDatabase(s, JAN10);
    await createLocalRepositories(db, at("2027-02-01T09:00:00.000Z")).demo.reset();
    expect(db.read().seedOffsetDays).toBe(67);
    expect(db.read().anos.find(a => a.id === "ANO-002")?.date).toBe(shiftDate(seedAno("ANO-002").date, 67));
    expect(db.read().tasks.find(t => t.id === "TSK-005")?.dueDate).toBe(shiftDate(TASKS0.find(t => t.id === "TSK-005")!.dueDate, 67));
  });

  it("data written after seeding are never shifted, whatever the day", () => {
    const s = mem(), db = new LocalDatabase(s, JAN10);
    db.write(d => { d.anos.unshift({ ...d.anos[0], id: "ANO-900", date: "2027-01-10", tl: [{ d: "2027-01-10", t: "Anomalie déclarée", by: "Awa" }] }); d.notes["TES-001"] = [{ d: "2027-01-10", t: "Observation", by: "Awa" }]; });
    const later = new LocalDatabase(s, at("2027-06-01T09:00:00.000Z")).read();
    expect(later.anos.find(a => a.id === "ANO-900")?.date).toBe("2027-01-10");
    expect(later.notes["TES-001"][0].d).toBe("2027-01-10");
  });

  it("a v3 document stored before the offset existed keeps its time base", () => {
    const { seedOffsetDays: _a, ...anchored } = seedDocument(SEED_ANCHOR);
    expect(new LocalDatabase(mem({ [DB_KEY]: JSON.stringify(anchored) }), JAN20).read().seedOffsetDays).toBe(0);
    const { seedOffsetDays: _b, ...shifted } = seedDocument("2027-01-10");
    const db = new LocalDatabase(mem({ [DB_KEY]: JSON.stringify(shifted) }), at("2027-06-01T09:00:00.000Z"));
    expect(db.read().seedOffsetDays).toBe(45);
    expect(db.read().anos).toEqual(shifted.anos);
  });

  it("the v2 migration keeps phase 2 data and the added purchasing data on the same time base", () => {
    const { suppliers: _1, purchaseRequests: _2, quotes: _3, purchaseOrders: _4, receipts: _5, invoices: _6, seedOffsetDays: _7, ...v2 } = seedDocument(SEED_ANCHOR);
    const raw = JSON.stringify({ ...v2, version: 2, validations: v2.validations.filter(v => v.subjectType === "task") });
    const s = mem({ [V2_KEY]: raw }), db = new LocalDatabase(s, at("2027-03-01T09:00:00.000Z"));
    expect(db.read().seedOffsetDays).toBe(0);
    expect(db.read().purchaseRequests.find(r => r.id === "DA-2026-001")?.createdAt).toBe(PURCHASE_REQUESTS0.find(r => r.id === "DA-2026-001")!.createdAt);
    expect(s.getItem(V2_KEY)).toBe(raw);
  });

  it("the v1 migration keeps v1 anomalies and the seed on the same time base", () => {
    const userAno = { ...seedAno("ANO-001"), id: "ANO-009", date: "2026-12-02", tl: [{ d: "2026-12-02", t: "Anomalie déclarée", by: "Utilisateur démo" }] };
    const db = new LocalDatabase(mem({ [LEGACY_KEY]: JSON.stringify({ anos: [...ANOS0, userAno], notes: {} }) }), at("2027-03-01T09:00:00.000Z"));
    expect(db.read().seedOffsetDays).toBe(0);
    expect(db.read().anos.find(a => a.id === "ANO-009")?.date).toBe("2026-12-02");
    expect(db.read().tasks.find(t => t.id === "TSK-009")?.dueDate).toBe(TASKS0.find(t => t.id === "TSK-009")!.dueDate);
  });

  it("read-only engineering data follow the stored offset, so an anomaly never precedes its test", () => {
    const doc = new LocalDatabase(mem(), JAN10).read();
    expect(getTest("TES-003", doc.seedOffsetDays)?.date).toBe(shiftDate(ESSAIS.find(e => e.id === "TES-003")!.date, 45));
    expect(getPrototype("AG-02", doc.seedOffsetDays)?.date).toBe(shiftDate(PROTOS.find(p => p.id === "AG-02")!.date, 45));
    const gap = (ano: string, test: string) => Date.parse(ano) - Date.parse(test);
    expect(gap(doc.anos.find(a => a.id === "ANO-002")!.date, getTest("TES-003", doc.seedOffsetDays)!.date))
      .toBe(gap(seedAno("ANO-002").date, ESSAIS.find(e => e.id === "TES-003")!.date));
  });
});
