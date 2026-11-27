import type { DomainEvent } from "@/domain/events";
import { documentTotals } from "@/lib/purchasing/money";
import { closeBlockers, isFullyDone, lineProgress } from "@/lib/purchasing/order-progress";
import { orderIssueSchema, reasonSchema, type OrderIssueInput } from "@/lib/validations/purchasing";
import type { PurchaseOrder } from "@/types";
import { DomainError, getOrFail, parseInput, requirePermission, type CommandResult, type ServiceContext } from "../context";

export async function issueOrder(ctx: ServiceContext, requestId: string, input: OrderIssueInput): Promise<CommandResult<PurchaseOrder>> {
  requirePermission(ctx, "purchase:order");
  const d = parseInput(orderIssueSchema, input);
  const r = await getOrFail(ctx.repos.purchasing.requests.get(requestId), "Demande d’achat");
  if (r.status === "Validation complémentaire") throw new DomainError("Le bon de commande ne peut être émis avant l’approbation des validations complémentaires.");
  if (r.status !== "En consultation" || !r.selectedQuoteId) throw new DomainError(`Transition impossible : ${r.status} → bon de commande émis.`);
  const quote = await getOrFail(ctx.repos.purchasing.quotes.get(r.selectedQuoteId), "Devis retenu");
  if (quote.status !== "Retenu") throw new DomainError("Aucun devis retenu pour cette demande.");
  if ((r.approvedAmountHT ?? 0) < quote.totalHT) throw new DomainError("Le montant du devis n’est pas couvert par les validations : validations complémentaires requises.");
  const supplier = await getOrFail(ctx.repos.purchasing.suppliers.get(quote.supplierId), "Fournisseur");
  if (supplier.status !== "Actif") throw new DomainError(`Fournisseur suspendu : ${supplier.name}.`);
  if ((await ctx.repos.purchasing.orders.list()).some(o => o.requestId === r.id && o.status !== "Annulé")) throw new DomainError("Un bon de commande existe déjà pour cette demande.");

  const lines = r.lines.map((l, i) => ({ id: `OL${i + 1}`, requestLineId: l.id, designation: l.designation, unit: l.unit, quantity: l.quantity,
    unitPriceHT: quote.prices.find(p => p.lineId === l.id)!.unitPriceHT, cancelledQty: 0, ...(l.itemRef ? { itemRef: l.itemRef } : {}) }));
  const vatRateBp = d.vatRateBp ?? quote.vatRateBp;
  const order = await ctx.repos.purchasing.orders.create({
    requestId: r.id, quoteId: quote.id, supplierId: quote.supplierId, ...(r.projectId ? { projectId: r.projectId } : {}),
    lines, vatRateBp, ...documentTotals(lines, vatRateBp), expectedDelivery: d.expectedDelivery, deliveryAddress: d.deliveryAddress,
    status: "Émis", issuedById: ctx.actor.id, issuedAt: ctx.now(),
  });
  const request = await ctx.repos.purchasing.requests.update(r.id, { status: "Commandée" });
  return { value: order, events: [{ type: "purchase.order_issued", actorId: ctx.actor.id, at: ctx.now(), request, order }] };
}

export async function cancelOrder(ctx: ServiceContext, orderId: string, reason: string): Promise<CommandResult<PurchaseOrder>> {
  requirePermission(ctx, "purchase:order");
  const text = parseInput(reasonSchema, reason);
  const o = await getOrFail(ctx.repos.purchasing.orders.get(orderId), "Bon de commande");
  if ((await ctx.repos.purchasing.receipts.list()).some(r => r.orderId === o.id)) throw new DomainError("Annulation impossible : une réception a déjà été enregistrée. Utilisez la clôture avec solde.");
  if (o.status !== "Émis") throw new DomainError(`Transition impossible : ${o.status} → Annulé.`);
  if ((await ctx.repos.purchasing.invoices.list()).some(i => i.orderId === o.id && i.status !== "Annulée")) throw new DomainError("Annulation impossible : une facture est enregistrée sur ce bon de commande.");
  const order = await ctx.repos.purchasing.orders.update(o.id, { status: "Annulé", cancelReason: text });
  const request = await ctx.repos.purchasing.requests.update(o.requestId, { status: "En consultation" });
  return { value: order, events: [{ type: "purchase.order_cancelled", actorId: ctx.actor.id, at: ctx.now(), request, order }] };
}

async function close(ctx: ServiceContext, o: PurchaseOrder, reason?: string): Promise<{ order: PurchaseOrder; event: DomainEvent }> {
  const progress = lineProgress(o, await ctx.repos.purchasing.receipts.list(), []);
  // The undelivered remainder is cancelled; its HT value is released for the future Finance module.
  const lines = o.lines.map(l => ({ ...l, cancelledQty: l.quantity - (progress.find(p => p.orderLineId === l.id)?.accepted ?? 0) }));
  const releasedHT = lines.reduce((s, l) => s + l.cancelledQty * l.unitPriceHT, 0);
  const order = await ctx.repos.purchasing.orders.update(o.id, { lines, status: "Clôturé", closedAt: ctx.now(), ...(reason ? { closeReason: reason } : {}) });
  const request = await ctx.repos.purchasing.requests.update(o.requestId, { status: "Clôturée" });
  return { order, event: { type: "purchase.order_closed", actorId: ctx.actor.id, at: ctx.now(), request, order, releasedHT } };
}

export async function closeOrderWithBalance(ctx: ServiceContext, orderId: string, reason: string): Promise<CommandResult<PurchaseOrder>> {
  requirePermission(ctx, "purchase:order");
  const text = parseInput(reasonSchema, reason);
  const o = await getOrFail(ctx.repos.purchasing.orders.get(orderId), "Bon de commande");
  if (o.status === "Clôturé" || o.status === "Annulé") throw new DomainError(`Transition impossible : ${o.status} → Clôturé.`);
  const blockers = closeBlockers(o, await ctx.repos.purchasing.receipts.list(), await ctx.repos.purchasing.invoices.list());
  if (blockers.length) throw new DomainError(`Clôture impossible. ${blockers.join(" ")}`);
  const { order, event } = await close(ctx, o, text);
  return { value: order, events: [event] };
}

/** Closes the order automatically once fully received, invoiced and transmitted. */
export async function closeIfComplete(ctx: ServiceContext, orderId: string): Promise<DomainEvent[]> {
  const o = await getOrFail(ctx.repos.purchasing.orders.get(orderId), "Bon de commande");
  if (o.status !== "Reçu") return [];
  if (!isFullyDone(o, await ctx.repos.purchasing.receipts.list(), await ctx.repos.purchasing.invoices.list())) return [];
  return [(await close(ctx, o)).event];
}
