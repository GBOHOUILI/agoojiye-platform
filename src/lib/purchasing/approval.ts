import { hasPermission, type Permission } from "@/lib/access-simulation/permissions";
import type { ApprovalStep, Project, User } from "@/types";
import { PURCHASING_RULES } from "./rules";

export interface PlannedStep { step: ApprovalStep; validatorId: string }
export type PlanResult = { ok: true; steps: PlannedStep[] } | { ok: false; error: string };

const noValidator = (step: ApprovalStep): PlanResult => ({ ok: false, error: `Aucun validateur éligible pour l’étape ${step}.` });

// ADMIN never approves purchases (it does not hold the approval permissions either).
const approverFor = (users: User[], perm: Permission, requesterId: string) =>
  users.find(u => u.active && u.systemRole !== "ADMIN" && u.id !== requesterId && hasPermission(u, perm));

/** Ordered approval steps for an amount (HT). The requester never approves, and a person decides at most once. */
export function approvalPlan(input: { amountHT: number; requesterId: string; projectId?: string }, dir: { users: User[]; projects: Pick<Project, "id" | "ownerId">[] }): PlanResult {
  const byId = (id?: string) => dir.users.find(u => u.id === id);
  const requester = byId(input.requesterId);
  if (!requester) return noValidator("Responsable");
  const owner = input.projectId ? dir.projects.find(p => p.id === input.projectId)?.ownerId : undefined;
  const responsableId = owner && owner !== requester.id ? owner : requester.managerId;
  const responsable = byId(responsableId);
  if (!responsable || !responsable.active || responsable.id === requester.id) return noValidator("Responsable");

  const steps: PlannedStep[] = [{ step: "Responsable", validatorId: responsable.id }];
  if (input.amountHT >= PURCHASING_RULES.financeThresholdHT) {
    const f = approverFor(dir.users, "purchase:approve_finance", requester.id);
    if (!f) return noValidator("Finance");
    steps.push({ step: "Finance", validatorId: f.id });
  }
  if (input.amountHT >= PURCHASING_RULES.directionThresholdHT) {
    const d = approverFor(dir.users, "purchase:approve_direction", requester.id);
    if (!d) return noValidator("Direction");
    steps.push({ step: "Direction", validatorId: d.id });
  }
  // One decision per person: a later step held by the same validator covers the Responsable step.
  const merged = steps.length > 1 && steps.slice(1).some(s => s.validatorId === responsable.id) ? steps.slice(1) : steps;
  return { ok: true, steps: merged };
}

export const missingSteps = (plan: PlannedStep[], approved: { step?: ApprovalStep }[]): PlannedStep[] =>
  plan.filter(p => !approved.some(a => a.step === p.step));
