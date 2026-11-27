import { describe, expect, it } from "vitest";
import { notificationsFor } from "./notification-rules";
import { activityFor } from "./activity-rules";
import { dispatchEvents } from "./dispatch";
import { USERS0 } from "@/data/seed-org";
import { PROJECTS0, PROTOTYPE_LINKS0, TASKS0 } from "@/data/seed-work";
import { ANOS0 } from "@/data/seed";
import { INVOICES0, PURCHASE_ORDERS0, PURCHASE_REQUESTS0, RECEIPTS0, PURCHASE_VALIDATIONS0 } from "@/data/seed-purchasing";
import { LocalDatabase } from "@/repositories/local/database";
import { createLocalRepositories } from "@/repositories/local";

const dir = { users: USERS0, projects: PROJECTS0, prototypeLinks: PROTOTYPE_LINKS0 };
const at = "2026-11-26T10:00:00.000Z";
const qualityIds = USERS0.filter(u => u.systemRole === "QUALITY_MANAGER").map(u => u.id);
const task = { ...TASKS0[0], priority: "Urgente" as const, assigneeId: "U-NAD", authorId: "U-KAR" };

describe("notification rules", () => {
  it("notifies the new assignee with mapped priority and link", () => {
    const [n, ...rest] = notificationsFor({ type: "task.assigned", actorId: "U-KAR", at, task }, dir);
    expect(rest).toHaveLength(0);
    expect(n).toMatchObject({ recipientId: "U-NAD", priority: "Critique", link: `/tasks/${task.id}`, entityType: "task", createdAt: at });
    expect(n.readAt).toBeUndefined();
  });
  it("actor is never notified", () =>
    expect(notificationsFor({ type: "task.assigned", actorId: "U-NAD", at, task }, dir)).toHaveLength(0));
  it("incident on linked prototype notifies quality and project owner", () => {
    const a = { ...ANOS0[0], proto: "AG-01", g: "Critique" as const };
    const ns = notificationsFor({ type: "incident.reported", actorId: "U-DIR", at, anomaly: a }, dir);
    expect(ns.map(n => n.recipientId).sort()).toEqual([...qualityIds, "U-KAR"].sort());
    expect(ns.every(n => n.priority === "Critique")).toBe(true);
  });
  it("incident on unlinked prototype notifies quality only", () => {
    const a = { ...ANOS0[0], proto: "AG-03" };
    expect(notificationsFor({ type: "incident.reported", actorId: "U-DIR", at, anomaly: a }, dir).map(n => n.recipientId).sort()).toEqual([...qualityIds].sort());
  });
  it("anomaly entering verification asks quality for validation", () => {
    const a = { ...ANOS0[0], s: "En vérification" as const };
    const ns = notificationsFor({ type: "incident.status_changed", actorId: "U-AWA", at, anomaly: a, from: "Action corrective" }, dir);
    expect(ns.map(n => n.recipientId).sort()).toEqual([...qualityIds].sort());
    expect(ns[0].title).toContain("Validation attendue");
  });
  it("validation request notifies validator", () => {
    const v = { id: "VAL-9", subjectType: "task" as const, subjectId: task.id, authorId: "U-KAR", ownerId: "U-NAD", validatorId: qualityIds[0], status: "En attente" as const, requestedAt: at };
    expect(notificationsFor({ type: "validation.requested", actorId: "U-NAD", at, validation: v, task }, dir)).toMatchObject([{ recipientId: qualityIds[0], priority: "Haute" }]);
  });
  it("rejection notifies owner and author once each, with comment", () => {
    const v = { id: "VAL-9", subjectType: "task" as const, subjectId: task.id, authorId: "U-KAR", ownerId: "U-NAD", validatorId: "U-QUA", status: "Rejetée" as const, comment: "Incomplet", requestedAt: at };
    const ns = notificationsFor({ type: "validation.rejected", actorId: "U-QUA", at, validation: v, task }, dir);
    expect(ns.map(n => n.recipientId).sort()).toEqual(["U-KAR", "U-NAD"]);
    expect(ns[0].body).toContain("Incomplet");
  });
  it("blocked task alerts project owner", () => {
    const t = { ...TASKS0[0], status: "Bloquée" as const, authorId: "U-ABL" };
    expect(notificationsFor({ type: "task.status_changed", actorId: "U-AWA", at, task: t, from: "En cours" }, dir).map(n => n.recipientId).sort()).toEqual(["U-ABL", "U-KAR"]);
  });
  it("profile update links somewhere every role can open", () => {
    const u = USERS0.find(x => x.systemRole === "TECHNICIAN")!;
    expect(notificationsFor({ type: "user.updated", actorId: "U-RH", at, user: u, changes: ["équipe"] }, dir)[0].link).toBe("/espace");
  });
  it("task creation and notes do not notify", () => {
    expect(notificationsFor({ type: "task.created", actorId: "U-KAR", at, task }, dir)).toEqual([]);
    expect(notificationsFor({ type: "note.added", actorId: "U-KAR", at, targetId: "TES-001", text: "x" }, dir)).toEqual([]);
  });
});

describe("purchasing notification rules", () => {
  const da = PURCHASE_REQUESTS0.find(r => r.id === "DA-2026-002")!;
  const order = PURCHASE_ORDERS0[0], receipt = RECEIPTS0[0];
  it("approval request notifies the validator; critical urgency raises priority", () => {
    const v = PURCHASE_VALIDATIONS0.find(x => x.subjectId === da.id && x.status === "En attente")!;
    const [n, ...rest] = notificationsFor({ type: "purchase.approval_requested", actorId: "U-NAD", at, request: da, validation: v, amountHT: 815_000 }, dir);
    expect(rest).toHaveLength(0);
    expect(n).toMatchObject({ recipientId: "U-FIN", priority: "Haute", link: "/purchasing/requests/DA-2026-002", entityType: "purchase" });
    expect(notificationsFor({ type: "purchase.approval_requested", actorId: "U-NAD", at, request: { ...da, urgency: "Critique" }, validation: v, amountHT: 815_000 }, dir)[0].priority).toBe("Critique");
  });
  it("final approval notifies the requester and purchasing", () =>
    expect(notificationsFor({ type: "purchase.request_approved", actorId: "U-FIN", at, request: da }, dir).map(n => n.recipientId).sort()).toEqual(["U-ACH", "U-FIF"]));
  it("non-conformity notifies purchasing and quality", () =>
    expect(notificationsFor({ type: "purchase.nonconformity", actorId: "U-MAG", at, order, receipt }, dir).map(n => n.recipientId).sort()).toEqual(["U-ACH", "U-QU2", "U-QUA"]));
  it("invoice transmitted notifies finance users only", () =>
    expect(notificationsFor({ type: "purchase.invoice_transmitted", actorId: "U-ACH", at, order, invoice: INVOICES0[3] }, dir).map(n => n.recipientId)).toEqual(["U-FIN"]));
  it("an overrun selection alerts finance, a regular one does not", () => {
    const q = { id: "DEV-003", totalHT: 544_000 } as never;
    expect(notificationsFor({ type: "purchase.quote_selected", actorId: "U-ACH", at, request: da, quote: q, overrun: true }, dir).map(n => n.recipientId)).toEqual(["U-FIN"]);
    expect(notificationsFor({ type: "purchase.quote_selected", actorId: "U-ACH", at, request: da, quote: q, overrun: false }, dir)).toEqual([]);
  });
  it("goods received is journalled with accepted and rejected counts", () => {
    const e = activityFor({ type: "purchase.goods_received", actorId: "U-MAG", at, request: da, order, receipt, lines: [] }, dir);
    expect(e).toMatchObject({ action: "purchase.goods_received", entityType: "purchase", entityId: order.id });
    expect(e.summary).toContain("22 accepté");
    expect(e.summary).toContain("2 rejeté");
  });
});

describe("activity rules", () => {
  it("activity summary names actor and target", () => {
    const e = activityFor({ type: "task.assigned", actorId: "U-KAR", at, task }, dir);
    expect(e.summary).toContain("Karim Adjovi");
    expect(e.summary).toContain("Nadia Sossou");
    expect(e).toMatchObject({ action: "task.assigned", entityType: "task", entityId: task.id, at, actorId: "U-KAR" });
  });
});

describe("dispatchEvents", () => {
  it("persists notifications and activity for each event", async () => {
    const repos = createLocalRepositories(new LocalDatabase(null), () => at);
    const n0 = (await repos.notifications.list()).length, a0 = (await repos.activity.list()).length;
    await dispatchEvents(repos, [{ type: "task.assigned", actorId: "U-KAR", at, task }]);
    expect((await repos.notifications.list()).length).toBe(n0 + 1);
    expect((await repos.activity.list()).length).toBe(a0 + 1);
  });
});
