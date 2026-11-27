import { describe, expect, it } from "vitest";
import { documentTotals, formatFCFA, isMoney, lineHT } from "./money";

describe("FCFA money", () => {
  it("computes line and document totals as integers", () => {
    expect(lineHT(3, 125_000)).toBe(375_000);
    expect(documentTotals([{ quantity: 3, unitPriceHT: 125_000 }, { quantity: 2, unitPriceHT: 41_250 }], 1800))
      .toEqual({ totalHT: 457_500, totalVAT: 82_350, totalTTC: 539_850 });
  });
  it("rounds VAT once per document, half up, and keeps HT + TVA = TTC", () => {
    expect(documentTotals([{ quantity: 1, unitPriceHT: 1_003 }], 1800)).toEqual({ totalHT: 1_003, totalVAT: 181, totalTTC: 1_184 });
    for (let p = 1; p < 2_000; p += 37) {
      const x = documentTotals([{ quantity: 7, unitPriceHT: p }], 1800);
      expect(x.totalHT + x.totalVAT).toBe(x.totalTTC);
      expect(Number.isInteger(x.totalVAT)).toBe(true);
    }
  });
  it("supports a 0 % rate", () => expect(documentTotals([{ quantity: 2, unitPriceHT: 50_000 }], 0)).toEqual({ totalHT: 100_000, totalVAT: 0, totalTTC: 100_000 }));
  it("rejects non-integer or negative amounts", () => { expect(isMoney(10.5)).toBe(false); expect(isMoney(-1)).toBe(false); expect(isMoney(0)).toBe(true); });
  it("formats FCFA with thin spaces", () => expect(formatFCFA(1_250_000)).toBe("1 250 000 FCFA"));
});
