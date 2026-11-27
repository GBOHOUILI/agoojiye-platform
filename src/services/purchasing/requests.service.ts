import { approvalPlan, missingSteps } from "@/lib/purchasing/approval";
import { hasPermission } from "@/lib/access-simulation/permissions";
import { displayName } from "@/lib/people";
import { reasonSchema, requestDraftSchema, type RequestDraftInput } from "@/lib/validations/purchasing";
import type { DomainEvent } from "@/domain/events";
import type { PurchaseRequest, Quote, ValidationRequest } from "@/types";
import { deny, DomainError, getOrFail, parseInput, requirePermission, type CommandResult, type ServiceContext } from "../context";

export const requestTotalHT = (r: Pick<PurchaseRequest, "lines">) => r.lines.reduce((s, l) => s + l.quantity * l.estimatedUnitPriceHT, 0);

/** Amount the pending approval is about: the selected quote during a complementary circuit, otherwise the estimate. */
export const approvalAmountOf = (r: PurchaseRequest, quotes: Quote[]) =>
  r.status === "Validation complémentaire" ? (quotes.find(q => q.id === r.selectedQuoteId)?.totalHT ?? requestTotalHT(r)) : requestTotalHT(r);

async function normalizeDraft(ctx: ServiceContext, input: RequestDraftInput) {
  const d = parseInput(requestDraftSchema, input);
  if (d.projectId) await getOrFail(ctx.repos.projects.get(d.projectId), "Projet");
  if (d.taskId) {
    const t = await getOrFail(ctx.repos.tasks.get(d.taskId), "Tâche");
    if (t.projectId !== d.projectId) throw new DomainError("La tâche liée doit appartenir au projet lié.");
  }
  return {
    title: d.title, justification: d.justification, urgency: d.urgency, neededBy: d.neededBy,
    projectId: d.projectId || undefined, taskId: d.taskId || undefined,
    lines: d.lines.map((l, i) => ({ id: `L${i + 1}`, designation: l.designation, quantity: l.quantity, unit: l.unit, estimatedUnitPriceHT: l.estimatedUnitPriceHT, ...(l.itemRef ? { itemRef: l.itemRef } : {}) })),
  };
}

export async function createRequest(ctx: ServiceContext, input: RequestDraftInput): Promise<CommandResult<PurchaseRequest>> {
  requirePermission(ctx, "purchase:request");
  const d = await normalizeDraft(ctx, input);
  const request = await ctx.repos.purchasing.requests.create({ ...d, requesterId: ctx.actor.id, departmentId: ctx.actor.departmentId, status: "Brouillon" });
  return { value: request, events: [] };
}

export async function updateDraft(ctx: ServiceContext, id: string, input: RequestDraftInput): Promise<CommandResult<PurchaseRequest>> {
  const r = await getOrFail(ctx.repos.purchasing.requests.get(id), "Demande d’achat");
  if (r.requesterId !== ctx.actor.id) deny(ctx);
  if (r.status !== "Brouillon" && r.status !== "Rejetée") throw new DomainError(`Transition impossible : ${r.status} → Brouillon.`);
  const d = await normalizeDraft(ctx, input);
  return { value: await ctx.repos.purchasing.requests.update(id, { ...d, status: "Brouillon" }), events: [] };
}

async function requestApproval(ctx: ServiceContext, r: PurchaseRequest, step: { step: ValidationRequest["step"]; validatorId: string }, amountHT: number): Promise<DomainEvent> {
  const validation = await ctx.repos.validations.create({
    subjectType: "purchase_request", subjectId: r.id, step: step.step, round: r.approvalRound, authorId: r.requesterId, ownerId: r.requesterId,
    validatorId: step.validatorId, status: "En attente", requestedAt: ctx.now(),
  });
  return { type: "purchase.approval_requested", actorId: ctx.actor.id, at: ctx.now(), request: r, validation, amountHT };
}

export async function plan(ctx: ServiceContext, r: PurchaseRequest, amountHT: number) {
  const p = approvalPlan({ amountHT, requesterId: r.requesterId, projectId: r.projectId }, { users: await ctx.repos.users.list(), projects: await ctx.repos.projects.list() });
  if (!p.ok) throw new DomainError(p.error);
  return p.steps;
}

export async function submitRequest(ctx: ServiceContext, id: string): Promise<CommandResult<PurchaseRequest>> {
  const r0 = await getOrFail(ctx.repos.purchasing.requests.get(id), "Demande d’achat");
  if (r0.requesterId !== ctx.actor.id) deny(ctx);
  if (r0.status !== "Brouillon") throw new DomainError(`Transition impossible : ${r0.status} → En validation.`);
  const amount = requestTotalHT(r0);
  const [first] = await plan(ctx, r0, amount);
  const r = await ctx.repos.purchasing.requests.update(id, { status: "En validation", submittedAt: ctx.now(), approvalRound: (r0.approvalRound ?? 0) + 1 });
  const events: DomainEvent[] = [{ type: "purchase.request_submitted", actorId: ctx.actor.id, at: ctx.now(), request: r }];
  events.push(await requestApproval(ctx, r, first, amount));
  return { value: r, events };
}

/** Approval amount: the estimate during the initial circuit, the selected quote during a complementary one. */
async function approvalAmount(ctx: ServiceContext, r: PurchaseRequest) {
  if (r.status !== "Validation complémentaire") return requestTotalHT(r);
  return (await getOrFail(ctx.repos.purchasing.quotes.get(r.selectedQuoteId ?? ""), "Devis retenu")).totalHT;
}

/** Asks the next missing step of the current round, or returns undefined when the circuit is complete. */
export async function nextApproval(ctx: ServiceContext, r: PurchaseRequest, amountHT: number): Promise<DomainEvent | undefined> {
  const approved = (await ctx.repos.validations.list()).filter(v => v.subjectType === "purchase_request" && v.subjectId === r.id && v.round === r.approvalRound && v.status === "Approuvée");
  const next = missingSteps(await plan(ctx, r, amountHT), approved)[0];
  return next ? requestApproval(ctx, r, next, amountHT) : undefined;
}

export async function decidePurchaseApproval(ctx: ServiceContext, validationId: string, decision: "approve" | "reject", comment?: string): Promise<CommandResult<ValidationRequest>> {
  const v = await getOrFail(ctx.repos.validations.get(validationId), "Validation");
  if (v.subjectType !== "purchase_request") throw new DomainError("Cette validation ne concerne pas une demande d’achat.");
  // Strict segregation of duties: only the designated validator decides, no override.
  if (v.validatorId !== ctx.actor.id || !ctx.actor.active) deny(ctx);
  if (v.status !== "En attente") throw new DomainError("Cette validation a déjà été traitée.");
  const r = await getOrFail(ctx.repos.purchasing.requests.get(v.subjectId), "Demande d’achat");
  const at = ctx.now();

  if (decision === "reject") {
    const reason = parseInput(reasonSchema, comment ?? "");
    const decided = await ctx.repos.validations.update(v.id, { status: "Rejetée", comment: reason, decidedAt: at });
    let updated: PurchaseRequest;
    if (r.status === "Validation complémentaire") {
      // The overrun was refused: the selected quote is discarded and purchasing may select another one.
      if (r.selectedQuoteId) await ctx.repos.purchasing.quotes.update(r.selectedQuoteId, { status: "Écarté" });
      updated = await ctx.repos.purchasing.requests.update(r.id, { status: "En consultation", selectedQuoteId: undefined, overrunReason: undefined, singleSourceReason: undefined });
    } else updated = await ctx.repos.purchasing.requests.update(r.id, { status: "Rejetée" });
    return { value: decided, events: [{ type: "purchase.request_rejected", actorId: ctx.actor.id, at, request: updated, reason }] };
  }

  const text = comment?.trim() || undefined;
  const decided = await ctx.repos.validations.update(v.id, { status: "Approuvée", decidedAt: at, ...(text ? { comment: text } : {}) });
  const events: DomainEvent[] = [{ type: "purchase.approval_granted", actorId: ctx.actor.id, at, request: r, validation: decided }];
  const amount = await approvalAmount(ctx, r);
  const next = await nextApproval(ctx, r, amount);
  if (next) events.push(next);
  else {
    const status = r.status === "Validation complémentaire" ? "En consultation" : "Approuvée";
    const updated = await ctx.repos.purchasing.requests.update(r.id, { status, approvedAmountHT: amount, validatedAmountHT: amount, approvedAt: at });
    events.push({ type: "purchase.request_approved", actorId: ctx.actor.id, at, request: updated });
  }
  return { value: decided, events };
}

export async function cancelRequest(ctx: ServiceContext, id: string, reason: string): Promise<CommandResult<PurchaseRequest>> {
  const r = await getOrFail(ctx.repos.purchasing.requests.get(id), "Demande d’achat");
  const text = parseInput(reasonSchema, reason);
  const byRequester = r.requesterId === ctx.actor.id && ["Brouillon", "En validation", "Rejetée"].includes(r.status);
  const byPurchasing = hasPermission(ctx.actor, "purchase:order") && ["Approuvée", "En consultation", "Validation complémentaire"].includes(r.status);
  if (!byRequester && !byPurchasing) {
    if (["Commandée", "Clôturée", "Annulée"].includes(r.status)) throw new DomainError(`Transition impossible : ${r.status} → Annulée.`);
    deny(ctx);
  }
  for (const v of (await ctx.repos.validations.list()).filter(x => x.subjectType === "purchase_request" && x.subjectId === r.id && x.status === "En attente"))
    await ctx.repos.validations.update(v.id, { status: "Annulée", comment: `Demande annulée par ${displayName(ctx.actor)} : « ${text} »`, decidedAt: ctx.now() });
  const updated = await ctx.repos.purchasing.requests.update(id, { status: "Annulée", cancelReason: text });
  return { value: updated, events: [{ type: "purchase.request_cancelled", actorId: ctx.actor.id, at: ctx.now(), request: updated }] };
}
