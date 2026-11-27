import { describe, expect, it } from "vitest";
import { USERS0 } from "@/data/seed-org";
import { hasPermission } from "@/lib/access-simulation/permissions";
import { LocalDatabase } from "@/repositories/local/database";
import { createLocalRepositories } from "@/repositories/local";
import type { ServiceContext } from "../context";
import { resetDemo } from "../demo.service";
import { createSupplier } from "./suppliers.service";
import { recordQuote, selectQuote } from "./quotes.service";
import { issueOrder } from "./orders.service";
import { recordReceipt } from "./receipts.service";
import { recordInvoice, transmitInvoice } from "./invoices.service";

// The Administrator runs the platform but takes no part in purchasing operations.
const now = () => "2026-11-26T10:00:00.000Z";
const ctx = (id: string): ServiceContext => ({ repos: createLocalRepositories(new LocalDatabase(null, now), now), actor: USERS0.find(u => u.id === id)!, now });
const admin = USERS0.find(u => u.systemRole === "ADMIN")!.id;
const buyer = USERS0.find(u => u.systemRole === "PURCHASING")!.id;
const DENIED = "non autorisée pour le profil Administrateur";

const OPS: [string, (c: ServiceContext) => Promise<unknown>][] = [
  ["enregistrer un devis", c => recordQuote(c, "DA-2026-004", { supplierId: "SUP-009", supplierRef: "ADM-1", receivedAt: "2026-11-26", validUntil: "2026-12-31", deliveryDays: 5, prices: [{ lineId: "L1", unitPriceHT: 18_000 }, { lineId: "L2", unitPriceHT: 6_000 }] })],
  ["retenir un devis", c => selectQuote(c, "DEV-002", {})],
  ["émettre un bon de commande", c => selectQuote({ ...c, actor: USERS0.find(u => u.id === buyer)! }, "DEV-002", {}).then(() => issueOrder(c, "DA-2026-005", { expectedDelivery: "2026-12-20", deliveryAddress: "Banc batterie, Sèmè" }))],
  ["réceptionner", c => recordReceipt(c, "BC-2026-0004", { deliveryNoteRef: "BL-ADM-1", lines: [{ orderLineId: "OL2", received: 1, accepted: 1, rejected: 0 }] })],
  ["enregistrer une facture", c => recordInvoice(c, { orderId: "BC-2026-0001", supplierInvoiceNo: "ADM-F-1", invoiceDate: "2026-11-26", dueDate: "2026-12-26", lines: [{ orderLineId: "OL1", quantity: 6, unitPriceHT: 41_000 }], vatRateBp: 1800, declaredTTC: 290_280 })],
  ["transmettre une facture", c => transmitInvoice(c, "FAC-002")],
  ["créer un fournisseur", c => createSupplier(c, { name: "Fournisseur admin", taxId: "3209999999998", rccm: "RB/COT/26 B 0002", category: "Divers", contactName: "Contact", phone: "+229 00 00 00 99", email: "admin@fournisseur.demo", address: "Rue 1", city: "Cotonou", paymentTermsDays: 30 })],
];

describe("the Administrator does not run purchasing operations", () => {
  it.each(OPS)("refuses to %s", async (_, run) => await expect(run(ctx(admin))).rejects.toThrow(DENIED));
  it("keeps administration and read access", async () => {
    const a = USERS0.find(u => u.id === admin)!;
    for (const p of ["admin:access", "org:manage", "purchase:read_all", "purchase:request", "activity:read_all"] as const) expect(hasPermission(a, p), p).toBe(true);
    await expect(resetDemo(ctx(admin))).resolves.toBeDefined();
  });
  it.each(OPS)("the Purchasing profile still can %s", async (_, run) => await expect(run(ctx(buyer))).resolves.toBeDefined());
  it("never approves a purchase", () => {
    const a = USERS0.find(u => u.id === admin)!;
    expect(hasPermission(a, "purchase:approve_finance")).toBe(false);
    expect(hasPermission(a, "purchase:approve_direction")).toBe(false);
  });
});
