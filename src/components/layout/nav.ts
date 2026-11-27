import { AlertTriangle, BadgeCheck, BarChart3, Bell, Boxes, Building2, Car, ClipboardList, FileSpreadsheet, FileText, FlaskConical, FolderKanban, Gauge, History, Home, KanbanSquare, LayoutDashboard, ListChecks, Network, Receipt, Settings, Truck, Users, Wallet, type LucideIcon } from "lucide-react";
export interface NavItem { href: string; label: string; icon: LucideIcon; badge?: "notifications" | "validations"; exact?: boolean }
// The first group ("Mon espace") is pinned open; the others collapse into an accordion.
export const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  { title: "Mon espace", items: [
    { href: "/espace", label: "Accueil", icon: Home }, { href: "/my-tasks", label: "Mes tâches", icon: ListChecks },
    { href: "/notifications", label: "Notifications", icon: Bell, badge: "notifications" }] },
  { title: "Pilotage", items: [
    { href: "/projects", label: "Projets", icon: FolderKanban }, { href: "/tasks", label: "Tâches", icon: KanbanSquare },
    { href: "/validations", label: "Validations", icon: BadgeCheck, badge: "validations" }, { href: "/organization", label: "Organisation", icon: Network },
    { href: "/activity", label: "Journal d’activité", icon: History }] },
  { title: "Ingénierie", items: [
    { href: "/dashboard", label: "Synthèse ingénierie", icon: LayoutDashboard }, { href: "/prototypes", label: "Prototypes", icon: Car },
    { href: "/components", label: "Composants", icon: Boxes }, { href: "/tests", label: "Essais techniques", icon: FlaskConical },
    { href: "/anomalies", label: "Anomalies", icon: AlertTriangle }, { href: "/analytics", label: "Analyse", icon: BarChart3 },
    { href: "/reports", label: "Rapports", icon: FileText }] },
  { title: "Achats", items: [
    { href: "/purchasing", label: "Tableau de bord achats", icon: Gauge, exact: true }, { href: "/purchasing/requests", label: "Demandes d’achat", icon: ClipboardList },
    { href: "/purchasing/orders", label: "Commandes", icon: Truck }, { href: "/purchasing/suppliers", label: "Fournisseurs", icon: Building2 },
    { href: "/purchasing/invoices", label: "Factures fournisseurs", icon: Receipt }, { href: "/purchasing/reports", label: "Rapports achats", icon: FileSpreadsheet }] },
  { title: "Espaces métier", items: [
    { href: "/hr", label: "Ressources humaines", icon: Users }, { href: "/finance", label: "Finance", icon: Wallet }] },
  { title: "Administration", items: [{ href: "/admin", label: "Administration", icon: Settings }] },
];
