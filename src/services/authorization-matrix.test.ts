import { describe, expect, it } from "vitest";
import { USERS0 } from "@/data/seed-org";
import { hasPermission, type Permission } from "@/lib/access-simulation/permissions";
import { ROLE_LABELS } from "@/lib/access-simulation/roles";
import { LocalDatabase } from "@/repositories/local/database";
import { createLocalRepositories } from "@/repositories/local";
import { SYSTEM_ROLES, type User } from "@/types";
import { addNoteCommand, changeAnomalyStatus, declareAnomaly } from "./anomalies.commands";
import type { ServiceContext } from "./context";
import { resetDemo } from "./demo.service";
import { updateUser } from "./organization.service";
import { createProject } from "./projects.service";
import { createSupplier } from "./purchasing/suppliers.service";
import { recordQuote, selectQuote } from "./purchasing/quotes.service";
import { issueOrder } from "./purchasing/orders.service";
import { recordReceipt } from "./purchasing/receipts.service";
import { recordInvoice, transmitInvoice } from "./purchasing/invoices.service";

// Every role × every permission-gated command: allowed exactly when the matrix grants it.
const now = () => "2026-11-26T10:00:00.000Z";
const ctxFor = (actor: User): ServiceContext => ({ repos: createLocalRepositories(new LocalDatabase(null), now), actor, now });
const techId = USERS0.find(u => u.systemRole === "TECHNICIAN")!.id;

const COMMANDS: { name: string; perm: Permission; run: (c: ServiceContext) => Promise<unknown> }[] = [
  { name: "créer un projet", perm: "project:create", run: c => createProject(c, { name: "Projet matrice", priority: "Normale", startDate: "2026-12-01", dueDate: "2027-01-01", ownerId: c.actor.id }) },
  { name: "déclarer une anomalie", perm: "incident:declare", run: c => declareAnomaly(c, { titre: "Test matrice", proto: "AG-01", comp: "MOT-001", g: "Faible", resp: "Équipe essais" }) },
  { name: "faire évoluer une anomalie", perm: "incident:update", run: c => changeAnomalyStatus(c, "ANO-001", "Action corrective", "") },
  { name: "ajouter une observation", perm: "note:add", run: c => addNoteCommand(c, "TES-001", "Observation matrice") },
  { name: "modifier une fiche", perm: "org:manage", run: c => updateUser(c, techId, { jobTitle: "Technicien senior" }) },
  { name: "changer un rôle système", perm: "admin:access", run: c => updateUser(c, techId, { systemRole: "ENGINEER" }) },
  { name: "réinitialiser la démo", perm: "admin:access", run: c => resetDemo(c) },
  { name: "créer un fournisseur", perm: "supplier:manage", run: c => createSupplier(c, { name: "Fournisseur matrice", taxId: "3209999999999", rccm: "RB/COT/26 B 0001", category: "Divers", contactName: "Contact", phone: "+229 00 00 00 98", email: "matrice@fournisseur.demo", address: "Cotonou", city: "Cotonou", paymentTermsDays: 30 }) },
  { name: "saisir un devis", perm: "purchase:quote", run: c => recordQuote(c, "DA-2026-004", { supplierId: "SUP-009", supplierRef: "MAT-1", receivedAt: "2026-11-26", validUntil: "2026-12-31", deliveryDays: 5, prices: [{ lineId: "L1", unitPriceHT: 18_000 }, { lineId: "L2", unitPriceHT: 6_000 }] }) },
  { name: "émettre un bon de commande", perm: "purchase:order", run: c => selectQuote(c, "DEV-002", {}).then(() => issueOrder(c, "DA-2026-005", { expectedDelivery: "2026-12-20", deliveryAddress: "Banc batterie, Sèmè" })) },
  { name: "réceptionner", perm: "purchase:receive", run: c => recordReceipt(c, "BC-2026-0004", { deliveryNoteRef: "BL-MAT-1", lines: [{ orderLineId: "OL2", received: 1, accepted: 1, rejected: 0 }] }) },
  { name: "enregistrer une facture", perm: "purchase:invoice", run: c => recordInvoice(c, { orderId: "BC-2026-0001", supplierInvoiceNo: "MAT-F-1", invoiceDate: "2026-11-26", dueDate: "2026-12-26", lines: [{ orderLineId: "OL1", quantity: 6, unitPriceHT: 41_000 }], vatRateBp: 1800, declaredTTC: 290_280 }) },
  { name: "transmettre une facture", perm: "purchase:invoice", run: c => transmitInvoice(c, "FAC-002") },
];

describe.each(SYSTEM_ROLES)("rôle %s", role => {
  const actor = USERS0.find(u => u.systemRole === role)!;
  it.each(COMMANDS)(`$name`, async ({ perm, run }) => {
    const p = run(ctxFor(actor));
    if (hasPermission(actor, perm)) await expect(p).resolves.toBeDefined();
    else await expect(p).rejects.toThrow(`non autorisée pour le profil ${ROLE_LABELS[role]}`);
  });
});
