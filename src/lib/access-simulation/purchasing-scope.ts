import type { Project, PurchaseOrder, PurchaseRequest, User, ValidationRequest } from "@/types";
import { hasPermission } from "./permissions";

export interface PurchasingScope { projects: Pick<Project, "id" | "ownerId">[]; validations: Pick<ValidationRequest, "subjectType" | "subjectId" | "validatorId">[] }

/** Requester, any designated validator of the request, owner of the linked project, or purchase:read_all. */
export function canSeeRequest(user: User, r: Pick<PurchaseRequest, "id" | "requesterId" | "projectId">, s: PurchasingScope): boolean {
  if (hasPermission(user, "purchase:read_all") || r.requesterId === user.id) return true;
  if (r.projectId && s.projects.some(p => p.id === r.projectId && p.ownerId === user.id)) return true;
  return s.validations.some(v => v.subjectType === "purchase_request" && v.subjectId === r.id && v.validatorId === user.id);
}

/**
 * Orders follow their request's visibility. Receivers additionally see orders still awaiting delivery,
 * so they can record receipts; amounts and invoices stay hidden from them (see `canSeeOrderAmounts`).
 */
export const canSeeOrder = (user: User, o: Pick<PurchaseOrder, "id" | "requestId" | "status">, r: Pick<PurchaseRequest, "id" | "requesterId" | "projectId">, s: PurchasingScope): boolean =>
  canSeeRequest(user, r, s) || (hasPermission(user, "purchase:receive") && (o.status === "Émis" || o.status === "Partiellement reçu"));
export const canSeeOrderAmounts = canSeeRequest;
