import type { DomainEvent } from "@/domain/events";
import { matchInvoice } from "@/lib/purchasing/invoice-match";
import { invoiceSchema, reasonSchema, type InvoiceInput } from "@/lib/validations/purchasing";
import type { PurchaseOrder, SupplierInvoice } from "@/types";
import { DomainError, getOrFail, parseInput, requirePermission, type CommandResult, type ServiceContext } from "../context";
import { closeIfComplete } from "./orders.service";

const DISPUTE_REASON = "Écart au rapprochement avec le bon de commande et les réceptions.";

async function evaluate(ctx: ServiceContext, input: InvoiceInput, selfId?: string) {
  const d = parseInput(invoiceSchema, input);
  const order = await getOrFail(ctx.repos.purchasing.orders.get(d.orderId), "Bon de commande");
  if (order.status === "Annulé" || order.status === "Clôturé") throw new DomainError(`Ce bon de commande est ${order.status.toLowerCase()} : aucune facture ne peut plus y être saisie.`);
  const invoices = await ctx.repos.purchasing.invoices.list();
  const no = d.supplierInvoiceNo.trim().toLowerCase();
  if (invoices.some(i => i.id !== selfId && i.status !== "Annulée" && i.supplierId === order.supplierId && i.supplierInvoiceNo.trim().toLowerCase() === no))
    throw new DomainError(`Facture déjà enregistrée : ${d.supplierInvoiceNo} pour ce fournisseur.`);
  const others = invoices.filter(i => i.orderId === order.id && i.id !== selfId);
  const { totals, issues } = matchInvoice(d, order, await ctx.repos.purchasing.receipts.list(), others);
  const status: SupplierInvoice["status"] = issues.length ? "En litige" : "Conforme";
  return { order, fields: { supplierInvoiceNo: d.supplierInvoiceNo, invoiceDate: d.invoiceDate, dueDate: d.dueDate, lines: d.lines, vatRateBp: d.vatRateBp, declaredTTC: d.declaredTTC, ...totals, status, issues, disputeReason: issues.length ? DISPUTE_REASON : undefined } };
}

const recordedEvents = (ctx: ServiceContext, order: PurchaseOrder, invoice: SupplierInvoice): DomainEvent[] => {
  const at = ctx.now();
  const events: DomainEvent[] = [{ type: "purchase.invoice_recorded", actorId: ctx.actor.id, at, order, invoice }];
  if (invoice.status === "En litige") events.push({ type: "purchase.invoice_disputed", actorId: ctx.actor.id, at, order, invoice });
  return events;
};

export async function recordInvoice(ctx: ServiceContext, input: InvoiceInput): Promise<CommandResult<SupplierInvoice>> {
  requirePermission(ctx, "purchase:invoice");
  const { order, fields } = await evaluate(ctx, input);
  const invoice = await ctx.repos.purchasing.invoices.create({ orderId: order.id, supplierId: order.supplierId, ...fields, recordedById: ctx.actor.id, recordedAt: ctx.now() });
  return { value: invoice, events: recordedEvents(ctx, order, invoice) };
}

const editable = async (ctx: ServiceContext, id: string) => {
  const i = await getOrFail(ctx.repos.purchasing.invoices.get(id), "Facture");
  if (i.status === "Transmise à la Finance") throw new DomainError("Une facture transmise à la Finance n’est plus modifiable.");
  if (i.status === "Annulée") throw new DomainError("Cette facture est annulée.");
  return i;
};

export async function correctInvoice(ctx: ServiceContext, id: string, input: InvoiceInput): Promise<CommandResult<SupplierInvoice>> {
  requirePermission(ctx, "purchase:invoice");
  const current = await editable(ctx, id);
  if (input.orderId !== current.orderId) throw new DomainError("Une facture ne peut pas changer de bon de commande.");
  const { order, fields } = await evaluate(ctx, input, id);
  const invoice = await ctx.repos.purchasing.invoices.update(id, fields);
  return { value: invoice, events: recordedEvents(ctx, order, invoice) };
}

export async function cancelInvoice(ctx: ServiceContext, id: string, reason: string): Promise<CommandResult<SupplierInvoice>> {
  requirePermission(ctx, "purchase:invoice");
  const text = parseInput(reasonSchema, reason);
  const current = await editable(ctx, id);
  const order = await getOrFail(ctx.repos.purchasing.orders.get(current.orderId), "Bon de commande");
  const invoice = await ctx.repos.purchasing.invoices.update(id, { status: "Annulée", cancelReason: text });
  // Cancelling the last blocking invoice may complete the order.
  return { value: invoice, events: [{ type: "purchase.invoice_cancelled", actorId: ctx.actor.id, at: ctx.now(), order, invoice }, ...(await closeIfComplete(ctx, order.id))] };
}

export async function transmitInvoice(ctx: ServiceContext, id: string): Promise<CommandResult<SupplierInvoice>> {
  requirePermission(ctx, "purchase:invoice");
  const current = await editable(ctx, id);
  if (current.status !== "Conforme") throw new DomainError("Seule une facture conforme peut être transmise à la Finance.");
  const invoice = await ctx.repos.purchasing.invoices.update(id, { status: "Transmise à la Finance", transmittedAt: ctx.now() });
  const order = await getOrFail(ctx.repos.purchasing.orders.get(invoice.orderId), "Bon de commande");
  const events: DomainEvent[] = [{ type: "purchase.invoice_transmitted", actorId: ctx.actor.id, at: ctx.now(), order, invoice }];
  events.push(...(await closeIfComplete(ctx, order.id)));
  return { value: invoice, events };
}
