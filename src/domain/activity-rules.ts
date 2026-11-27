import type { ActivityEntry } from "@/types";
import { nameOf } from "@/lib/people";
import { formatFCFA } from "@/lib/purchasing/money";
import type { Directory, DomainEvent } from "./events";

export function activityFor(e: DomainEvent, dir: Directory): Omit<ActivityEntry, "id"> {
  const who = (id?: string) => nameOf(dir.users, id, "personne");
  const actor = who(e.actorId);
  const base = { at: e.at, actorId: e.actorId, action: e.type };
  switch (e.type) {
    case "project.created": return { ...base, entityType: "project", entityId: e.project.id, summary: `${actor} a créé le projet ${e.project.code} « ${e.project.name} ».` };
    case "project.member_added": return { ...base, entityType: "project", entityId: e.project.id, summary: `${actor} a ajouté ${who(e.userId)} au projet ${e.project.code}.` };
    case "project.prototype_linked": return { ...base, entityType: "project", entityId: e.project.id, summary: `${actor} a rattaché le prototype ${e.prototypeId} au projet ${e.project.code}.` };
    case "project.prototype_unlinked": return { ...base, entityType: "project", entityId: e.project.id, summary: `${actor} a détaché le prototype ${e.prototypeId} du projet ${e.project.code}.` };
    case "task.created": return { ...base, entityType: "task", entityId: e.task.id, summary: `${actor} a créé la tâche ${e.task.code} « ${e.task.title} »${e.task.anomalyId ? `, action corrective de ${e.task.anomalyId}` : ""}.` };
    case "task.assigned": return { ...base, entityType: "task", entityId: e.task.id, summary: `${actor} a attribué ${e.task.code} à ${who(e.task.assigneeId)}.` };
    case "task.status_changed": return { ...base, entityType: "task", entityId: e.task.id, summary: `${actor} a passé ${e.task.code} de « ${e.from} » à « ${e.task.status} ».` };
    case "validation.requested": return { ...base, entityType: "task", entityId: e.task.id, summary: `${actor} a soumis ${e.task.code} à la validation de ${who(e.validation.validatorId)}.` };
    case "validation.approved": return { ...base, entityType: "task", entityId: e.task.id, summary: `${actor} a approuvé ${e.task.code}.` };
    case "validation.rejected": return { ...base, entityType: "task", entityId: e.task.id, summary: `${actor} a rejeté ${e.task.code} : « ${e.validation.comment ?? ""} ».` };
    case "incident.reported": return { ...base, entityType: "anomaly", entityId: e.anomaly.id, summary: `${actor} a signalé l’anomalie ${e.anomaly.id} « ${e.anomaly.titre} ».` };
    case "incident.status_changed": return { ...base, entityType: "anomaly", entityId: e.anomaly.id, summary: `${actor} a passé ${e.anomaly.id} de « ${e.from} » à « ${e.anomaly.s} ».` };
    case "note.added": return { ...base, entityType: e.targetId.startsWith("ANO") ? "anomaly" : "test", entityId: e.targetId, summary: `${actor} a ajouté une observation sur ${e.targetId}.` };
    case "user.updated": return { ...base, entityType: "user", entityId: e.user.id, summary: `${actor} a modifié la fiche de ${who(e.user.id)} (${e.changes.join(", ")}).` };
    case "supplier.created": return { ...base, entityType: "supplier", entityId: e.supplier.id, summary: `${actor} a créé le fournisseur ${e.supplier.name}.` };
    case "supplier.updated": return { ...base, entityType: "supplier", entityId: e.supplier.id, summary: `${actor} a modifié le fournisseur ${e.supplier.name} (${e.supplier.status}).` };
    case "purchase.request_submitted": return { ...base, entityType: "purchase", entityId: e.request.id, summary: `${actor} a soumis la demande d’achat ${e.request.id} « ${e.request.title} ».` };
    case "purchase.approval_requested": return { ...base, entityType: "purchase", entityId: e.request.id, summary: `Validation ${e.validation.step} de ${e.request.id} demandée à ${who(e.validation.validatorId)} (${formatFCFA(e.amountHT)} HT).` };
    case "purchase.approval_granted": return { ...base, entityType: "purchase", entityId: e.request.id, summary: `${actor} a approuvé ${e.request.id} (étape ${e.validation.step}).` };
    case "purchase.request_approved": return { ...base, entityType: "purchase", entityId: e.request.id, summary: e.request.selectedQuoteId ? `Validation complémentaire obtenue pour ${e.request.id} : le devis ${e.request.selectedQuoteId} est validé.` : `La demande d’achat ${e.request.id} est approuvée.` };
    case "purchase.request_rejected": return { ...base, entityType: "purchase", entityId: e.request.id, summary: `${actor} a rejeté ${e.request.id} : « ${e.reason} ».` };
    case "purchase.request_cancelled": return { ...base, entityType: "purchase", entityId: e.request.id, summary: `${actor} a annulé ${e.request.id} : « ${e.request.cancelReason ?? ""} ».` };
    case "purchase.quote_recorded": return { ...base, entityType: "purchase", entityId: e.request.id, summary: `${actor} a enregistré le devis ${e.quote.id} (${formatFCFA(e.quote.totalHT)} HT) pour ${e.request.id}.` };
    case "purchase.quote_selected": return { ...base, entityType: "purchase", entityId: e.request.id, summary: `${actor} a retenu le devis ${e.quote.id} pour ${e.request.id}${e.overrun ? " (dépassement justifié)" : ""}.` };
    case "purchase.order_issued": return { ...base, entityType: "purchase", entityId: e.order.id, summary: `${actor} a émis le bon de commande ${e.order.id} (${formatFCFA(e.order.totalTTC)} TTC).` };
    case "purchase.order_cancelled": return { ...base, entityType: "purchase", entityId: e.order.id, summary: `${actor} a annulé le bon de commande ${e.order.id}.` };
    case "purchase.goods_received": {
      const acc = e.receipt.lines.reduce((s, l) => s + l.accepted, 0), rej = e.receipt.lines.reduce((s, l) => s + l.rejected, 0);
      return { ...base, entityType: "purchase", entityId: e.order.id, summary: `${actor} a réceptionné ${e.order.id} : ${acc} accepté(s), ${rej} rejeté(s).` };
    }
    case "purchase.nonconformity": return { ...base, entityType: "purchase", entityId: e.order.id, summary: `Non-conformité constatée à la réception ${e.receipt.id} de ${e.order.id}.` };
    case "purchase.invoice_recorded": return { ...base, entityType: "purchase", entityId: e.order.id, summary: `${actor} a enregistré la facture ${e.invoice.id} (${formatFCFA(e.invoice.totalTTC)} TTC) : ${e.invoice.status}.` };
    case "purchase.invoice_disputed": return { ...base, entityType: "purchase", entityId: e.order.id, summary: `Facture ${e.invoice.id} en litige : ${e.invoice.issues.join(" ")}` };
    case "purchase.invoice_transmitted": return { ...base, entityType: "purchase", entityId: e.order.id, summary: `${actor} a transmis la facture ${e.invoice.id} à la Finance.` };
    case "purchase.invoice_cancelled": return { ...base, entityType: "purchase", entityId: e.order.id, summary: `${actor} a annulé la facture ${e.invoice.id} : « ${e.invoice.cancelReason ?? ""} ».` };
    case "purchase.order_closed": return { ...base, entityType: "purchase", entityId: e.order.id, summary: `${actor} a clôturé ${e.order.id}${e.releasedHT ? ` (reliquat de ${formatFCFA(e.releasedHT)} HT libéré)` : ""}.` };
    case "demo.reset": return { ...base, entityType: "demo", entityId: "demo", summary: `${actor} a réinitialisé les données de démonstration.` };
  }
}
