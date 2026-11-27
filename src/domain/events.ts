import type { Ano, GoodsReceipt, Team, Project, PrototypeLink, PurchaseOrder, PurchaseRequest, Quote, Statut, Supplier, SupplierInvoice, Task, TaskStatus, User, ValidationRequest } from "@/types";

interface Base { actorId: string; at: string }
export type DomainEvent = Base & (
  | { type: "project.created"; project: Project; memberIds: string[] }
  | { type: "project.member_added"; project: Project; userId: string }
  | { type: "project.prototype_linked" | "project.prototype_unlinked"; project: Project; prototypeId: string }
  | { type: "task.created"; task: Task }
  | { type: "task.assigned"; task: Task; previousAssigneeId?: string }
  | { type: "task.status_changed"; task: Task; from: TaskStatus }
  | { type: "validation.requested" | "validation.approved" | "validation.rejected"; validation: ValidationRequest; task: Task }
  | { type: "incident.reported"; anomaly: Ano }
  | { type: "incident.status_changed"; anomaly: Ano; from: Statut }
  | { type: "note.added"; targetId: string; text: string }
  | { type: "user.updated"; user: User; changes: string[] }
  | { type: "demo.reset" }
  | { type: "supplier.created" | "supplier.updated"; supplier: Supplier }
  | { type: "purchase.request_submitted" | "purchase.request_approved" | "purchase.request_cancelled"; request: PurchaseRequest }
  | { type: "purchase.request_rejected"; request: PurchaseRequest; reason: string }
  | { type: "purchase.approval_requested"; request: PurchaseRequest; validation: ValidationRequest; amountHT: number }
  | { type: "purchase.approval_granted"; request: PurchaseRequest; validation: ValidationRequest }
  | { type: "purchase.quote_recorded"; request: PurchaseRequest; quote: Quote }
  | { type: "purchase.quote_selected"; request: PurchaseRequest; quote: Quote; overrun: boolean }
  | { type: "purchase.order_issued" | "purchase.order_cancelled"; request: PurchaseRequest; order: PurchaseOrder }
  | { type: "purchase.goods_received"; request: PurchaseRequest; order: PurchaseOrder; receipt: GoodsReceipt; lines: GoodsReceivedLine[] }
  | { type: "purchase.nonconformity"; order: PurchaseOrder; receipt: GoodsReceipt }
  | { type: "purchase.invoice_recorded" | "purchase.invoice_disputed" | "purchase.invoice_transmitted" | "purchase.invoice_cancelled"; order: PurchaseOrder; invoice: SupplierInvoice }
  | { type: "purchase.order_closed"; request: PurchaseRequest; order: PurchaseOrder; releasedHT: number }
);

/**
 * Contract for the future Stock module: only `accepted` quantities may enter stock.
 * `received` and `rejected` are kept for traceability.
 */
export interface GoodsReceivedLine { orderLineId: string; itemRef?: string; designation: string; unit: string; received: number; accepted: number; rejected: number; rejectReason?: string }
export type DomainEventType = DomainEvent["type"];

export interface Directory { users: User[]; projects: Project[]; prototypeLinks: PrototypeLink[]; teams?: Team[] }

export const projectOfPrototype = (dir: Directory, prototypeId: string): Project | undefined => {
  const link = dir.prototypeLinks.find(l => l.prototypeId === prototypeId);
  return link ? dir.projects.find(p => p.id === link.projectId) : undefined;
};
