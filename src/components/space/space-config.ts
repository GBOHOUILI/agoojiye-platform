import type { ComponentType } from "react";
import type { SystemRole } from "@/types";
import * as B from "./blocks";

export type BlockId = "orgKpis" | "projectsAtRisk" | "criticalIncidents" | "pendingValidations" | "myProjects" | "myTasks" | "overdueTasks"
  | "teamWorkload" | "declareShortcut" | "verificationQueue" | "hrKpis" | "financeKpis" | "purchasingKpis" | "recentActivity" | "adminShortcuts" | "myPurchases" | "purchasingQueue";

export const BLOCKS: Record<BlockId, ComponentType> = {
  orgKpis: B.OrgKpis, projectsAtRisk: B.ProjectsAtRisk, criticalIncidents: B.CriticalIncidents, pendingValidations: B.PendingValidations,
  myProjects: B.MyProjects, myTasks: B.MyTasksBlock, overdueTasks: B.OverdueTasksBlock, teamWorkload: B.TeamWorkload, declareShortcut: B.DeclareShortcut,
  verificationQueue: B.VerificationQueue, hrKpis: B.HrKpis, financeKpis: B.FinanceKpis, purchasingKpis: B.PurchasingKpis,
  recentActivity: B.RecentActivity, adminShortcuts: B.AdminShortcuts, myPurchases: B.MyPurchases, purchasingQueue: B.PurchasingQueue,
};

// Declarative composition of the home space: one shared view, ten role-specific layouts.
export const SPACE_BLOCKS: Record<SystemRole, BlockId[]> = {
  DIRECTOR: ["orgKpis", "projectsAtRisk", "criticalIncidents", "pendingValidations", "recentActivity"],
  PROJECT_MANAGER: ["myProjects", "pendingValidations", "overdueTasks", "myPurchases", "recentActivity", "declareShortcut"],
  TEAM_LEAD: ["teamWorkload", "pendingValidations", "myTasks", "myPurchases", "declareShortcut"],
  ENGINEER: ["myTasks", "pendingValidations", "myPurchases", "declareShortcut", "recentActivity"],
  TECHNICIAN: ["myTasks", "myPurchases", "declareShortcut", "recentActivity"],
  QUALITY_MANAGER: ["criticalIncidents", "verificationQueue", "pendingValidations", "recentActivity", "myTasks"],
  HR: ["hrKpis", "recentActivity"],
  FINANCE: ["financeKpis", "pendingValidations", "projectsAtRisk"],
  PURCHASING: ["purchasingKpis", "purchasingQueue", "myPurchases", "criticalIncidents"],
  ADMIN: ["orgKpis", "adminShortcuts", "recentActivity"],
};

export const SPACE_INTRO: Record<SystemRole, string> = {
  DIRECTOR: "Vue d’ensemble de l’organisation : projets, risques et décisions en attente.",
  PROJECT_MANAGER: "Le pilotage de vos projets : avancement, retards et validations à donner.",
  TEAM_LEAD: "La charge de votre équipe et vos propres tâches.",
  ENGINEER: "Vos tâches, vos validations et le signalement d’incidents.",
  TECHNICIAN: "Vos tâches du moment et le signalement d’incidents.",
  QUALITY_MANAGER: "Incidents ouverts, vérifications et validations qui vous attendent.",
  HR: "Effectifs et organisation. Le module RH complet est à venir.",
  FINANCE: "Validations d’achat, factures transmises et échéances des projets. Le module Finance complet est à venir.",
  PURCHASING: "Demandes à traiter, livraisons attendues et factures fournisseurs.",
  ADMIN: "Administration de la démonstration : utilisateurs, rôles simulés et données.",
};
