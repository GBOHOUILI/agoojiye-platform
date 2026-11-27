import type { DomainEvent, GoodsReceivedLine } from "@/domain/events";
import { lineProgress, receiptStatus } from "@/lib/purchasing/order-progress";
import { receiptSchema, type ReceiptInput } from "@/lib/validations/purchasing";
import type { GoodsReceipt } from "@/types";
import { DomainError, getOrFail, parseInput, requirePermission, type CommandResult, type ServiceContext } from "../context";

export async function recordReceipt(ctx: ServiceContext, orderId: string, input: ReceiptInput): Promise<CommandResult<GoodsReceipt>> {
  requirePermission(ctx, "purchase:receive");
  const d = parseInput(receiptSchema, input);
  const o = await getOrFail(ctx.repos.purchasing.orders.get(orderId), "Bon de commande");
  if (o.status !== "Émis" && o.status !== "Partiellement reçu") throw new DomainError(`Réception impossible sur un bon de commande ${o.status.toLowerCase()}.`);
  const progress = lineProgress(o, await ctx.repos.purchasing.receipts.list(), []);
  const lines = d.lines.filter(l => l.received > 0 || l.accepted > 0 || l.rejected > 0);
  if (!lines.length) throw new DomainError("Aucune quantité reçue.");
  for (const l of lines) {
    const ol = o.lines.find(x => x.id === l.orderLineId);
    if (!ol) throw new DomainError(`Ligne inconnue : ${l.orderLineId}.`);
    if (l.accepted + l.rejected !== l.received) throw new DomainError(`${ol.designation} : accepté + rejeté doit être égal au reçu.`);
    if (l.rejected > 0 && (l.rejectReason?.trim().length ?? 0) < 5) throw new DomainError(`${ol.designation} : un motif de rejet est requis.`);
    const missing = progress.find(p => p.orderLineId === ol.id)!.missing;
    // Several entries for the same line are added up before the check.
    const total = lines.filter(x => x.orderLineId === ol.id).reduce((s, x) => s + x.received, 0);
    if (total > missing) throw new DomainError(`${ol.designation} : la quantité reçue dépasse le reliquat (${missing}).`);
  }
  const receipt = await ctx.repos.purchasing.receipts.create({
    orderId: o.id, receivedById: ctx.actor.id, receivedAt: ctx.now(), deliveryNoteRef: d.deliveryNoteRef,
    lines: lines.map(l => ({ orderLineId: l.orderLineId, received: l.received, accepted: l.accepted, rejected: l.rejected, ...(l.rejected > 0 ? { rejectReason: l.rejectReason!.trim() } : {}) })),
    ...(d.comment ? { comment: d.comment } : {}),
  });
  const order = await ctx.repos.purchasing.orders.update(o.id, { status: receiptStatus(o, await ctx.repos.purchasing.receipts.list()) });
  const request = await getOrFail(ctx.repos.purchasing.requests.get(o.requestId), "Demande d’achat");
  // Stock contract: only `accepted` may feed stock; received/rejected are for traceability.
  const stockLines: GoodsReceivedLine[] = receipt.lines.map(l => {
    const ol = o.lines.find(x => x.id === l.orderLineId)!;
    return { orderLineId: l.orderLineId, designation: ol.designation, unit: ol.unit, received: l.received, accepted: l.accepted, rejected: l.rejected, ...(ol.itemRef ? { itemRef: ol.itemRef } : {}), ...(l.rejectReason ? { rejectReason: l.rejectReason } : {}) };
  });
  const at = ctx.now();
  const events: DomainEvent[] = [{ type: "purchase.goods_received", actorId: ctx.actor.id, at, request, order, receipt, lines: stockLines }];
  if (receipt.lines.some(l => l.rejected > 0)) events.push({ type: "purchase.nonconformity", actorId: ctx.actor.id, at, order, receipt });
  return { value: receipt, events };
}
