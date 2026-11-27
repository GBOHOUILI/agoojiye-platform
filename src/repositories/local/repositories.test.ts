import { describe, expect, it } from "vitest";
import { LocalDatabase } from "./database";
import { createLocalRepositories } from "./index";
import { resolveSessionUser } from "../session";
import { DEFAULT_USER_ID, USERS0 } from "@/data/seed-org";

const repos = () => createLocalRepositories(new LocalDatabase(null), () => "2026-11-26T10:00:00.000Z");
const notif = (recipientId: string) => ({ recipientId, type: "t", priority: "Normale" as const, title: "", body: "", link: "/", entityType: "task" as const, entityId: "1", createdAt: "x" });

describe("local repositories", () => {
  it("generates sequential task codes", async () => {
    const r = repos(); const before = (await r.tasks.list()).length;
    const t = await r.tasks.create({ projectId: "PRJ-01", title: "x", description: "", status: "À faire", priority: "Normale", dueDate: "2026-12-01", progress: 0, authorId: "U-KAR" });
    expect(t.code).toBe(`TSK-${String(before + 1).padStart(3, "0")}`);
    expect(t.id).toBe(t.code);
    expect(t.createdAt).toBe("2026-11-26T10:00:00.000Z");
  });
  it("marks all notifications of one recipient as read", async () => {
    const r = repos();
    await r.notifications.createMany([notif("A"), notif("B")]);
    await r.notifications.markAllRead("A", "now");
    const ns = (await r.notifications.list()).filter(n => n.createdAt === "x");
    expect(ns.find(n => n.recipientId === "A")?.readAt).toBe("now");
    expect(ns.find(n => n.recipientId === "B")?.readAt).toBeUndefined();
  });
  it("prototype link is unique per prototype", async () => {
    const r = repos();
    await r.projects.linkPrototype({ prototypeId: "AG-03", projectId: "PRJ-03" });
    await r.projects.linkPrototype({ prototypeId: "AG-03", projectId: "PRJ-04" });
    expect((await r.projects.listPrototypeLinks()).filter(l => l.prototypeId === "AG-03")).toEqual([{ prototypeId: "AG-03", projectId: "PRJ-04" }]);
  });
  it("update on unknown id throws", async () => { await expect(repos().tasks.update("nope", {})).rejects.toThrow("Not found"); });
  it("anomalies.save inserts first then replaces", async () => {
    const r = repos(); const [a] = await r.anomalies.list();
    await r.anomalies.save({ ...a, id: "ANO-777" });
    expect((await r.anomalies.list())[0].id).toBe("ANO-777");
    await r.anomalies.save({ ...a, titre: "changé" });
    expect((await r.anomalies.list()).find(x => x.id === a.id)?.titre).toBe("changé");
  });
  it("reset restores the seed", async () => {
    const r = repos(); await r.tasks.create({ projectId: "PRJ-01", title: "x", description: "", status: "À faire", priority: "Normale", dueDate: "2026-12-01", progress: 0, authorId: "U-KAR" });
    await r.demo.reset();
    expect((await r.tasks.list()).length).toBe(30);
  });
});

describe("purchasing repositories", () => {
  it("numbers purchasing documents with their own sequences", async () => {
    const r = repos();
    const orders = await r.purchasing.orders.list();
    const { id: _o, ...order } = orders[0];
    const o = await r.purchasing.orders.create({ ...order, status: "Émis" });
    expect(o.id).toBe(`BC-2026-${String(orders.length + 1).padStart(4, "0")}`);
    const { id: _r, createdAt: _c, ...draft } = (await r.purchasing.requests.list())[0];
    const d = await r.purchasing.requests.create(draft);
    expect(d.id).toBe("DA-2026-011");
    expect(d.createdAt).toBe("2026-11-26T10:00:00.000Z");
    const { id: _s, createdAt: _sc, ...sup } = (await r.purchasing.suppliers.list())[0];
    expect((await r.purchasing.suppliers.create(sup)).id).toBe("SUP-010");
  });
  it("receipts are append-only", async () => {
    const r = repos(); const before = await r.purchasing.receipts.list();
    const { id: _i, ...rec } = before[0];
    expect((await r.purchasing.receipts.create(rec)).id).toBe("REC-005");
    expect((await r.purchasing.receipts.list()).length).toBe(before.length + 1);
    expect("update" in r.purchasing.receipts).toBe(false);
  });
  it("updates an invoice and keeps others untouched", async () => {
    const r = repos();
    await r.purchasing.invoices.update("FAC-002", { status: "Transmise à la Finance" });
    expect((await r.purchasing.invoices.get("FAC-002"))?.status).toBe("Transmise à la Finance");
    expect((await r.purchasing.invoices.get("FAC-003"))?.status).toBe("En litige");
  });
});

describe("resolveSessionUser", () => {
  it("falls back to default for unknown id", () => expect(resolveSessionUser("ghost", USERS0).id).toBe(DEFAULT_USER_ID));
  it("falls back to default when nothing stored", () => expect(resolveSessionUser(null, USERS0).id).toBe(DEFAULT_USER_ID));
  it("returns stored user", () => expect(resolveSessionUser("U-NAD", USERS0).id).toBe("U-NAD"));
});
