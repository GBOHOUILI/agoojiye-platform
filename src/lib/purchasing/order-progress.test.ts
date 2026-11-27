import { describe, expect, it } from "vitest";
import { closeBlockers, isFullyDone, lineProgress, receiptStatus } from "./order-progress";

const order = { id: "BC", lines: [{ id: "OL1", quantity: 10, cancelledQty: 0, unitPriceHT: 50_000 }] } as never;
const rec = (accepted: number, rejected: number) => ({ orderId: "BC", lines: [{ orderLineId: "OL1", received: accepted + rejected, accepted, rejected }] }) as never;
const inv = (quantity: number, status: string) => ({ id: `F${quantity}${status}`, orderId: "BC", status, lines: [{ orderLineId: "OL1", quantity, unitPriceHT: 50_000 }] }) as never;

describe("order progress", () => {
  it("missing = ordered − cancelled − accepted; rejected goods stay missing", () => {
    expect(lineProgress(order, [rec(8, 2)], [])[0]).toMatchObject({ received: 10, accepted: 8, rejected: 2, missing: 2 });
    expect(receiptStatus(order, [rec(8, 2)])).toBe("Partiellement reçu");
    expect(receiptStatus(order, [rec(8, 2), rec(2, 0)])).toBe("Reçu");
    expect(receiptStatus(order, [])).toBe("Émis");
  });
  it("closing is blocked by pending invoices and by accepted goods not invoiced", () => {
    expect(closeBlockers(order, [rec(6, 0)], [])).toEqual(["Ligne OL1 : 6 unité(s) acceptée(s) non facturée(s)."]);
    expect(closeBlockers(order, [rec(6, 0)], [inv(6, "En litige")])).toEqual(["Facture F6En litige : En litige."]);
    expect(closeBlockers(order, [rec(6, 0)], [inv(6, "Transmise à la Finance")])).toEqual([]);
  });
  it("is fully done only when nothing is missing and everything accepted is invoiced and transmitted", () => {
    expect(isFullyDone(order, [rec(10, 0)], [inv(10, "Transmise à la Finance")])).toBe(true);
    expect(isFullyDone(order, [rec(6, 0)], [inv(6, "Transmise à la Finance")])).toBe(false);
    expect(isFullyDone(order, [rec(10, 0)], [inv(10, "Conforme")])).toBe(false);
  });
});
