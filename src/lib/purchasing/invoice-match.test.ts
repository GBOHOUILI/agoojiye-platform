import { describe, expect, it } from "vitest";
import { matchInvoice } from "./invoice-match";

const order = { id: "BC", vatRateBp: 1800, lines: [{ id: "OL1", quantity: 10, unitPriceHT: 50_000, cancelledQty: 0 }] } as never;
const rec = [{ orderId: "BC", lines: [{ orderLineId: "OL1", received: 6, accepted: 6, rejected: 0 }] }] as never;
const draft = (quantity: number, unitPriceHT: number, vatRateBp: number, declaredTTC: number) => ({ lines: [{ orderLineId: "OL1", quantity, unitPriceHT }], vatRateBp, declaredTTC }) as never;

describe("three-way matching", () => {
  it("conforming invoice for accepted quantities", () =>
    expect(matchInvoice(draft(6, 50_000, 1800, 354_000), order, rec, [])).toEqual({ totals: { totalHT: 300_000, totalVAT: 54_000, totalTTC: 354_000 }, issues: [] }));
  it("flags price, VAT rate and declared total gaps", () => {
    const r = matchInvoice(draft(6, 52_000, 0, 1), order, rec, []);
    expect(r.issues).toEqual([
      "Ligne OL1 : prix unitaire 52 000 FCFA au lieu de 50 000 FCFA.",
      "Taux de TVA 0 % au lieu de 18 %.",
      "Montant TTC déclaré 1 FCFA au lieu de 312 000 FCFA.",
    ]);
  });
  it("prevents double invoicing across invoices", () => {
    const prev = [{ id: "F1", orderId: "BC", status: "Conforme", lines: [{ orderLineId: "OL1", quantity: 6, unitPriceHT: 50_000 }] }] as never;
    expect(matchInvoice(draft(1, 50_000, 1800, 59_000), order, rec, prev).issues).toEqual(["Ligne OL1 : la quantité facturée cumulée (7) dépasse les quantités acceptées (6)."]);
  });
  it("ignores disputed invoices in cumulative quantities: they are not accepted for payment", () => {
    const prev = [{ id: "F1", orderId: "BC", status: "En litige", lines: [{ orderLineId: "OL1", quantity: 6, unitPriceHT: 50_000 }] }] as never;
    expect(matchInvoice(draft(6, 50_000, 1800, 354_000), order, rec, prev).issues).toEqual([]);
  });
  it("ignores cancelled invoices in cumulative quantities", () => {
    const prev = [{ id: "F1", orderId: "BC", status: "Annulée", lines: [{ orderLineId: "OL1", quantity: 6, unitPriceHT: 50_000 }] }] as never;
    expect(matchInvoice(draft(6, 50_000, 1800, 354_000), order, rec, prev).issues).toEqual([]);
  });
  it("flags an unknown order line", () =>
    expect(matchInvoice({ lines: [{ orderLineId: "OL9", quantity: 1, unitPriceHT: 1 }], vatRateBp: 1800, declaredTTC: 1 } as never, order, rec, []).issues[0]).toBe("Ligne OL9 inconnue sur ce bon de commande."));
});
