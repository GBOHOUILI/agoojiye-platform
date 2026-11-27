import { canDecideValidation } from "@/lib/access-simulation/permissions";
import { rejectionSchema } from "@/lib/validations/task";
import type { ValidationRequest } from "@/types";
import { deny, DomainError, getOrFail, parseInput, type CommandResult, type ServiceContext } from "./context";

// Guards against double submits in this single-process demo; the future API should rely on a DB constraint.
const submitting = new Set<string>();

export async function submitForValidation(ctx: ServiceContext, taskId: string): Promise<CommandResult<ValidationRequest>> {
  if (submitting.has(taskId)) throw new DomainError("Soumission déjà en cours pour cette tâche.");
  submitting.add(taskId);
  try { return await submit(ctx, taskId); } finally { submitting.delete(taskId); }
}

async function submit(ctx: ServiceContext, taskId: string): Promise<CommandResult<ValidationRequest>> {
  const task = await getOrFail(ctx.repos.tasks.get(taskId), "Tâche");
  if (!task.assigneeId) throw new DomainError("Cette tâche n’a pas de responsable.");
  if (!task.validatorId) throw new DomainError("Cette tâche n’a pas de validateur.");
  if (task.assigneeId !== ctx.actor.id && ctx.actor.systemRole !== "ADMIN") deny(ctx);
  if (task.status !== "En cours") throw new DomainError(`Transition impossible : ${task.status} → En validation.`);
  const at = ctx.now();
  const validation = await ctx.repos.validations.create({
    subjectType: "task", subjectId: task.id, authorId: task.authorId, ownerId: task.assigneeId, validatorId: task.validatorId, status: "En attente", requestedAt: at,
  });
  const updated = await ctx.repos.tasks.update(task.id, { status: "En validation" });
  return { value: validation, events: [{ type: "validation.requested", actorId: ctx.actor.id, at, validation, task: updated }] };
}

export async function decideValidation(ctx: ServiceContext, validationId: string, decision: "approve" | "reject", comment?: string): Promise<CommandResult<ValidationRequest>> {
  const v = await getOrFail(ctx.repos.validations.get(validationId), "Demande de validation");
  if (v.subjectType !== "task") throw new DomainError("Cette validation ne concerne pas une tâche.");
  if (!canDecideValidation(ctx.actor, v)) deny(ctx);
  if (v.status !== "En attente") throw new DomainError("Cette demande a déjà été traitée.");
  const text = decision === "reject" ? parseInput(rejectionSchema, comment ?? "") : comment?.trim() || undefined;
  const at = ctx.now();
  const validation = await ctx.repos.validations.update(v.id, { status: decision === "approve" ? "Approuvée" : "Rejetée", decidedAt: at, ...(text ? { comment: text } : {}) });
  const task = await ctx.repos.tasks.update(v.subjectId, decision === "approve" ? { status: "Terminée", progress: 100 } : { status: "En cours" });
  return { value: validation, events: [{ type: decision === "approve" ? "validation.approved" : "validation.rejected", actorId: ctx.actor.id, at, validation, task }] };
}
