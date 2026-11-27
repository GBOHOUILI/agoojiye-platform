import { describe, expect, it } from "vitest";
import { seedDocument } from "@/repositories/local/database";
import { isOverdue } from "@/services/tasks.service";
import { DATE_FIELDS, rebaseDocument } from "./rebase";
import { engineeringData } from "./engineering";

const ISO = /^\d{4}-\d{2}-\d{2}/;

describe("demo data rebasing", () => {
  it("every date-looking field of the seed is declared in DATE_FIELDS (nothing forgotten)", () => {
    const doc = seedDocument("2026-11-26") as unknown as Record<string, unknown>;
    const missing: string[] = [];
    const visit = (collection: string, o: Record<string, unknown>, prefix = "") => {
      for (const [k, v] of Object.entries(o)) {
        const key = prefix + k;
        if (typeof v === "string" && ISO.test(v) && !(DATE_FIELDS[collection] ?? []).includes(key)) missing.push(`${collection}.${key}`);
        if (Array.isArray(v)) v.forEach(x => typeof x === "object" && x && visit(collection, x as Record<string, unknown>, `${key}[].`));
      }
    };
    for (const [c, rows] of Object.entries(doc)) {
      if (Array.isArray(rows)) rows.forEach(r => visit(c, r as Record<string, unknown>));
      else if (c === "notes" && rows) Object.values(rows as Record<string, Record<string, unknown>[]>).flat().forEach(r => visit("notes", r));
    }
    expect([...new Set(missing)]).toEqual([]);
  });
  it("keeps the gap between dates", () => {
    const a = seedDocument("2026-11-26"), b = seedDocument("2027-03-15");
    const gap = (d: typeof a) => { const t = d.tasks.find(x => x.id === "TSK-005")!; return Date.parse(t.dueDate) - Date.parse(t.createdAt.slice(0, 10)); };
    expect(gap(b)).toBe(gap(a));
    expect(b.tasks.find(x => x.id === "TSK-005")!.dueDate).toBe("2027-03-09");
  });
  it("shows the same overdue work whatever the day of the demo", () => {
    const late = (day: string) => {
      const d = seedDocument(day);
      return { tasks: d.tasks.filter(t => isOverdue(t, day)).length, orders: d.purchaseOrders.filter(o => (o.status === "Émis" || o.status === "Partiellement reçu") && o.expectedDelivery < day).length };
    };
    expect(late("2027-03-15")).toEqual(late("2026-11-26"));
    expect(late("2028-01-02")).toEqual(late("2026-11-26"));
  });
  it("does nothing on the anchor day", () => expect(rebaseDocument(seedDocument("2026-11-26"), 0)).toEqual(seedDocument("2026-11-26")));
  it("shifts the read-only engineering data by the given offset", () => {
    const e = engineeringData(10);
    expect(e.prototypes.find(p => p.id === "AG-01")?.date).toBe("2026-08-22");
    expect(e.tests.find(t => t.id === "TES-003")?.date).toBe("2026-11-25");
  });
});
