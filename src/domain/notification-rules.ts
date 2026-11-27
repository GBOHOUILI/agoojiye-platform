import type { Gravite, Notification, NotificationPriority, Priority } from "@/types";
import { nameOf } from "@/lib/people";
import { formatFCFA } from "@/lib/purchasing/money";
import { projectOfPrototype, type Directory, type DomainEvent } from "./events";
export type { Directory } from "./events";

const TASK_PRIORITY: Record<Priority, NotificationPriority> = { Urgente: "Critique", Haute: "Haute", Normale: "Normale", Basse: "Basse" };
const GRAVITY_PRIORITY: Record<Gravite, NotificationPriority> = { Critique: "Critique", Élevée: "Haute", Moyenne: "Normale", Faible: "Basse" };

type Draft = Omit<Notification, "id" | "recipientId" | "createdAt" | "type">;

export function notificationsFor(e: DomainEvent, dir: Directory): Omit<Notification, "id">[] {
  const who = (id?: string) => nameOf(dir.users, id);
  const actor = who(e.actorId);
  const send = (recipients: (string | undefined)[], d: Draft) => recipients.map(recipientId => ({ recipientId, d }));
  const quality = () => dir.users.filter(u => u.systemRole === "QUALITY_MANAGER").map(u => u.id);
  const role = (r: string) => dir.users.filter(u => u.systemRole === r).map(u => u.id);
  const ownerOf = (projectId?: string) => dir.projects.find(p => p.id === projectId)?.ownerId;
  const req = (id: string) => ({ link: `/purchasing/requests/${id}`, entityType: "purchase" as const, entityId: id });
  const ord = (id: string) => ({ link: `/purchasing/orders/${id}`, entityType: "purchase" as const, entityId: id });
  const sum = (r: { lines: { accepted: number; rejected: number }[] }, k: "accepted" | "rejected") => r.lines.reduce((s, l) => s + l[k], 0);
  let out: { recipientId: string | undefined; d: Draft }[] = [];

  switch (e.type) {
    case "project.created":
      out = send(e.memberIds, { priority: "Normale", title: `Nouveau projet : ${e.project.code}`, body: `${actor} vous a ajouté au projet « ${e.project.name} ».`, link: `/projects/${e.project.id}`, entityType: "project", entityId: e.project.id });
      break;
    case "project.member_added":
      out = send([e.userId], { priority: "Normale", title: `Ajout au projet ${e.project.code}`, body: `${actor} vous a ajouté au projet « ${e.project.name} ».`, link: `/projects/${e.project.id}`, entityType: "project", entityId: e.project.id });
      break;
    case "project.prototype_linked":
    case "project.prototype_unlinked": {
      const linked = e.type === "project.prototype_linked";
      out = send([e.project.ownerId], { priority: "Basse", title: `Prototype ${e.prototypeId} ${linked ? "rattaché" : "détaché"}`, body: `${actor} a ${linked ? "rattaché" : "détaché"} ${e.prototypeId} ${linked ? "au" : "du"} projet « ${e.project.name} ».`, link: `/projects/${e.project.id}`, entityType: "project", entityId: e.project.id });
      break;
    }
    case "task.assigned":
      out = send([e.task.assigneeId], { priority: TASK_PRIORITY[e.task.priority], title: `Nouvelle tâche : ${e.task.code}`, body: `${actor} vous a attribué « ${e.task.title} » (échéance ${e.task.dueDate.split("-").reverse().join("/")}).`, link: `/tasks/${e.task.id}`, entityType: "task", entityId: e.task.id });
      break;
    case "task.status_changed": {
      const blocked = e.task.status === "Bloquée";
      const owner = blocked ? dir.projects.find(p => p.id === e.task.projectId)?.ownerId : undefined;
      out = send([e.task.authorId, owner], { priority: blocked ? "Haute" : "Normale", title: blocked ? `Tâche bloquée : ${e.task.code}` : `${e.task.code} : ${e.task.status}`, body: `${actor} a passé « ${e.task.title} » de « ${e.from} » à « ${e.task.status} ».`, link: `/tasks/${e.task.id}`, entityType: "task", entityId: e.task.id });
      break;
    }
    case "validation.requested":
      out = send([e.validation.validatorId], { priority: "Haute", title: `Validation attendue : ${e.task.code}`, body: `${actor} soumet « ${e.task.title} » à votre validation.`, link: "/validations", entityType: "validation", entityId: e.validation.id });
      break;
    case "validation.approved":
    case "validation.rejected": {
      const ok = e.type === "validation.approved";
      out = send([e.validation.ownerId, e.validation.authorId], { priority: ok ? "Normale" : "Haute", title: `Validation ${ok ? "approuvée" : "rejetée"} : ${e.task.code}`, body: ok ? `${actor} a approuvé « ${e.task.title} ».` : `${actor} a rejeté « ${e.task.title} » : « ${e.validation.comment ?? ""} »`, link: `/tasks/${e.task.id}`, entityType: "task", entityId: e.task.id });
      break;
    }
    case "incident.reported": {
      const a = e.anomaly;
      out = send([...quality(), projectOfPrototype(dir, a.proto)?.ownerId, dir.teams?.find(t => t.id === a.respTeamId)?.leadId], { priority: GRAVITY_PRIORITY[a.g], title: `Anomalie signalée : ${a.id}`, body: `${a.titre} (${a.proto}, gravité ${a.g}) — signalée par ${actor}.`, link: `/anomalies/${a.id}`, entityType: "anomaly", entityId: a.id });
      break;
    }
    case "incident.status_changed": {
      const a = e.anomaly, verify = a.s === "En vérification";
      out = verify
        ? send(quality(), { priority: "Haute", title: `Validation attendue : ${a.id}`, body: `${actor} demande la vérification de « ${a.titre} ».`, link: `/anomalies/${a.id}`, entityType: "anomaly", entityId: a.id })
        : send([a.reporterId], { priority: GRAVITY_PRIORITY[a.g], title: `${a.id} : ${a.s}`, body: `${actor} a passé « ${a.titre} » au statut « ${a.s} ».`, link: `/anomalies/${a.id}`, entityType: "anomaly", entityId: a.id });
      break;
    }
    case "user.updated":
      out = send([e.user.id], { priority: "Normale", title: "Votre fiche a été mise à jour", body: `${actor} a modifié : ${e.changes.join(", ")}.`, link: "/espace", entityType: "user", entityId: e.user.id });
      break;
    case "purchase.approval_requested": {
      const r = e.request;
      out = send([e.validation.validatorId], { priority: r.urgency === "Critique" ? "Critique" : "Haute", title: `Validation d’achat : ${r.id}`, body: `Étape ${e.validation.step} — ${r.title} (${formatFCFA(e.amountHT)} HT), demandée par ${who(r.requesterId)}.`, ...req(r.id) });
      break;
    }
    case "purchase.request_approved": {
      // After a complementary approval a quote is already selected: the order can be issued.
      const r = e.request, complementary = !!r.selectedQuoteId;
      out = send([r.requesterId, ...role("PURCHASING")], complementary
        ? { priority: "Normale", title: `Validation complémentaire obtenue : ${r.id}`, body: `Le devis ${r.selectedQuoteId} retenu (${formatFCFA(r.approvedAmountHT ?? 0)} HT) est validé : le bon de commande peut être émis.`, ...req(r.id) }
        : { priority: "Normale", title: `Demande d’achat approuvée : ${r.id}`, body: `${r.title} — prête pour la consultation des fournisseurs.`, ...req(r.id) });
      break;
    }
    case "purchase.request_rejected":
      out = send([e.request.requesterId], { priority: "Haute", title: `Demande d’achat rejetée : ${e.request.id}`, body: `${actor} : « ${e.reason} »`, ...req(e.request.id) });
      break;
    case "purchase.request_cancelled":
      out = send([e.request.requesterId], { priority: "Normale", title: `Demande d’achat annulée : ${e.request.id}`, body: `${actor} : « ${e.request.cancelReason ?? ""} »`, ...req(e.request.id) });
      break;
    case "purchase.quote_selected":
      out = e.overrun ? send(role("FINANCE"), { priority: "Haute", title: `Dépassement sur ${e.request.id}`, body: `Devis ${e.quote.id} retenu à ${formatFCFA(e.quote.totalHT)} HT, au-delà de l’estimation validée. Motif : « ${e.request.overrunReason ?? ""} »`, ...req(e.request.id) }) : [];
      break;
    case "purchase.order_issued":
    case "purchase.order_cancelled": {
      const issued = e.type === "purchase.order_issued";
      out = send([e.request.requesterId, ...(issued ? [ownerOf(e.order.projectId)] : [])], { priority: "Normale", title: `Bon de commande ${issued ? "émis" : "annulé"} : ${e.order.id}`, body: issued ? `${e.request.title} — ${formatFCFA(e.order.totalTTC)} TTC.` : `Motif : « ${e.order.cancelReason ?? ""} »`, ...ord(e.order.id) });
      break;
    }
    case "purchase.goods_received":
      out = send([e.request.requesterId], { priority: "Normale", title: `Livraison reçue : ${e.order.id}`, body: `${sum(e.receipt, "accepted")} accepté(s), ${sum(e.receipt, "rejected")} rejeté(s) — BL ${e.receipt.deliveryNoteRef}.`, ...ord(e.order.id) });
      break;
    case "purchase.nonconformity":
      out = send([...role("PURCHASING"), ...role("QUALITY_MANAGER")], { priority: "Haute", title: `Non-conformité à la réception : ${e.order.id}`, body: e.receipt.lines.filter(l => l.rejected > 0).map(l => `${l.rejected} rejeté(s) : ${l.rejectReason ?? ""}`).join(" ; "), ...ord(e.order.id) });
      break;
    case "purchase.invoice_disputed":
      out = send(role("PURCHASING"), { priority: "Haute", title: `Facture en litige : ${e.invoice.id}`, body: e.invoice.issues.join(" "), ...ord(e.order.id) });
      break;
    case "purchase.invoice_transmitted":
      out = send(role("FINANCE"), { priority: "Normale", title: `Facture transmise : ${e.invoice.id}`, body: `${formatFCFA(e.invoice.totalTTC)} TTC — bon de commande ${e.order.id}.`, ...ord(e.order.id) });
      break;
    case "purchase.order_closed":
      out = send([e.request.requesterId, ownerOf(e.order.projectId)], { priority: "Basse", title: `Commande clôturée : ${e.order.id}`, body: e.releasedHT ? `Reliquat abandonné : ${formatFCFA(e.releasedHT)} HT libérés.` : "Commande entièrement livrée, facturée et transmise.", ...ord(e.order.id) });
      break;
    case "task.created":
    case "note.added":
    case "demo.reset":
    case "supplier.created":
    case "supplier.updated":
    case "purchase.request_submitted":
    case "purchase.approval_granted":
    case "purchase.quote_recorded":
    case "purchase.invoice_recorded":
    case "purchase.invoice_cancelled":
      out = [];
  }

  const active = new Set(dir.users.filter(u => u.active).map(u => u.id));
  const seen = new Set<string>();
  return out.flatMap(({ recipientId, d }) => {
    if (!recipientId || recipientId === e.actorId || !active.has(recipientId) || seen.has(recipientId)) return [];
    seen.add(recipientId);
    return [{ ...d, recipientId, type: e.type, createdAt: e.at }];
  });
}
