import type { NotificationPriority, Priority, SystemRole, TaskStatus } from "@/types";
// Each simulated role gets its own hue so the active profile is always recognisable.
export const ROLE_TONE: Record<SystemRole, { chip: string; dot: string; ring: string }> = {
  DIRECTOR: { chip: "bg-indigo-50 text-indigo-800 ring-indigo-200", dot: "bg-indigo-600", ring: "ring-indigo-500" },
  PROJECT_MANAGER: { chip: "bg-teal-50 text-teal-800 ring-teal-200", dot: "bg-teal-600", ring: "ring-teal-500" },
  TEAM_LEAD: { chip: "bg-cyan-50 text-cyan-800 ring-cyan-200", dot: "bg-cyan-600", ring: "ring-cyan-500" },
  ENGINEER: { chip: "bg-sky-50 text-sky-800 ring-sky-200", dot: "bg-sky-600", ring: "ring-sky-500" },
  TECHNICIAN: { chip: "bg-lime-50 text-lime-800 ring-lime-200", dot: "bg-lime-600", ring: "ring-lime-500" },
  QUALITY_MANAGER: { chip: "bg-amber-50 text-amber-800 ring-amber-200", dot: "bg-amber-500", ring: "ring-amber-500" },
  HR: { chip: "bg-rose-50 text-rose-800 ring-rose-200", dot: "bg-rose-500", ring: "ring-rose-400" },
  FINANCE: { chip: "bg-emerald-50 text-emerald-800 ring-emerald-200", dot: "bg-emerald-600", ring: "ring-emerald-500" },
  PURCHASING: { chip: "bg-orange-50 text-orange-800 ring-orange-200", dot: "bg-orange-500", ring: "ring-orange-400" },
  ADMIN: { chip: "bg-slate-100 text-slate-800 ring-slate-300", dot: "bg-slate-700", ring: "ring-slate-600" },
};
export const PRIORITY_TONE: Record<Priority, string> = { Urgente: "bg-red-100 text-red-800", Haute: "bg-orange-100 text-orange-800", Normale: "bg-slate-100 text-slate-700", Basse: "bg-slate-50 text-slate-500 ring-1 ring-inset ring-slate-200" };
export const TASK_STATUS_TONE: Record<TaskStatus, string> = { "À faire": "bg-slate-100 text-slate-700", "En cours": "bg-sky-100 text-sky-800", Bloquée: "bg-red-100 text-red-800", "En validation": "bg-amber-100 text-amber-800", Terminée: "bg-emerald-100 text-emerald-800" };
export const NOTIF_DOT: Record<NotificationPriority, string> = { Critique: "bg-red-600", Haute: "bg-orange-500", Normale: "bg-sky-500", Basse: "bg-slate-300" };
