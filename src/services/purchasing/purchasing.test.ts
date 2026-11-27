import { describe, expect, it } from "vitest";
import { LocalDatabase } from "@/repositories/local/database";
import { createLocalRepositories } from "@/repositories/local";
import type { ServiceContext } from "../context";
import { createSupplier, updateSupplier } from "./suppliers.service";
import { notificationsFor } from "@/domain/notification-rules";
import { approvalAmountOf, cancelRequest, createRequest, decidePurchaseApproval, submitRequest, updateDraft } from "./requests.service";
import { decideValidation } from "../validations.service";
import type { RequestDraftInput } from "@/lib/validations/purchasing";
import { recordQuote, selectQuote } from "./quotes.service";
import { cancelOrder, closeOrderWithBalance, issueOrder } from "./orders.service";
import { recordReceipt } from "./receipts.service";
import { cancelInvoice, correctInvoice, recordInvoice, transmitInvoice } from "./invoices.service";

const now = () => "2026-11-26T10:00:00.000Z";
const setup = () => {
  const repos = createLocalRepositories(new LocalDatabase(null), now);
  const as = async (id: string): Promise<ServiceContext> => ({ repos, actor: (await repos.users.get(id))!, now });
  return { repos, as };
};
const line = (quantity: number, estimatedUnitPriceHT: number, designation = "Capteur de vitesse") => ({ designation, quantity, unit: "pièce", estimatedUnitPriceHT });
const draft = (over: Partial<RequestDraftInput> = {}): RequestDraftInput => ({ title: "Capteurs de rechange", justification: "Remplacement des capteurs défectueux sur AG-02.", urgency: "Normale", neededBy: "2026-12-10", projectId: "PRJ-02", lines: [line(4, 60_000)], ...over });
const pending = async (s: ReturnType<typeof setup>, id: string) => (await s.repos.validations.list()).filter(x => x.subjectId === id && x.status === "En attente");
// Approves every pending step of a request with its designated validator; returns the steps in order.
async function approveAll(s: ReturnType<typeof setup>, id: string) {
  const steps: string[] = [];
  for (let v = (await pending(s, id))[0]; v; v = (await pending(s, id))[0]) { steps.push(v.step!); await decidePurchaseApproval(await s.as(v.validatorId), v.id, "approve"); }
  return steps;
}
// Creates a request as Kofi on PRJ-02 and runs its whole approval circuit.
async function approvedRequest(s: ReturnType<typeof setup>, lines = [line(4, 100_000)]) {
  const kof = await s.as("U-KOF");
  const c = await createRequest(kof, draft({ lines }));
  await submitRequest(kof, c.value.id); await approveAll(s, c.value.id);
  return c.value.id;
}
const quoteInput = (requestId: string, supplierId: string, prices: number[]) => ({
  supplierId, supplierRef: `Q-${supplierId}`, receivedAt: "2026-11-26", validUntil: "2026-12-31", deliveryDays: 10,
  prices: prices.map((unitPriceHT, i) => ({ lineId: `L${i + 1}`, unitPriceHT })),
});
const issueInput = { expectedDelivery: "2026-12-10", deliveryAddress: "Atelier prototypes, Cotonou" };
// Full chain to an issued order: 10 × 50 000 HT (Responsable + Finance), one quote at the same price.
async function issuedOrder(s: ReturnType<typeof setup>, vatRateBp?: number) {
  const id = await approvedRequest(s, [line(10, 50_000, "Disque de frein")]);
  const ach = await s.as("U-ACH");
  const q = await recordQuote(ach, id, quoteInput(id, "SUP-003", [50_000]));
  await selectQuote(ach, q.value.id, {});
  return (await issueOrder(ach, id, { ...issueInput, ...(vatRateBp !== undefined ? { vatRateBp } : {}) })).value;
}
const receive = (orderLineId: string, accepted: number, rejected = 0, rejectReason?: string) =>
  ({ deliveryNoteRef: "BL-TEST-001", lines: [{ orderLineId, received: accepted + rejected, accepted, rejected, ...(rejectReason ? { rejectReason } : {}) }] });
const invoiceInput = (orderId: string, quantity: number, over: Record<string, unknown> = {}) => {
  const ht = quantity * 50_000, vat = Math.round(ht * 1800 / 10_000);
  return { orderId, supplierInvoiceNo: `OMP-F-${quantity}`, invoiceDate: "2026-11-26", dueDate: "2026-12-26", lines: [{ orderLineId: "OL1", quantity, unitPriceHT: 50_000 }], vatRateBp: 1800, declaredTTC: ht + vat, ...over };
};
const supplierInput = { name: "Bénin Pièces Auto", taxId: "3201900123456", rccm: "RB/COT/19 B 2345", category: "Mécanique", contactName: "A. Kossi", phone: "+229 00 00 00 97", email: "contact@beninpieces.demo", address: "Akpakpa", city: "Cotonou", paymentTermsDays: 30 };

describe("suppliers", () => {
  it("only supplier managers create suppliers", async () => {
    const s = setup();
    await expect(createSupplier(await s.as("U-KAR"), supplierInput)).rejects.toThrow("non autorisée");
    const r = await createSupplier(await s.as("U-ACH"), supplierInput);
    expect(r.value).toMatchObject({ id: "SUP-010", status: "Actif" });
    expect(r.events[0].type).toBe("supplier.created");
  });
  it("rejects invalid contact data", async () => {
    const s = setup(); const ach = await s.as("U-ACH");
    await expect(createSupplier(ach, { ...supplierInput, phone: "abc" })).rejects.toThrow("Téléphone");
    await expect(createSupplier(ach, { ...supplierInput, email: "pas-un-email" })).rejects.toThrow("E-mail");
    await expect(createSupplier(ach, { ...supplierInput, paymentTermsDays: 30.5 })).rejects.toThrow("Délai de paiement");
  });
  it("suspends and reactivates a supplier, journalled", async () => {
    const s = setup(); const ach = await s.as("U-ACH");
    const r = await updateSupplier(ach, "SUP-001", { status: "Suspendu" });
    expect(r.value.status).toBe("Suspendu");
    expect(r.events[0].type).toBe("supplier.updated");
    await expect(updateSupplier(await s.as("U-FIN"), "SUP-001", { status: "Actif" })).rejects.toThrow("non autorisée");
  });
});

describe("purchase requests", () => {
  it("submits to the project owner and approves below 500 000", async () => {
    const s = setup();
    const c = await createRequest(await s.as("U-KOF"), draft());
    expect(c.value).toMatchObject({ status: "Brouillon", requesterId: "U-KOF", departmentId: "D-ENG" });
    const sub = await submitRequest(await s.as("U-KOF"), c.value.id);
    expect(sub.events.map(e => e.type)).toEqual(["purchase.request_submitted", "purchase.approval_requested"]);
    const [v] = await pending(s, c.value.id);
    expect(v).toMatchObject({ subjectType: "purchase_request", step: "Responsable", validatorId: "U-NAD", authorId: "U-KOF" });
    const r = await decidePurchaseApproval(await s.as("U-NAD"), v.id, "approve");
    expect(r.events.map(e => e.type)).toEqual(["purchase.approval_granted", "purchase.request_approved"]);
    expect(await s.repos.purchasing.requests.get(c.value.id)).toMatchObject({ status: "Approuvée", approvedAmountHT: 240_000 });
  });
  it("chains Responsable, Finance then Direction, one pending step at a time", async () => {
    const s = setup();
    const c = await createRequest(await s.as("U-KOF"), draft({ lines: [line(2, 2_600_000, "Armoire de cyclage")] }));
    await submitRequest(await s.as("U-KOF"), c.value.id);
    expect(await pending(s, c.value.id)).toHaveLength(1);
    expect(await approveAll(s, c.value.id)).toEqual(["Responsable", "Finance", "Direction"]);
    expect((await s.repos.purchasing.requests.get(c.value.id))?.status).toBe("Approuvée");
  });
  it("only the designated validator decides — no director or admin override", async () => {
    const s = setup();
    const c = await createRequest(await s.as("U-KOF"), draft());
    await submitRequest(await s.as("U-KOF"), c.value.id);
    const [v] = await pending(s, c.value.id);
    for (const id of ["U-DIR", "U-ADM", "U-KAR", "U-KOF"]) await expect(decidePurchaseApproval(await s.as(id), v.id, "approve")).rejects.toThrow("non autorisée");
  });
  it("rejection needs a reason, then the requester revises and resubmits with a fresh circuit", async () => {
    const s = setup(); const kof = await s.as("U-KOF");
    const c = await createRequest(kof, draft({ lines: [line(10, 60_000)] }));
    await submitRequest(kof, c.value.id);
    const [v] = await pending(s, c.value.id);
    await decidePurchaseApproval(await s.as("U-NAD"), v.id, "approve");
    const [fin] = await pending(s, c.value.id);
    await expect(decidePurchaseApproval(await s.as("U-FIN"), fin.id, "reject", "")).rejects.toThrow("motif");
    const rej = await decidePurchaseApproval(await s.as("U-FIN"), fin.id, "reject", "Budget du trimestre épuisé");
    expect(rej.events[0]).toMatchObject({ type: "purchase.request_rejected", reason: "Budget du trimestre épuisé" });
    expect((await s.repos.purchasing.requests.get(c.value.id))?.status).toBe("Rejetée");
    await expect(submitRequest(kof, c.value.id)).rejects.toThrow("Transition impossible");
    await updateDraft(kof, c.value.id, draft({ lines: [line(5, 60_000)] }));
    expect((await s.repos.purchasing.requests.get(c.value.id))?.status).toBe("Brouillon");
    await submitRequest(kof, c.value.id);
    expect(await approveAll(s, c.value.id)).toEqual(["Responsable"]);
    const history = (await s.repos.validations.list()).filter(x => x.subjectId === c.value.id);
    expect(history.map(x => `${x.step}:${x.status}`)).toEqual(["Responsable:Approuvée", "Finance:Rejetée", "Responsable:Approuvée"]);
  });
  it("refuses submission without an eligible validator", async () => {
    const s = setup(); const fin = await s.as("U-FIN");
    const c = await createRequest(fin, draft({ projectId: undefined, lines: [line(1, 600_000)] }));
    await expect(submitRequest(fin, c.value.id)).rejects.toThrow("Aucun validateur éligible pour l’étape Finance.");
  });
  it("a linked task must belong to the linked project", async () => {
    const s = setup();
    await expect(createRequest(await s.as("U-KOF"), draft({ projectId: "PRJ-01", taskId: "TSK-009" }))).rejects.toThrow("tâche");
  });
  it("lines must use whole quantities and amounts", async () => {
    const s = setup();
    await expect(createRequest(await s.as("U-KOF"), draft({ lines: [line(1.5, 1000)] }))).rejects.toThrow("entière");
    await expect(createRequest(await s.as("U-KOF"), draft({ lines: [line(1, 99.9)] }))).rejects.toThrow("entier");
    await expect(createRequest(await s.as("U-KOF"), draft({ lines: [] }))).rejects.toThrow("Au moins une ligne");
  });
  it("only the requester edits and submits their draft", async () => {
    const s = setup();
    const c = await createRequest(await s.as("U-KOF"), draft());
    await expect(submitRequest(await s.as("U-ROM"), c.value.id)).rejects.toThrow("non autorisée");
    await expect(updateDraft(await s.as("U-ACH"), c.value.id, draft())).rejects.toThrow("non autorisée");
  });
  it("the task validation service refuses purchase validations", async () => {
    const s = setup();
    const c = await createRequest(await s.as("U-KOF"), draft());
    await submitRequest(await s.as("U-KOF"), c.value.id);
    const [v] = await pending(s, c.value.id);
    await expect(decideValidation(await s.as("U-NAD"), v.id, "approve")).rejects.toThrow("ne concerne pas une tâche");
  });
  it("requester cancels before approval with a reason, closing pending steps", async () => {
    const s = setup(); const kof = await s.as("U-KOF");
    const c = await createRequest(kof, draft());
    await submitRequest(kof, c.value.id);
    await expect(cancelRequest(kof, c.value.id, "")).rejects.toThrow("motif");
    const r = await cancelRequest(kof, c.value.id, "Besoin couvert par le stock existant");
    expect(r.value).toMatchObject({ status: "Annulée", cancelReason: "Besoin couvert par le stock existant" });
    expect(await pending(s, c.value.id)).toHaveLength(0);
  });
  it("after approval only purchasing may cancel, and not the requester", async () => {
    const s = setup(); const kof = await s.as("U-KOF");
    const c = await createRequest(kof, draft());
    await submitRequest(kof, c.value.id); await approveAll(s, c.value.id);
    await expect(cancelRequest(kof, c.value.id, "Je n’en ai plus besoin")).rejects.toThrow("non autorisée");
    expect((await cancelRequest(await s.as("U-ACH"), c.value.id, "Doublon avec DA-2026-004")).value.status).toBe("Annulée");
  });
});

describe("quotes, selection and overrun", () => {
  it("only purchasing records quotes; recording opens the consultation", async () => {
    const s = setup(); const id = await approvedRequest(s);
    await expect(recordQuote(await s.as("U-KAR"), id, quoteInput(id, "SUP-002", [98_000]))).rejects.toThrow("non autorisée");
    const q = await recordQuote(await s.as("U-ACH"), id, quoteInput(id, "SUP-002", [98_000]));
    expect(q.value).toMatchObject({ status: "Reçu", vatRateBp: 1800, totalHT: 392_000, totalVAT: 70_560, totalTTC: 462_560 });
    expect((await s.repos.purchasing.requests.get(id))?.status).toBe("En consultation");
  });
  it("refuses quotes from a suspended supplier or with a missing line price", async () => {
    const s = setup(); const ach = await s.as("U-ACH");
    await expect(recordQuote(ach, "DA-2026-004", quoteInput("DA-2026-004", "SUP-008", [18_000, 6_000]))).rejects.toThrow("Fournisseur suspendu");
    await expect(recordQuote(ach, "DA-2026-004", quoteInput("DA-2026-004", "SUP-009", [18_000]))).rejects.toThrow("chaque ligne");
  });
  it("refuses quotes before the request is approved", async () => {
    const s = setup();
    await expect(recordQuote(await s.as("U-ACH"), "DA-2026-002", quoteInput("DA-2026-002", "SUP-002", [380_000, 45_000]))).rejects.toThrow("approuvée");
  });
  it("requires two quotes above 1 000 000 HT unless a single source is justified", async () => {
    const s = setup(); const ach = await s.as("U-ACH");
    const id = await approvedRequest(s, [line(2, 600_000)]);
    const q = await recordQuote(ach, id, quoteInput(id, "SUP-002", [590_000]));
    await expect(selectQuote(ach, q.value.id, {})).rejects.toThrow("Deux devis");
    expect((await selectQuote(ach, q.value.id, { singleSourceReason: "Seul distributeur agréé au Bénin" })).value.selectedQuoteId).toBe(q.value.id);
  });
  it("requires a note when the selected quote is not the cheapest", async () => {
    const s = setup(); const ach = await s.as("U-ACH");
    await expect(selectQuote(ach, "DEV-001", {})).rejects.toThrow("moins-disant");
    const r = await selectQuote(ach, "DEV-001", { selectionNote: "Délai de 21 jours compatible avec le planning, contre 35 jours" });
    expect(r.value).toMatchObject({ selectedQuoteId: "DEV-001", status: "En consultation" });
    expect((await s.repos.purchasing.quotes.get("DEV-001"))?.status).toBe("Retenu");
  });
  it("an overrun above 10 % needs a reason and alerts finance", async () => {
    const s = setup(); const ach = await s.as("U-ACH");
    const id = await approvedRequest(s, [line(4, 100_000)]);
    const q = await recordQuote(ach, id, quoteInput(id, "SUP-002", [115_000]));
    await expect(selectQuote(ach, q.value.id, {})).rejects.toThrow("dépassement");
    const r = await selectQuote(ach, q.value.id, { overrunReason: "Hausse du prix du cuivre confirmée par deux fournisseurs" });
    expect(r.events.map(e => e.type)).toEqual(["purchase.quote_selected"]);
    expect(r.events[0]).toMatchObject({ overrun: true });
    expect(r.value).toMatchObject({ status: "En consultation", approvedAmountHT: 460_000 });
  });
  it("crossing a threshold within tolerance still adds the missing approval step", async () => {
    const s = setup(); const ach = await s.as("U-ACH");
    const id = await approvedRequest(s, [line(4, 120_000)]);
    const q = await recordQuote(ach, id, quoteInput(id, "SUP-002", [130_000]));
    const r = await selectQuote(ach, q.value.id, {});
    expect(r.value.status).toBe("Validation complémentaire");
    expect(r.events.map(e => e.type)).toEqual(["purchase.quote_selected", "purchase.approval_requested"]);
    const [v] = await pending(s, id);
    expect(v).toMatchObject({ step: "Finance", validatorId: "U-FIN" });
    await decidePurchaseApproval(await s.as("U-FIN"), v.id, "approve");
    expect(await s.repos.purchasing.requests.get(id)).toMatchObject({ status: "En consultation", approvedAmountHT: 520_000, selectedQuoteId: q.value.id });
  });
  it("rejecting the complementary validation discards the selected quote", async () => {
    const s = setup(); const ach = await s.as("U-ACH");
    const id = await approvedRequest(s, [line(4, 120_000)]);
    const q = await recordQuote(ach, id, quoteInput(id, "SUP-002", [130_000]));
    await selectQuote(ach, q.value.id, {});
    const [v] = await pending(s, id);
    await decidePurchaseApproval(await s.as("U-FIN"), v.id, "reject", "Renégocier le prix avant engagement");
    expect(await s.repos.purchasing.requests.get(id)).toMatchObject({ status: "En consultation", approvedAmountHT: 480_000 });
    expect((await s.repos.purchasing.requests.get(id))?.selectedQuoteId).toBeUndefined();
    expect((await s.repos.purchasing.quotes.get(q.value.id))?.status).toBe("Écarté");
    await expect(selectQuote(ach, q.value.id, {})).rejects.toThrow("écarté");
  });
});

describe("orders and receipts", () => {
  it("issues an order with a configurable VAT rate stored on the order", async () => {
    const s = setup();
    const o = await issuedOrder(s);
    expect(o).toMatchObject({ status: "Émis", vatRateBp: 1800, totalHT: 500_000, totalVAT: 90_000, totalTTC: 590_000, supplierId: "SUP-003", projectId: "PRJ-02", issuedById: "U-ACH" });
    expect(o.id).toMatch(/^BC-2026-\d{4}$/);
    expect((await s.repos.purchasing.requests.get(o.requestId))?.status).toBe("Commandée");
    const zero = await issuedOrder(setup(), 0);
    expect(zero).toMatchObject({ vatRateBp: 0, totalVAT: 0, totalTTC: 500_000 });
  });
  it("refuses a VAT rate outside the allowed list and a second order for the same request", async () => {
    const s = setup();
    const id = await approvedRequest(s, [line(10, 50_000)]);
    const ach = await s.as("U-ACH");
    const q = await recordQuote(ach, id, quoteInput(id, "SUP-003", [50_000]));
    await selectQuote(ach, q.value.id, {});
    await expect(issueOrder(ach, id, { ...issueInput, vatRateBp: 1000 })).rejects.toThrow("Taux de TVA");
    await issueOrder(ach, id, issueInput);
    await expect(issueOrder(ach, id, issueInput)).rejects.toThrow("Transition impossible");
  });
  it("cannot issue an order before complementary approvals", async () => {
    const s = setup(); const ach = await s.as("U-ACH");
    const id = await approvedRequest(s, [line(4, 120_000)]);
    const q = await recordQuote(ach, id, quoteInput(id, "SUP-002", [130_000]));
    await selectQuote(ach, q.value.id, {});
    await expect(issueOrder(ach, id, issueInput)).rejects.toThrow("validations complémentaires");
    const [v] = await pending(s, id);
    await decidePurchaseApproval(await s.as("U-FIN"), v.id, "approve");
    expect((await issueOrder(ach, id, issueInput)).value.totalHT).toBe(520_000);
  });
  it("only purchasing issues orders", async () => {
    const s = setup();
    await expect(issueOrder(await s.as("U-KOF"), "DA-2026-005", issueInput)).rejects.toThrow("non autorisée");
  });
  it("refuses inconsistent receipt lines", async () => {
    const s = setup(); const o = await issuedOrder(s); const mag = await s.as("U-MAG");
    await expect(recordReceipt(mag, o.id, { deliveryNoteRef: "BL-1", lines: [{ orderLineId: "OL1", received: 5, accepted: 4, rejected: 0 }] })).rejects.toThrow("accepté + rejeté");
    await expect(recordReceipt(mag, o.id, receive("OL1", 4, 1))).rejects.toThrow("motif");
    await expect(recordReceipt(mag, o.id, receive("OL1", 0))).rejects.toThrow("Aucune quantité");
    await expect(recordReceipt(mag, o.id, receive("OL9", 1))).rejects.toThrow("Ligne inconnue");
  });
  it("refuses receiving beyond the remaining quantity after a rejection", async () => {
    const s = setup(); const o = await issuedOrder(s); const mag = await s.as("U-MAG");
    await recordReceipt(mag, o.id, receive("OL1", 8, 2, "Voile au contrôle dimensionnel"));
    expect((await s.repos.purchasing.orders.get(o.id))?.status).toBe("Partiellement reçu");
    await expect(recordReceipt(mag, o.id, receive("OL1", 3))).rejects.toThrow("dépasse le reliquat (2)");
    await recordReceipt(mag, o.id, receive("OL1", 2));
    expect((await s.repos.purchasing.orders.get(o.id))?.status).toBe("Reçu");
  });
  it("goods_received carries received, accepted and rejected separately and flags non-conformity", async () => {
    const s = setup(); const o = await issuedOrder(s);
    const r = await recordReceipt(await s.as("U-MAG"), o.id, receive("OL1", 8, 2, "Voile au contrôle dimensionnel"));
    const e = r.events.find(x => x.type === "purchase.goods_received");
    expect(e).toMatchObject({ lines: [{ orderLineId: "OL1", designation: "Disque de frein", unit: "pièce", received: 10, accepted: 8, rejected: 2, rejectReason: "Voile au contrôle dimensionnel" }] });
    expect(r.events.map(x => x.type)).toContain("purchase.nonconformity");
  });
  it("reception requires the receive permission", async () => {
    const s = setup(); const o = await issuedOrder(s);
    await expect(recordReceipt(await s.as("U-FIN"), o.id, receive("OL1", 1))).rejects.toThrow("non autorisée");
    await expect(recordReceipt(await s.as("U-QUA"), o.id, receive("OL1", 1))).rejects.toThrow("non autorisée");
  });
  it("cannot cancel an order once something was received", async () => {
    const s = setup(); const o = await issuedOrder(s); const ach = await s.as("U-ACH");
    await recordReceipt(await s.as("U-MAG"), o.id, receive("OL1", 1));
    await expect(cancelOrder(ach, o.id, "Fournisseur défaillant")).rejects.toThrow("réception");
  });
  it("cancelling an unreceived order reopens the consultation", async () => {
    const s = setup(); const o = await issuedOrder(s);
    const r = await cancelOrder(await s.as("U-ACH"), o.id, "Erreur d’adresse de livraison");
    expect(r.value).toMatchObject({ status: "Annulé", cancelReason: "Erreur d’adresse de livraison" });
    expect((await s.repos.purchasing.requests.get(o.requestId))?.status).toBe("En consultation");
  });
  it("closing with balance is refused while accepted goods are not invoiced", async () => {
    const s = setup(); const o = await issuedOrder(s);
    await recordReceipt(await s.as("U-MAG"), o.id, receive("OL1", 6));
    await expect(closeOrderWithBalance(await s.as("U-ACH"), o.id, "Reliquat abandonné")).rejects.toThrow("non facturée");
  });
});

describe("invoices, transmission and closing", () => {
  async function received(s: ReturnType<typeof setup>, accepted: number) {
    const o = await issuedOrder(s);
    await recordReceipt(await s.as("U-MAG"), o.id, receive("OL1", accepted));
    return o;
  }
  it("only purchasing records invoices", async () => {
    const s = setup(); const o = await received(s, 10);
    await expect(recordInvoice(await s.as("U-FIN"), invoiceInput(o.id, 10))).rejects.toThrow("non autorisée");
  });
  it("a conforming invoice keeps HT, VAT and TTC separately", async () => {
    const s = setup(); const o = await received(s, 10);
    const r = await recordInvoice(await s.as("U-ACH"), invoiceInput(o.id, 10));
    expect(r.value).toMatchObject({ status: "Conforme", totalHT: 500_000, totalVAT: 90_000, totalTTC: 590_000, declaredTTC: 590_000, supplierId: "SUP-003", issues: [] });
  });
  it("refuses the same supplier invoice number twice", async () => {
    const s = setup(); const o = await received(s, 10); const ach = await s.as("U-ACH");
    await recordInvoice(ach, invoiceInput(o.id, 4));
    await expect(recordInvoice(ach, invoiceInput(o.id, 4))).rejects.toThrow("Facture déjà enregistrée");
  });
  it("a second invoice on already invoiced quantities goes to dispute", async () => {
    const s = setup(); const o = await received(s, 6); const ach = await s.as("U-ACH");
    await recordInvoice(ach, invoiceInput(o.id, 6));
    const r = await recordInvoice(ach, invoiceInput(o.id, 6, { supplierInvoiceNo: "OMP-F-BIS" }));
    expect(r.value.status).toBe("En litige");
    expect(r.value.issues[0]).toMatch(/dépasse les quantités acceptées/);
    expect(r.events.map(e => e.type)).toEqual(["purchase.invoice_recorded", "purchase.invoice_disputed"]);
  });
  it("a disputed invoice is corrected back to conforming", async () => {
    const s = setup(); const o = await received(s, 10); const ach = await s.as("U-ACH");
    const r = await recordInvoice(ach, invoiceInput(o.id, 10, { lines: [{ orderLineId: "OL1", quantity: 10, unitPriceHT: 52_000 }], declaredTTC: 613_600 }));
    expect(r.value).toMatchObject({ status: "En litige", disputeReason: "Écart au rapprochement avec le bon de commande et les réceptions." });
    const c = await correctInvoice(ach, r.value.id, invoiceInput(o.id, 10));
    expect(c.value).toMatchObject({ status: "Conforme", issues: [] });
  });
  it("only conforming invoices are transmitted, and finance is notified", async () => {
    const s = setup(); const o = await received(s, 6); const ach = await s.as("U-ACH");
    const bad = await recordInvoice(ach, invoiceInput(o.id, 6, { declaredTTC: 1 }));
    await expect(transmitInvoice(ach, bad.value.id)).rejects.toThrow("conforme");
    const ok = await correctInvoice(ach, bad.value.id, invoiceInput(o.id, 6));
    const t = await transmitInvoice(ach, ok.value.id);
    expect(t.value).toMatchObject({ status: "Transmise à la Finance", transmittedAt: "2026-11-26T10:00:00.000Z" });
    expect(t.events.map(e => e.type)).toEqual(["purchase.invoice_transmitted"]);
  });
  it("transmitted invoices are frozen", async () => {
    const s = setup(); const o = await received(s, 10); const ach = await s.as("U-ACH");
    const i = await recordInvoice(ach, invoiceInput(o.id, 10));
    await transmitInvoice(ach, i.value.id);
    await expect(correctInvoice(ach, i.value.id, invoiceInput(o.id, 10))).rejects.toThrow("transmise");
    await expect(cancelInvoice(ach, i.value.id, "Erreur de saisie")).rejects.toThrow("transmise");
  });
  it("a cancelled invoice frees its quantities", async () => {
    const s = setup(); const o = await received(s, 6); const ach = await s.as("U-ACH");
    const i = await recordInvoice(ach, invoiceInput(o.id, 6));
    await cancelInvoice(ach, i.value.id, "Numéro mal saisi");
    expect((await recordInvoice(ach, invoiceInput(o.id, 6, { supplierInvoiceNo: "OMP-F-OK" }))).value.status).toBe("Conforme");
  });
  it("the last transmission auto-closes a fully received order", async () => {
    const s = setup(); const o = await received(s, 10); const ach = await s.as("U-ACH");
    const i = await recordInvoice(ach, invoiceInput(o.id, 10));
    const t = await transmitInvoice(ach, i.value.id);
    expect(t.events.map(e => e.type)).toEqual(["purchase.invoice_transmitted", "purchase.order_closed"]);
    expect(t.events[1]).toMatchObject({ releasedHT: 0 });
    expect((await s.repos.purchasing.orders.get(o.id))?.status).toBe("Clôturé");
    expect((await s.repos.purchasing.requests.get(o.requestId))?.status).toBe("Clôturée");
  });
  it("close with balance cancels the remainder and reports the released amount", async () => {
    const s = setup(); const o = await received(s, 6); const ach = await s.as("U-ACH");
    const i = await recordInvoice(ach, invoiceInput(o.id, 6));
    const t = await transmitInvoice(ach, i.value.id);
    expect(t.events.map(e => e.type)).toEqual(["purchase.invoice_transmitted"]);
    const c = await closeOrderWithBalance(ach, o.id, "Fournisseur en rupture, reliquat abandonné");
    expect(c.value).toMatchObject({ status: "Clôturé", closeReason: "Fournisseur en rupture, reliquat abandonné" });
    expect(c.value.lines[0].cancelledQty).toBe(4);
    expect(c.events[0]).toMatchObject({ type: "purchase.order_closed", releasedHT: 200_000 });
    expect((await s.repos.purchasing.requests.get(o.requestId))?.status).toBe("Clôturée");
  });
  it("close with balance is refused while an invoice is disputed", async () => {
    const s = setup(); const o = await received(s, 6); const ach = await s.as("U-ACH");
    await recordInvoice(ach, invoiceInput(o.id, 6, { declaredTTC: 1 }));
    await expect(closeOrderWithBalance(ach, o.id, "Reliquat abandonné")).rejects.toThrow("En litige");
  });
});

describe("final review fixes", () => {
  it("I-1: a failed quote selection leaves no trace", async () => {
    const s = setup(); const fin = await s.as("U-FIN"); const ach = await s.as("U-ACH");
    const c = await createRequest(fin, draft({ projectId: undefined, lines: [line(4, 120_000)] }));
    await submitRequest(fin, c.value.id); await approveAll(s, c.value.id);
    const q = await recordQuote(ach, c.value.id, quoteInput(c.value.id, "SUP-002", [130_000]));
    await expect(selectQuote(ach, q.value.id, {})).rejects.toThrow("Aucun validateur éligible pour l’étape Finance.");
    expect((await s.repos.purchasing.quotes.get(q.value.id))?.status).toBe("Reçu");
    expect((await s.repos.purchasing.requests.get(c.value.id))?.selectedQuoteId).toBeUndefined();
  });
  it("I-2: the 10 % tolerance does not compound across selections", async () => {
    const s = setup(); const ach = await s.as("U-ACH");
    const id = await approvedRequest(s, [line(6, 100_000)]);
    const a = await recordQuote(ach, id, quoteInput(id, "SUP-002", [108_000]));
    const b = await recordQuote(ach, id, quoteInput(id, "SUP-004", [118_000])); // 708 000: within 10 % of A (648 000) but +18 % on the validated 600 000
    await selectQuote(ach, a.value.id, {});
    await expect(selectQuote(ach, b.value.id, { selectionNote: "Meilleure garantie constructeur" })).rejects.toThrow("dépassement");
  });
  it("I-3: cancelling the last blocking invoice auto-closes a completed order", async () => {
    const s = setup(); const o = await issuedOrder(s); const ach = await s.as("U-ACH");
    await recordReceipt(await s.as("U-MAG"), o.id, receive("OL1", 10));
    const a = await recordInvoice(ach, invoiceInput(o.id, 10));
    const dup = await recordInvoice(ach, invoiceInput(o.id, 10, { supplierInvoiceNo: "OMP-F-DOUBLON" }));
    await transmitInvoice(ach, a.value.id);
    expect((await s.repos.purchasing.orders.get(o.id))?.status).toBe("Reçu");
    const c = await cancelInvoice(ach, dup.value.id, "Doublon du fournisseur");
    expect(c.events.map(e => e.type)).toEqual(["purchase.invoice_cancelled", "purchase.order_closed"]);
    expect((await s.repos.purchasing.orders.get(o.id))?.status).toBe("Clôturé");
  });
  it("I-4: a complementary approval is shown with the selected quote amount", async () => {
    const s = setup(); const ach = await s.as("U-ACH");
    const id = await approvedRequest(s, [line(4, 120_000)]);
    const q = await recordQuote(ach, id, quoteInput(id, "SUP-002", [130_000]));
    await selectQuote(ach, q.value.id, {});
    expect(approvalAmountOf((await s.repos.purchasing.requests.get(id))!, await s.repos.purchasing.quotes.list())).toBe(520_000);
  });
  it("M-1: duplicated lines in one receipt cannot exceed the remainder", async () => {
    const s = setup(); const o = await issuedOrder(s); const mag = await s.as("U-MAG");
    await recordReceipt(mag, o.id, receive("OL1", 8));
    await expect(recordReceipt(mag, o.id, { deliveryNoteRef: "BL-2", lines: [{ orderLineId: "OL1", received: 2, accepted: 2, rejected: 0 }, { orderLineId: "OL1", received: 2, accepted: 2, rejected: 0 }] })).rejects.toThrow("dépasse le reliquat (2)");
  });
  it("M-3: no invoice on a closed or cancelled order, and no cancelling an invoiced order", async () => {
    const s = setup(); const ach = await s.as("U-ACH");
    const o = await issuedOrder(s);
    await recordReceipt(await s.as("U-MAG"), o.id, receive("OL1", 10));
    const i = await recordInvoice(ach, invoiceInput(o.id, 10));
    await transmitInvoice(ach, i.value.id);
    await expect(recordInvoice(ach, invoiceInput(o.id, 1, { supplierInvoiceNo: "TARD" }))).rejects.toThrow("clôturé");
  });
});

describe("stabilisation", () => {
  it("4. seeded disputed invoice FAC-003 follows a normal path once corrected", async () => {
    const s = setup(); const ach = await s.as("U-ACH");
    const f = (await s.repos.purchasing.invoices.get("FAC-003"))!;
    expect(f.status).toBe("En litige");
    const lines = f.lines.map(l => ({ ...l, unitPriceHT: 27_500 }));
    const c = await correctInvoice(ach, f.id, { orderId: f.orderId, supplierInvoiceNo: f.supplierInvoiceNo, invoiceDate: f.invoiceDate, dueDate: f.dueDate, lines, vatRateBp: f.vatRateBp, declaredTTC: 389_400 });
    expect(c.value).toMatchObject({ status: "Conforme", issues: [], totalHT: 330_000, totalVAT: 59_400, totalTTC: 389_400 });
    expect((await transmitInvoice(ach, f.id)).value.status).toBe("Transmise à la Finance");
  });
  it("3. the complementary approval notification states the real state of the request", async () => {
    const s = setup(); const ach = await s.as("U-ACH");
    const id = await approvedRequest(s, [line(4, 120_000)]);
    const q = await recordQuote(ach, id, quoteInput(id, "SUP-002", [130_000]));
    await selectQuote(ach, q.value.id, {});
    const [v] = await pending(s, id);
    const r = await decidePurchaseApproval(await s.as("U-FIN"), v.id, "approve");
    const approved = r.events.find(e => e.type === "purchase.request_approved")!;
    const dir = { users: await s.repos.users.list(), projects: await s.repos.projects.list(), prototypeLinks: [] };
    const ns = notificationsFor(approved, dir);
    expect(ns.map(n => n.recipientId).sort()).toEqual(["U-ACH", "U-KOF"]);
    expect(ns[0].title).toBe(`Validation complémentaire obtenue : ${id}`);
    expect(ns[0].body).toBe(`Le devis ${q.value.id} retenu (520\u202f000 FCFA HT) est validé : le bon de commande peut être émis.`);
    expect(ns[0].body).not.toContain("consultation");
  });
  it("2. a cancelled request does not show as rejected by its validator", async () => {
    const s = setup(); const kof = await s.as("U-KOF");
    const c = await createRequest(kof, draft());
    await submitRequest(kof, c.value.id);
    await cancelRequest(kof, c.value.id, "Besoin couvert par le stock existant");
    const vs = (await s.repos.validations.list()).filter(v => v.subjectId === c.value.id);
    expect(vs.map(v => v.status)).toEqual(["Annulée"]);
    expect(vs[0].comment).toBe("Demande annulée par Kofi Amoussou : « Besoin couvert par le stock existant »");
  });
  it("2. cancelling a request only touches its own purchase validations", async () => {
    const s = setup(); const kof = await s.as("U-KOF");
    const c = await createRequest(kof, draft());
    await submitRequest(kof, c.value.id);
    await s.repos.validations.create({ subjectType: "task", subjectId: c.value.id, authorId: "U-KAR", ownerId: "U-KOF", validatorId: "U-QUA", status: "En attente", requestedAt: now() });
    await cancelRequest(kof, c.value.id, "Besoin couvert par le stock existant");
    expect((await s.repos.validations.list()).filter(v => v.subjectId === c.value.id && v.subjectType === "task").map(v => v.status)).toEqual(["En attente"]);
  });
  it("1. correcting a conforming invoice is not affected by a disputed duplicate", async () => {
    const s = setup(); const ach = await s.as("U-ACH");
    const o = await issuedOrder(s);
    await recordReceipt(await s.as("U-MAG"), o.id, receive("OL1", 10));
    const a = await recordInvoice(ach, invoiceInput(o.id, 10));
    const dup = await recordInvoice(ach, invoiceInput(o.id, 10, { supplierInvoiceNo: "OMP-F-DOUBLON" }));
    expect(dup.value.status).toBe("En litige");
    const c = await correctInvoice(ach, a.value.id, invoiceInput(o.id, 10, { dueDate: "2027-01-15" }));
    expect(c.value).toMatchObject({ status: "Conforme", issues: [], dueDate: "2027-01-15" });
  });
});
