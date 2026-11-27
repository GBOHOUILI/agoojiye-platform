import { describe, expect, it } from "vitest";
import * as P from "./seed-purchasing";
import { USERS0 } from "./seed-org";
import { PROJECTS0, TASKS0 } from "./seed-work";
import { documentTotals } from "@/lib/purchasing/money";
import { lineProgress } from "@/lib/purchasing/order-progress";
import { matchInvoice } from "@/lib/purchasing/invoice-match";

const ids = <T extends { id: string }>(xs: T[]) => new Set(xs.map(x => x.id));

describe("purchasing seed", () => {
  it("references existing users, projects, tasks and suppliers", () => {
    const U = ids(USERS0), Pj = ids(PROJECTS0), S = ids(P.SUPPLIERS0), R = ids(P.PURCHASE_REQUESTS0), Q = ids(P.QUOTES0), O = ids(P.PURCHASE_ORDERS0);
    P.PURCHASE_REQUESTS0.forEach(r => {
      expect(U.has(r.requesterId)).toBe(true);
      if (r.projectId) expect(Pj.has(r.projectId)).toBe(true);
      if (r.taskId) expect(TASKS0.find(t => t.id === r.taskId)?.projectId).toBe(r.projectId);
      if (r.selectedQuoteId) expect(Q.has(r.selectedQuoteId)).toBe(true);
    });
    P.QUOTES0.forEach(q => { expect(S.has(q.supplierId)).toBe(true); expect(R.has(q.requestId)).toBe(true); });
    P.PURCHASE_ORDERS0.forEach(o => { expect(R.has(o.requestId)).toBe(true); expect(Q.has(o.quoteId)).toBe(true); });
    [...P.RECEIPTS0, ...P.INVOICES0].forEach(d => expect(O.has(d.orderId)).toBe(true));
    P.PURCHASE_VALIDATIONS0.forEach(v => { expect(R.has(v.subjectId)).toBe(true); expect(U.has(v.validatorId)).toBe(true); });
  });
  it("covers every request status and has a suspended supplier", () => {
    const st = new Set(P.PURCHASE_REQUESTS0.map(r => r.status));
    ["Brouillon", "En validation", "Rejetée", "Approuvée", "En consultation", "Validation complémentaire", "Commandée", "Clôturée"].forEach(s => expect(st.has(s as never)).toBe(true));
    expect(P.SUPPLIERS0.some(s => s.status === "Suspendu")).toBe(true);
  });
  it("stores HT, VAT and TTC consistently on every document", () => {
    for (const d of [...P.QUOTES0, ...P.PURCHASE_ORDERS0, ...P.INVOICES0]) expect(d.totalHT + d.totalVAT).toBe(d.totalTTC);
    for (const o of P.PURCHASE_ORDERS0) expect(documentTotals(o.lines, o.vatRateBp)).toEqual({ totalHT: o.totalHT, totalVAT: o.totalVAT, totalTTC: o.totalTTC });
  });
  it("never receives more than ordered nor invoices more than accepted", () => {
    for (const o of P.PURCHASE_ORDERS0) lineProgress(o, P.RECEIPTS0, P.INVOICES0).forEach(l => {
      expect(l.accepted).toBeLessThanOrEqual(l.ordered - l.cancelled);
      expect(l.invoiced).toBeLessThanOrEqual(l.accepted);
    });
  });
  it("each pending request step is unique and validators never approve their own request", () => {
    for (const r of P.PURCHASE_REQUESTS0) {
      const vs = P.PURCHASE_VALIDATIONS0.filter(v => v.subjectId === r.id);
      expect(vs.filter(v => v.status === "En attente").length).toBeLessThanOrEqual(1);
      vs.forEach(v => expect(v.validatorId).not.toBe(r.requesterId));
    }
  });
  it("seeded invoice statuses and issues are exactly what the real matching computes", () => {
    for (const inv of P.INVOICES0.filter(i => i.status !== "Annulée")) {
      const order = P.PURCHASE_ORDERS0.find(o => o.id === inv.orderId)!;
      const earlier = P.INVOICES0.filter(i => i.orderId === inv.orderId && i.id < inv.id);
      const { totals, issues } = matchInvoice(inv, order, P.RECEIPTS0, earlier);
      expect({ id: inv.id, issues: inv.issues, HT: inv.totalHT, TTC: inv.totalTTC }).toEqual({ id: inv.id, issues, HT: totals.totalHT, TTC: totals.totalTTC });
      expect(inv.status === "En litige").toBe(issues.length > 0);
    }
  });
  it("has a Magasinier job title without a new system role", () => expect(USERS0.find(u => u.jobTitle === "Magasinier")?.systemRole).toBe("TECHNICIAN"));
});
