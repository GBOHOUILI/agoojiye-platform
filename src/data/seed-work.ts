import type { ActivityEntry, Notification, Priority, Project, ProjectMember, ProjectRole, PrototypeLink, Task, TaskStatus, ValidationRequest } from "@/types";
// Fictitious work data; dates are relative to TODAY = 2026-11-26.
const ts = (d: string, h = "08:00") => `${d}T${h}:00.000Z`;

export const PROJECTS0: Project[] = [
  { id: "PRJ-01", code: "PRJ-01", name: "Véhicule électrique urbain", description: "Industrialisation du prototype AG-01 et qualification de la version V1.2.", status: "En cours", priority: "Haute", ownerId: "U-KAR", departmentId: "D-ENG", startDate: "2026-06-01", dueDate: "2027-01-31", createdAt: ts("2026-06-01") },
  { id: "PRJ-02", code: "PRJ-02", name: "Utilitaire électrique", description: "Mise au point du prototype AG-02 jusqu’au jalon de sécurité.", status: "En cours", priority: "Urgente", ownerId: "U-NAD", departmentId: "D-ENG", startDate: "2026-07-01", dueDate: "2026-12-15", createdAt: ts("2026-07-01") },
  { id: "PRJ-03", code: "PRJ-03", name: "Banc d’essai batterie", description: "Conception d’un banc de cyclage interne pour les batteries.", status: "En cours", priority: "Normale", ownerId: "U-YAN", departmentId: "D-ENG", startDate: "2026-09-01", dueDate: "2027-02-28", createdAt: ts("2026-09-01") },
  { id: "PRJ-04", code: "PRJ-04", name: "Démarche qualité ISO 9001", description: "Projet transverse de structuration des processus qualité.", status: "En cours", priority: "Normale", ownerId: "U-NAD", departmentId: "D-QUA", startDate: "2026-11-15", dueDate: "2027-06-30", createdAt: ts("2026-11-10") },
];

const M: [string, string, ProjectRole][] = [
  ["PRJ-01", "U-KAR", "Chef de projet"], ["PRJ-01", "U-ABL", "Contributeur"], ["PRJ-01", "U-AWA", "Contributeur"], ["PRJ-01", "U-ROM", "Contributeur"],
  ["PRJ-01", "U-MAT", "Contributeur"], ["PRJ-01", "U-KOF", "Contributeur"], ["PRJ-01", "U-QUA", "Observateur"],
  ["PRJ-02", "U-NAD", "Chef de projet"], ["PRJ-02", "U-SEG", "Contributeur"], ["PRJ-02", "U-KOF", "Contributeur"], ["PRJ-02", "U-ESP", "Contributeur"],
  ["PRJ-02", "U-MAT", "Contributeur"], ["PRJ-02", "U-FIF", "Contributeur"], ["PRJ-02", "U-QUA", "Observateur"],
  ["PRJ-03", "U-YAN", "Chef de projet"], ["PRJ-03", "U-FIF", "Contributeur"], ["PRJ-03", "U-AWA", "Contributeur"], ["PRJ-03", "U-ROM", "Contributeur"], ["PRJ-03", "U-INT", "Contributeur"],
  ["PRJ-04", "U-NAD", "Chef de projet"], ["PRJ-04", "U-QUA", "Contributeur"], ["PRJ-04", "U-QU2", "Contributeur"], ["PRJ-04", "U-INT", "Contributeur"], ["PRJ-04", "U-SEG", "Observateur"],
];
export const PROJECT_MEMBERS0: ProjectMember[] = M.map(([projectId, userId, projectRole]) => ({ projectId, userId, projectRole }));

// AG-03 is intentionally not attached: the link is optional.
export const PROTOTYPE_LINKS0: PrototypeLink[] = [{ prototypeId: "AG-01", projectId: "PRJ-01" }, { prototypeId: "AG-02", projectId: "PRJ-02" }];

type T = [n: number, project: string, title: string, status: TaskStatus, priority: Priority, due: string, author: string, assignee: string | null, validator: string | null, progress: number];
const TS: T[] = [
  [1, "PRJ-01", "Analyser la surchauffe batterie (ANO-001)", "En cours", "Urgente", "2026-11-28", "U-KAR", "U-AWA", "U-QUA", 50],
  [2, "PRJ-01", "Refaire l’essai de température batterie", "À faire", "Haute", "2026-12-03", "U-KAR", "U-KOF", "U-QUA", 0],
  [3, "PRJ-01", "Mettre à jour la nomenclature V1.2", "Terminée", "Normale", "2026-11-10", "U-KAR", "U-MAT", null, 100],
  [4, "PRJ-01", "Rédiger la procédure de charge rapide", "En validation", "Normale", "2026-11-25", "U-ABL", "U-ROM", "U-QUA", 90],
  [5, "PRJ-01", "Contrôler le couple de serrage de la suspension", "Bloquée", "Haute", "2026-11-20", "U-KAR", "U-ROM", null, 30],
  [6, "PRJ-01", "Planifier l’essai d’autonomie hivernal", "À faire", "Basse", "2026-12-20", "U-KAR", null, null, 0],
  [7, "PRJ-01", "Calibrer les capteurs de température", "Terminée", "Normale", "2026-11-05", "U-ABL", "U-ROM", "U-QUA", 100],
  [8, "PRJ-01", "Revue de conception du contrôleur", "En cours", "Normale", "2026-12-10", "U-KAR", "U-MAT", null, 40],
  [9, "PRJ-02", "Corriger la distance de freinage (ANO-002)", "En cours", "Urgente", "2026-11-22", "U-NAD", "U-MAT", "U-QUA", 60],
  [10, "PRJ-02", "Réaliser l’essai batterie TES-004", "À faire", "Haute", "2026-11-24", "U-NAD", "U-KOF", null, 0],
  [11, "PRJ-02", "Analyser les vibrations moteur (ANO-007)", "En cours", "Normale", "2026-12-05", "U-NAD", "U-MAT", null, 25],
  [12, "PRJ-02", "Intégrer le châssis modulaire V0.7", "En validation", "Haute", "2026-11-30", "U-NAD", "U-ESP", "U-SEG", 90],
  [13, "PRJ-02", "Diagnostiquer l’erreur du contrôleur (ANO-006)", "À faire", "Haute", "2026-12-02", "U-NAD", "U-FIF", null, 0],
  [14, "PRJ-02", "Préparer l’essai de température TES-015", "En cours", "Normale", "2026-11-27", "U-SEG", "U-KOF", null, 30],
  [15, "PRJ-02", "Valider le plan d’essais V0.8", "Terminée", "Haute", "2026-11-08", "U-NAD", "U-SEG", "U-QUA", 100],
  [16, "PRJ-02", "Mettre à jour le dossier de sécurité", "À faire", "Normale", "2026-12-18", "U-NAD", null, null, 0],
  [17, "PRJ-03", "Concevoir le banc d’essai batterie", "En cours", "Haute", "2026-12-12", "U-YAN", "U-FIF", null, 55],
  [18, "PRJ-03", "Commander les cellules de test", "Bloquée", "Urgente", "2026-11-21", "U-YAN", "U-INT", null, 10],
  [19, "PRJ-03", "Rédiger le protocole de cyclage", "En validation", "Normale", "2026-12-01", "U-YAN", "U-AWA", "U-ABL", 80],
  [20, "PRJ-03", "Câbler l’acquisition de données", "À faire", "Normale", "2026-12-15", "U-YAN", "U-ROM", null, 0],
  [21, "PRJ-03", "Étude de sécurité thermique du banc", "À faire", "Haute", "2027-01-10", "U-YAN", "U-AWA", "U-QUA", 0],
  [22, "PRJ-03", "Chiffrer le budget du banc", "Terminée", "Basse", "2026-10-30", "U-YAN", "U-INT", null, 100],
  [23, "PRJ-04", "Cartographier les processus", "En cours", "Normale", "2026-12-20", "U-NAD", "U-QUA", null, 35],
  [24, "PRJ-04", "Rédiger le manuel qualité", "À faire", "Normale", "2027-01-15", "U-NAD", "U-QU2", "U-QUA", 0],
  [25, "PRJ-04", "Former les équipes à la déclaration d’anomalies", "À faire", "Basse", "2027-01-31", "U-NAD", null, null, 0],
  [26, "PRJ-04", "Audit interne des essais", "À faire", "Haute", "2027-02-15", "U-NAD", "U-QU2", null, 0],
  [27, "PRJ-01", "Vérifier la conformité du faisceau", "En validation", "Haute", "2026-11-27", "U-KAR", "U-KOF", "U-QUA", 95],
  [28, "PRJ-02", "Mettre à jour les fiches composants", "Terminée", "Basse", "2026-11-12", "U-NAD", "U-ESP", null, 100],
  [29, "PRJ-03", "Rapport d’avancement mensuel", "Terminée", "Normale", "2026-11-20", "U-YAN", "U-INT", null, 100],
  [30, "PRJ-01", "Synthèse des essais V1.2", "À faire", "Normale", "2026-11-25", "U-KAR", "U-AWA", null, 0],
];
const code = (prefix: string, n: number) => `${prefix}-${String(n).padStart(3, "0")}`;
const DAY = 86_400_000;
const day = (iso: string, delta: number) => new Date(Date.parse(iso) + delta * DAY).toISOString().slice(0, 10);
const clamp = (d: string, min: string, max: string) => (d < min ? min : d > max ? max : d);
// Creation about three weeks before the due date (never before the project start nor after the seed day);
// last update a week later, capped at the eve of the seed day.
const taskDates = (projectId: string, due: string) => {
  const start = PROJECTS0.find(p => p.id === projectId)!.startDate;
  const created = clamp(day(due, -21), start, "2026-11-24");
  const updated = clamp(day(created, 7), created, "2026-11-25");
  return { createdAt: ts(created), updatedAt: ts(updated, "17:00") };
};
// Existing tasks that are the corrective actions of seeded anomalies.
const CORRECTIVE: Record<number, string> = { 9: "ANO-002", 11: "ANO-007", 13: "ANO-006" };
export const TASKS0: Task[] = TS.map(([n, projectId, title, status, priority, dueDate, authorId, assignee, validator, progress]) => ({
  id: code("TSK", n), code: code("TSK", n), projectId, title, description: "", status, priority, dueDate, progress, authorId,
  ...(assignee ? { assigneeId: assignee } : {}), ...(validator ? { validatorId: validator } : {}),
  ...taskDates(projectId, dueDate),
  ...(CORRECTIVE[n] ? { anomalyId: CORRECTIVE[n] } : {}),
}));

const task = (n: number) => TASKS0[n - 1];
const val = (id: number, n: number, status: ValidationRequest["status"], requestedAt: string, decidedAt?: string, comment?: string): ValidationRequest => {
  const t = task(n);
  return { id: code("VAL", id), subjectType: "task", subjectId: t.id, authorId: t.authorId, ownerId: t.assigneeId!, validatorId: t.validatorId!, status, requestedAt, ...(decidedAt ? { decidedAt } : {}), ...(comment ? { comment } : {}) };
};
export const VALIDATIONS0: ValidationRequest[] = [
  val(1, 4, "En attente", ts("2026-11-24", "15:10")),
  val(2, 12, "Rejetée", ts("2026-11-18", "10:00"), ts("2026-11-19", "09:30"), "Le rapport de fixation est incomplet."),
  val(3, 12, "En attente", ts("2026-11-25", "11:20")),
  val(4, 19, "En attente", ts("2026-11-25", "16:45")),
  val(5, 27, "En attente", ts("2026-11-26", "07:40")),
  val(6, 7, "Approuvée", ts("2026-11-04", "14:00"), ts("2026-11-05", "09:00")),
  val(7, 15, "Approuvée", ts("2026-11-07", "16:00"), ts("2026-11-08", "08:30")),
];

type N = [recipient: string, type: string, priority: Notification["priority"], title: string, body: string, link: string, entityType: Notification["entityType"], entityId: string, at: string, read: boolean];
const NS: N[] = [
  ["U-KOF", "task.assigned", "Haute", "Nouvelle tâche : TSK-027", "Karim Adjovi vous a attribué « Vérifier la conformité du faisceau ».", "/tasks/TSK-027", "task", "TSK-027", ts("2026-11-20", "09:00"), true],
  ["U-QUA", "validation.requested", "Haute", "Validation attendue : TSK-027", "Kofi Amoussou soumet « Vérifier la conformité du faisceau » à votre validation.", "/validations", "validation", "VAL-005", ts("2026-11-26", "07:40"), false],
  ["U-QUA", "validation.requested", "Haute", "Validation attendue : TSK-004", "Romuald Gbaguidi soumet « Rédiger la procédure de charge rapide » à votre validation.", "/validations", "validation", "VAL-001", ts("2026-11-24", "15:10"), false],
  ["U-SEG", "validation.requested", "Haute", "Validation attendue : TSK-012", "Espérance Houngbo soumet de nouveau « Intégrer le châssis modulaire V0.7 ».", "/validations", "validation", "VAL-003", ts("2026-11-25", "11:20"), false],
  ["U-ABL", "validation.requested", "Haute", "Validation attendue : TSK-019", "Awa Dossou soumet « Rédiger le protocole de cyclage » à votre validation.", "/validations", "validation", "VAL-004", ts("2026-11-25", "16:45"), false],
  ["U-ESP", "validation.rejected", "Haute", "Validation rejetée : TSK-012", "Ségla Ahouansou : « Le rapport de fixation est incomplet. »", "/tasks/TSK-012", "task", "TSK-012", ts("2026-11-19", "09:30"), true],
  ["U-NAD", "incident.reported", "Normale", "Anomalie signalée : ANO-006", "Message d’erreur intermittent du contrôleur (AG-02, gravité Moyenne).", "/anomalies/ANO-006", "anomaly", "ANO-006", ts("2026-11-23", "10:15"), false],
  ["U-QUA", "incident.reported", "Normale", "Anomalie signalée : ANO-006", "Message d’erreur intermittent du contrôleur (AG-02, gravité Moyenne).", "/anomalies/ANO-006", "anomaly", "ANO-006", ts("2026-11-23", "10:15"), true],
  ["U-QU2", "incident.reported", "Normale", "Anomalie signalée : ANO-006", "Message d’erreur intermittent du contrôleur (AG-02, gravité Moyenne).", "/anomalies/ANO-006", "anomaly", "ANO-006", ts("2026-11-23", "10:15"), false],
  ["U-AWA", "task.assigned", "Normale", "Nouvelle tâche : TSK-030", "Karim Adjovi vous a attribué « Synthèse des essais V1.2 ».", "/tasks/TSK-030", "task", "TSK-030", ts("2026-11-21", "08:30"), false],
  ["U-YAN", "task.status_changed", "Haute", "Tâche bloquée : TSK-018", "Paul Assogba a bloqué « Commander les cellules de test ».", "/tasks/TSK-018", "task", "TSK-018", ts("2026-11-22", "14:05"), false],
  ["U-ROM", "task.assigned", "Normale", "Nouvelle tâche : TSK-020", "Yann Hounkpè vous a attribué « Câbler l’acquisition de données ».", "/tasks/TSK-020", "task", "TSK-020", ts("2026-11-24", "11:00"), false],
];
export const NOTIFICATIONS0: Notification[] = NS.map(([recipientId, type, priority, title, body, link, entityType, entityId, createdAt, read], i) => ({
  id: code("NTF", i + 1), recipientId, type, priority, title, body, link, entityType, entityId, createdAt, ...(read ? { readAt: createdAt } : {}),
}));

type A = [at: string, actor: string, action: string, entityType: ActivityEntry["entityType"], entityId: string, summary: string];
const AS: A[] = [
  [ts("2026-11-10", "09:00"), "U-NAD", "project.created", "project", "PRJ-04", "Nadia Sossou a créé le projet PRJ-04 « Démarche qualité ISO 9001 »."],
  [ts("2026-11-19", "09:30"), "U-SEG", "validation.rejected", "task", "TSK-012", "Ségla Ahouansou a rejeté la validation de TSK-012."],
  [ts("2026-11-20", "09:00"), "U-KAR", "task.assigned", "task", "TSK-027", "Karim Adjovi a attribué TSK-027 à Kofi Amoussou."],
  [ts("2026-11-21", "08:30"), "U-KAR", "task.assigned", "task", "TSK-030", "Karim Adjovi a attribué TSK-030 à Awa Dossou."],
  [ts("2026-11-22", "14:05"), "U-INT", "task.status_changed", "task", "TSK-018", "Paul Assogba a passé TSK-018 au statut « Bloquée »."],
  [ts("2026-11-23", "10:15"), "U-FIF", "incident.reported", "anomaly", "ANO-006", "Fifamè Zinsou a signalé l’anomalie ANO-006."],
  [ts("2026-11-24", "11:00"), "U-YAN", "task.assigned", "task", "TSK-020", "Yann Hounkpè a attribué TSK-020 à Romuald Gbaguidi."],
  [ts("2026-11-24", "15:10"), "U-ROM", "validation.requested", "task", "TSK-004", "Romuald Gbaguidi a soumis TSK-004 à validation."],
  [ts("2026-11-25", "11:20"), "U-ESP", "validation.requested", "task", "TSK-012", "Espérance Houngbo a soumis TSK-012 à validation."],
  [ts("2026-11-25", "16:45"), "U-AWA", "validation.requested", "task", "TSK-019", "Awa Dossou a soumis TSK-019 à validation."],
  [ts("2026-11-26", "07:40"), "U-KOF", "validation.requested", "task", "TSK-027", "Kofi Amoussou a soumis TSK-027 à validation."],
];
export const ACTIVITY0: ActivityEntry[] = AS.map(([at, actorId, action, entityType, entityId, summary], i) => ({ id: code("ACT", i + 1), at, actorId, action, entityType, entityId, summary }));
