// Client-side role SIMULATION for the demo: it hides screens and refuses commands,
// but provides no security. The real enforcement must live in the future API.
import type { Project, ProjectMember, SystemRole, Task, User, ValidationRequest } from "@/types";

export const PERMISSIONS = [
  "engineering:read", "incident:declare", "incident:update", "note:add",
  "project:read_all", "project:create", "project:manage", "prototype:link",
  "task:create", "task:assign", "task:update_own", "task:update_any",
  "validation:decide", "validation:override", "org:read", "org:manage", "activity:read_all",
  "admin:access", "space:hr", "space:finance", "space:purchasing",
  "purchase:request", "purchase:read_all", "supplier:manage", "purchase:quote", "purchase:order",
  "purchase:receive", "purchase:invoice", "purchase:approve_finance", "purchase:approve_direction",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export const PERMISSION_LABELS: Record<Permission, string> = {
  "engineering:read": "Consulter l’ingénierie", "incident:declare": "Déclarer une anomalie", "incident:update": "Faire évoluer une anomalie",
  "note:add": "Ajouter une observation", "project:read_all": "Voir tous les projets", "project:create": "Créer un projet",
  "project:manage": "Gérer ses projets", "prototype:link": "Rattacher un prototype", "task:create": "Créer une tâche",
  "task:assign": "Attribuer une tâche", "task:update_own": "Faire avancer ses tâches", "task:update_any": "Modifier les tâches de ses projets",
  "validation:decide": "Décider d’une validation", "validation:override": "Décider de toute validation", "org:read": "Consulter l’organisation",
  "org:manage": "Gérer l’organisation", "activity:read_all": "Journal complet", "admin:access": "Administration",
  "space:hr": "Espace RH", "space:finance": "Espace Finance", "space:purchasing": "Espace Achats",
  "purchase:request": "Demander un achat", "purchase:read_all": "Voir tous les achats", "supplier:manage": "Gérer les fournisseurs",
  "purchase:quote": "Saisir et retenir les devis", "purchase:order": "Émettre et clôturer les commandes",
  "purchase:receive": "Réceptionner des marchandises", "purchase:invoice": "Traiter les factures fournisseurs",
  "purchase:approve_finance": "Valider un achat (Finance)", "purchase:approve_direction": "Valider un achat (Direction)",
};

const ENG = ["engineering:read"] as const;
const REQ = "purchase:request" as const;
const ADMIN_EXCLUDED: readonly Permission[] = ["supplier:manage", "purchase:quote", "purchase:order", "purchase:receive", "purchase:invoice", "purchase:approve_finance", "purchase:approve_direction"];
export const ROLE_PERMISSIONS = {
  DIRECTOR: [...ENG, "project:read_all", "org:read", "activity:read_all", "validation:decide", "validation:override", REQ, "purchase:read_all", "purchase:approve_direction"],
  PROJECT_MANAGER: [...ENG, "project:create", "project:manage", "prototype:link", "task:create", "task:assign", "task:update_any", "task:update_own", "validation:decide", "incident:declare", "org:read", REQ],
  TEAM_LEAD: [...ENG, "task:create", "task:assign", "task:update_own", "validation:decide", "incident:declare", "incident:update", "note:add", "org:read", REQ, "purchase:receive"],
  ENGINEER: [...ENG, "incident:declare", "incident:update", "note:add", "task:update_own", "validation:decide", REQ, "purchase:receive"],
  TECHNICIAN: [...ENG, "incident:declare", "note:add", "task:update_own", REQ, "purchase:receive"],
  QUALITY_MANAGER: [...ENG, "incident:declare", "incident:update", "note:add", "validation:decide", "project:read_all", "activity:read_all", "org:read", REQ],
  HR: ["org:read", "org:manage", "space:hr", REQ],
  FINANCE: ["project:read_all", "org:read", "space:finance", REQ, "purchase:read_all", "purchase:approve_finance"],
  PURCHASING: [...ENG, "project:read_all", "space:purchasing", REQ, "purchase:read_all", "supplier:manage", "purchase:quote", "purchase:order", "purchase:receive", "purchase:invoice"],
  // The Administrator runs the platform and reads everything, but takes no part in purchasing
  // operations (suppliers, quotes, orders, receipts, invoices) nor in purchase approvals.
  ADMIN: PERMISSIONS.filter(p => !ADMIN_EXCLUDED.includes(p)),
} satisfies Record<SystemRole, readonly Permission[]>;

export const hasPermission = (user: User, p: Permission): boolean => (ROLE_PERMISSIONS[user.systemRole] as readonly Permission[]).includes(p);

export interface ScopeData { projects: Project[]; projectMembers: ProjectMember[]; users: User[] }
const isAdmin = (u: User) => u.systemRole === "ADMIN";

export const isProjectOwner = (user: User, projectId: string, d: ScopeData): boolean =>
  d.projects.some(p => p.id === projectId && p.ownerId === user.id);

export const canSeeProject = (user: User, projectId: string, d: ScopeData): boolean =>
  hasPermission(user, "project:read_all") || isProjectOwner(user, projectId, d) ||
  d.projectMembers.some(m => m.projectId === projectId && m.userId === user.id);

export const canManageProject = (user: User, projectId: string, d: ScopeData): boolean =>
  isAdmin(user) || (hasPermission(user, "project:manage") && isProjectOwner(user, projectId, d));

export function canAssignTo(user: User, task: Pick<Task, "projectId">, assignee: User, d: ScopeData): boolean {
  if (isAdmin(user)) return true;
  if (!hasPermission(user, "task:assign")) return false;
  if (isProjectOwner(user, task.projectId, d)) return true;
  return user.systemRole === "TEAM_LEAD" && !!user.teamId && assignee.teamId === user.teamId && canSeeProject(user, task.projectId, d);
}

export function canUpdateTask(user: User, task: Task, d: ScopeData): boolean {
  if (isAdmin(user)) return true;
  if (hasPermission(user, "task:update_any") && isProjectOwner(user, task.projectId, d)) return true;
  return hasPermission(user, "task:update_own") && task.assigneeId === user.id;
}

export const canDecideValidation = (user: User, v: Pick<ValidationRequest, "validatorId">): boolean =>
  hasPermission(user, "validation:override") || (hasPermission(user, "validation:decide") && v.validatorId === user.id);
