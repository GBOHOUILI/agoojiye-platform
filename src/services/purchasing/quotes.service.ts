import type { DomainEvent } from "@/domain/events";
import { documentTotals, formatFCFA } from "@/lib/purchasing/money";
import { PURCHASING_RULES } from "@/lib/purchasing/rules";
import { quoteSchema, reasonSchema, type QuoteInput } from "@/lib/validations/purchasing";
import type { PurchaseRequest, Quote } from "@/types";
import { DomainError, getOrFail, parseInput, requirePermission, type CommandResult, type ServiceContext } from "../context";
import { nextApproval, plan, requestTotalHT } from "./requests.service";

export function compareQuotes(quotes: Quote[]): { cheapestId?: string; fastestId?: string } {
  const live = quotes.filter(q => q.status !== "Écarté");
  const by = (k: "totalHT" | "deliveryDays") => [...live].sort((a, b) => a[k] - b[k])[0]?.id;
  return { cheapestId: by("totalHT"), fastestId: by("deliveryDays") };
}

const activeSupplier = async (ctx: ServiceContext, id: string) => {
  const s = await getOrFail(ctx.repos.purchasing.suppliers.get(id), "Fournisseur");
  if (s.status !== "Actif") throw new DomainError(`Fournisseur suspendu : ${s.name}.`);
  return s;
};

export async function recordQuote(ctx: ServiceContext, requestId: string, input: QuoteInput): Promise<CommandResult<Quote>> {
  requirePermission(ctx, "purchase:quote");
  const d = parseInput(quoteSchema, input);
  const r = await getOrFail(ctx.repos.purchasing.requests.get(requestId), "Demande d’achat");
  if (r.status !== "Approuvée" && r.status !== "En consultation") throw new DomainError("Les devis se saisissent sur une demande approuvée ou en consultation.");
  await activeSupplier(ctx, d.supplierId);
  const priced = r.lines.map(l => ({ line: l, price: d.prices.find(p => p.lineId === l.id) }));
  if (priced.some(p => !p.price) || d.prices.length !== r.lines.length) throw new DomainError("Un prix unitaire est requis pour chaque ligne de la demande.");
  const vatRateBp = d.vatRateBp ?? PURCHASING_RULES.defaultVatRateBp;
  const totals = documentTotals(priced.map(p => ({ quantity: p.line.quantity, unitPriceHT: p.price!.unitPriceHT })), vatRateBp);
  const quote = await ctx.repos.purchasing.quotes.create({
    requestId, supplierId: d.supplierId, supplierRef: d.supplierRef, receivedAt: d.receivedAt, validUntil: d.validUntil, deliveryDays: d.deliveryDays,
    prices: priced.map(p => ({ lineId: p.line.id, unitPriceHT: p.price!.unitPriceHT })), vatRateBp, ...totals, status: "Reçu",
  });
  const request = r.status === "Approuvée" ? await ctx.repos.purchasing.requests.update(r.id, { status: "En consultation" }) : r;
  return { value: quote, events: [{ type: "purchase.quote_recorded", actorId: ctx.actor.id, at: ctx.now(), request, quote }] };
}

export interface SelectionInput { selectionNote?: string; singleSourceReason?: string; overrunReason?: string }

export async function selectQuote(ctx: ServiceContext, quoteId: string, input: SelectionInput): Promise<CommandResult<PurchaseRequest>> {
  requirePermission(ctx, "purchase:quote");
  const quote = await getOrFail(ctx.repos.purchasing.quotes.get(quoteId), "Devis");
  if (quote.status === "Écarté") throw new DomainError("Ce devis a été écarté.");
  const r = await getOrFail(ctx.repos.purchasing.requests.get(quote.requestId), "Demande d’achat");
  if (r.status !== "En consultation") throw new DomainError(`Transition impossible : ${r.status} → devis retenu.`);
  await activeSupplier(ctx, quote.supplierId);
  const quotes = (await ctx.repos.purchasing.quotes.list()).filter(q => q.requestId === r.id);
  const R = PURCHASING_RULES;

  const patch: Partial<PurchaseRequest> = { selectedQuoteId: quote.id, singleSourceReason: undefined, overrunReason: undefined };
  if (requestTotalHT(r) >= R.minQuotesAboveHT && quotes.length < R.minQuotes) {
    if (!input.singleSourceReason?.trim()) throw new DomainError(`Deux devis sont requis au-delà de ${formatFCFA(R.minQuotesAboveHT)} HT, sauf exception justifiée.`);
    patch.singleSourceReason = parseInput(reasonSchema, input.singleSourceReason);
  }
  let selectionNote: string | undefined;
  if (quotes.some(q => q.status !== "Écarté" && q.totalHT < quote.totalHT)) {
    if (!input.selectionNote?.trim()) throw new DomainError("Ce devis n’est pas le moins-disant : une justification du choix est requise.");
    selectionNote = parseInput(reasonSchema, input.selectionNote);
  }
  // Overrun is measured against the amount last validated by a person, so the tolerance never compounds.
  const validated = r.validatedAmountHT ?? r.approvedAmountHT ?? requestTotalHT(r);
  const approved = r.approvedAmountHT ?? validated;
  // Integer comparison: quote > approved × (100 + tolerance) / 100.
  const overrun = quote.totalHT * 100 > validated * (100 + R.overrunTolerancePct);
  if (overrun) {
    if (!input.overrunReason?.trim()) throw new DomainError(`Le devis dépasse l’estimation validée de plus de ${R.overrunTolerancePct} % : une justification du dépassement est requise.`);
    patch.overrunReason = parseInput(reasonSchema, input.overrunReason);
  }

  // Check the circuit before any write: a missing validator must leave the request untouched.
  await plan(ctx, r, quote.totalHT);
  for (const q of quotes.filter(q => q.status === "Retenu" && q.id !== quote.id)) await ctx.repos.purchasing.quotes.update(q.id, { status: "Reçu" });
  const selected = await ctx.repos.purchasing.quotes.update(quote.id, { status: "Retenu", ...(selectionNote ? { selectionNote } : {}) });
  let request = await ctx.repos.purchasing.requests.update(r.id, { ...patch, validatedAmountHT: validated });
  const events: DomainEvent[] = [{ type: "purchase.quote_selected", actorId: ctx.actor.id, at: ctx.now(), request, quote: selected, overrun }];

  // Re-check the approval circuit against the new amount: any step not yet granted becomes a complementary approval.
  const next = await nextApproval(ctx, request, selected.totalHT);
  if (next) {
    request = await ctx.repos.purchasing.requests.update(r.id, { status: "Validation complémentaire" });
    events.push({ ...next, request } as DomainEvent);
  } else if (selected.totalHT > approved) request = await ctx.repos.purchasing.requests.update(r.id, { approvedAmountHT: selected.totalHT });
  return { value: request, events };
}
