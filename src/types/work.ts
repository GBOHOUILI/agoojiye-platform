export const PRIORITIES = ["Basse", "Normale", "Haute", "Urgente"] as const;
export type Priority = (typeof PRIORITIES)[number];
export const PROJECT_STATUSES = ["Planifié", "En cours", "En pause", "Terminé"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
export const TASK_STATUSES = ["À faire", "En cours", "Bloquée", "En validation", "Terminée"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export type ProjectRole = "Chef de projet" | "Contributeur" | "Observateur";
export interface Project {
  id: string; code: string; name: string; description: string; status: ProjectStatus; priority: Priority;
  ownerId: string; departmentId?: string; startDate: string; dueDate: string; createdAt: string;
}
export interface ProjectMember { projectId: string; userId: string; projectRole: ProjectRole }
export interface PrototypeLink { prototypeId: string; projectId: string }
export interface Task {
  id: string; code: string; projectId: string; title: string; description: string;
  status: TaskStatus; priority: Priority; dueDate: string; progress: number;
  authorId: string; assigneeId?: string; validatorId?: string; createdAt: string; updatedAt: string;
  anomalyId?: string;                       // corrective action of this anomaly
}
// "Annulée": closed because its subject was cancelled — not a decision of the validator.
export type ValidationStatus = "En attente" | "Approuvée" | "Rejetée" | "Annulée";
export type ApprovalStep = "Responsable" | "Finance" | "Direction";
export interface ValidationRequest {
  id: string; subjectType: "task" | "purchase_request"; subjectId: string; step?: ApprovalStep; round?: number;
  authorId: string; ownerId: string; validatorId: string; status: ValidationStatus;
  comment?: string; requestedAt: string; decidedAt?: string;
}
