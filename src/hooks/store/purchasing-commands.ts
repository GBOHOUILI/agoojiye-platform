import type { InvoiceInput, OrderIssueInput, QuoteInput, ReceiptInput, RequestDraftInput, SupplierInput } from "@/lib/validations/purchasing";
import type { CommandResult, ServiceContext } from "@/services/context";
import { cancelInvoice, correctInvoice, recordInvoice, transmitInvoice } from "@/services/purchasing/invoices.service";
import { cancelOrder, closeOrderWithBalance, issueOrder } from "@/services/purchasing/orders.service";
import { recordQuote, selectQuote, type SelectionInput } from "@/services/purchasing/quotes.service";
import { recordReceipt } from "@/services/purchasing/receipts.service";
import { cancelRequest, createRequest, submitRequest, updateDraft } from "@/services/purchasing/requests.service";
import { createSupplier, updateSupplier } from "@/services/purchasing/suppliers.service";
import type { Supplier } from "@/types";

type Run = <T>(fn: () => Promise<CommandResult<T>>, ok?: (v: T) => string) => Promise<{ ok: true; value: T } | { ok: false }>;
const idOf = (r: { ok: true; value: { id: string } } | { ok: false }) => (r.ok ? r.value.id : null);

/** Purchasing commands for the demo store. Every rule and permission is enforced by the services. */
export function purchasingCommands(run: Run, ctx: () => ServiceContext) {
  return {
    createSupplier: async (i: SupplierInput) => idOf(await run(() => createSupplier(ctx(), i), s => `Fournisseur ${s.name} créé`)),
    updateSupplier: async (id: string, patch: Partial<SupplierInput> & { status?: Supplier["status"] }) => (await run(() => updateSupplier(ctx(), id, patch), s => `Fournisseur ${s.name} : ${s.status}`)).ok,
    createPurchaseRequest: async (d: RequestDraftInput) => idOf(await run(() => createRequest(ctx(), d), r => `Brouillon ${r.id} enregistré`)),
    updatePurchaseDraft: async (id: string, d: RequestDraftInput) => (await run(() => updateDraft(ctx(), id, d), r => `${r.id} mise à jour`)).ok,
    submitPurchaseRequest: async (id: string) => (await run(() => submitRequest(ctx(), id), r => `${r.id} soumise à validation`)).ok,
    cancelPurchaseRequest: async (id: string, reason: string) => (await run(() => cancelRequest(ctx(), id, reason), r => `${r.id} annulée`)).ok,
    recordQuote: async (requestId: string, i: QuoteInput) => (await run(() => recordQuote(ctx(), requestId, i), q => `Devis ${q.id} enregistré`)).ok,
    selectQuote: async (quoteId: string, i: SelectionInput) => (await run(() => selectQuote(ctx(), quoteId, i), r => (r.status === "Validation complémentaire" ? `Devis retenu : validation complémentaire requise` : `Devis retenu pour ${r.id}`))).ok,
    issueOrder: async (requestId: string, i: OrderIssueInput) => idOf(await run(() => issueOrder(ctx(), requestId, i), o => `Bon de commande ${o.id} émis`)),
    cancelOrder: async (id: string, reason: string) => (await run(() => cancelOrder(ctx(), id, reason), o => `${o.id} annulé`)).ok,
    closeOrder: async (id: string, reason: string) => (await run(() => closeOrderWithBalance(ctx(), id, reason), o => `${o.id} clôturé avec solde`)).ok,
    recordReceipt: async (orderId: string, i: ReceiptInput) => (await run(() => recordReceipt(ctx(), orderId, i), r => `Réception ${r.id} enregistrée`)).ok,
    recordInvoice: async (i: InvoiceInput) => idOf(await run(() => recordInvoice(ctx(), i), f => `Facture ${f.id} : ${f.status}`)),
    correctInvoice: async (id: string, i: InvoiceInput) => (await run(() => correctInvoice(ctx(), id, i), f => `Facture ${f.id} : ${f.status}`)).ok,
    cancelInvoice: async (id: string, reason: string) => (await run(() => cancelInvoice(ctx(), id, reason), f => `Facture ${f.id} annulée`)).ok,
    transmitInvoice: async (id: string) => (await run(() => transmitInvoice(ctx(), id), f => `Facture ${f.id} transmise à la Finance`)).ok,
  };
}
export type PurchasingCommands = ReturnType<typeof purchasingCommands>;
