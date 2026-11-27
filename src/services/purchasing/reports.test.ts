import { describe, expect, it } from "vitest";
import { INVOICES0, PURCHASE_ORDERS0, PURCHASE_REQUESTS0, RECEIPTS0 } from "@/data/seed-purchasing";
import { committedHT, cycleTimeDays, nonConformityRate, spendByMonth, spendByProject, spendBySupplier, supplierStats, toCsv } from "./reports";

describe("supplier statistics", () => {
  it("sums ordered HT of non-cancelled orders and rates deliveries", () => {
    const s = supplierStats("SUP-003", PURCHASE_ORDERS0, RECEIPTS0, INVOICES0);
    // BC-0001 (484 800) + BC-0002 (780 000)
    expect(s.orderedHT).toBe(1_264_800);
    expect(s.orders).toBe(2);
    // REC-001, REC-002 and REC-003 all arrived before the expected delivery date
    expect(s.onTimeRate).toBe(100);
    // 2 rejected out of 58 received
    expect(s.nonConformityRate).toBeCloseTo(3.4, 1);
    expect(s.openDisputes).toBe(1);
  });
  it("returns null rates when nothing was received", () => {
    expect(supplierStats("SUP-009", PURCHASE_ORDERS0, RECEIPTS0, INVOICES0)).toEqual({ orders: 0, orderedHT: 0, onTimeRate: null, nonConformityRate: null, openDisputes: 0 });
  });
});

describe("purchasing reports", () => {
  const cancelled = { ...PURCHASE_ORDERS0[0], id: "BC-X", status: "Annulé" as const };
  const closedWithBalance = { ...PURCHASE_ORDERS0[0], id: "BC-Y", projectId: "PRJ-04", lines: PURCHASE_ORDERS0[0].lines.map(l => ({ ...l, cancelledQty: 2 })) };
  it("committed HT = order HT minus released balance", () => {
    expect(committedHT(PURCHASE_ORDERS0[0])).toBe(484_800);
    expect(committedHT(closedWithBalance)).toBe(484_800 - 2 * 41_000 - 2 * 9_800);
  });
  it("spend by project excludes cancelled orders and deducts released amounts", () => {
    const rows = spendByProject([...PURCHASE_ORDERS0, cancelled, closedWithBalance]);
    expect(rows.find(r => r.projectId === "PRJ-02")?.totalHT).toBe(484_800 + 780_000);
    expect(rows.find(r => r.projectId === "PRJ-03")?.totalHT).toBe(310_000 + 6_310_000);
    expect(rows.find(r => r.projectId === "PRJ-04")?.totalHT).toBe(383_200);
    expect(rows.every(r => Number.isInteger(r.totalHT))).toBe(true);
  });
  it("spend by supplier and by month", () => {
    expect(spendBySupplier(PURCHASE_ORDERS0).find(r => r.supplierId === "SUP-003")?.totalHT).toBe(1_264_800);
    expect(spendByMonth(PURCHASE_ORDERS0)).toEqual([{ month: "2026-10", totalHT: 310_000 }, { month: "2026-11", totalHT: 484_800 + 780_000 + 6_310_000 }]);
  });
  it("median cycle time from submission to order", () => expect(cycleTimeDays(PURCHASE_REQUESTS0, PURCHASE_ORDERS0)).toBe(3));
  it("non-conformity rate over all receipts", () => {
    expect(nonConformityRate(RECEIPTS0)).toBeCloseTo((2 / 63) * 100, 5);
    expect(nonConformityRate([])).toBeNull();
  });
  it("CSV uses semicolons, a UTF-8 BOM and escapes special characters", () =>
    expect(toCsv([{ Fournisseur: "Ouémé; Mécanique", Note: 'dit "urgent"', Montant: 1_250_000 }])).toBe('\uFEFFFournisseur;Note;Montant\r\n"Ouémé; Mécanique";"dit ""urgent""";1250000'));
});
