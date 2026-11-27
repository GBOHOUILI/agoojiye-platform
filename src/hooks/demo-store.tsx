"use client";
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { hasPermission, type Permission } from "@/lib/access-simulation/permissions";
import { ROLE_LABELS } from "@/lib/access-simulation/roles";
import { nowIso } from "@/lib/clock";
import { displayName } from "@/lib/people";
import type { AnomalyInput } from "@/lib/validations/anomaly";
import type { ProjectInput } from "@/lib/validations/project";
import type { TaskInput } from "@/lib/validations/task";
import type { UserUpdateInput } from "@/lib/validations/user";
import { getRepositories } from "@/repositories";
import { resolveSessionUser, SESSION_KEY } from "@/repositories/session";
import type { Repositories } from "@/repositories/types";
import { buildAnomaly } from "@/services/anomalies.service";
import { addNoteCommand, changeAnomalyStatus, declareAnomaly } from "@/services/anomalies.commands";
import type { CommandResult, ServiceContext } from "@/services/context";
import { resetDemo } from "@/services/demo.service";
import { markAllRead as markAllReadSvc, markRead as markReadSvc } from "@/services/notifications.service";
import { updateUser as updateUserSvc } from "@/services/organization.service";
import { addProjectMember as addMemberSvc, createProject as createProjectSvc, linkPrototype as linkSvc, unlinkPrototype as unlinkSvc } from "@/services/projects.service";
import { assignTask as assignSvc, changeTaskStatus as statusSvc, createTask as createTaskSvc, updateTaskProgress } from "@/services/tasks.service";
import { decideValidation as decideSvc, submitForValidation as submitSvc } from "@/services/validations.service";
import type { Notification, Statut, TaskStatus, User } from "@/types";
import { runCommand, type Toast } from "./store/commands";
import { purchasingCommands, type PurchasingCommands } from "./store/purchasing-commands";
import { decidePurchaseApproval } from "@/services/purchasing/requests.service";
import { emptySnapshot, loadSnapshot, type Snapshot } from "./store/snapshot";

interface Ctx extends Snapshot, PurchasingCommands {
  ready: boolean; currentUser: User;
  can: (p: Permission) => boolean; switchUser: (id: string) => void;
  myNotifications: Notification[]; unreadCount: number;
  // Phase 1 API, kept unchanged for existing views.
  setStatut: (id: string, s: Statut, note: string) => void; addNote: (id: string, t: string) => void;
  declare: (i: AnomalyInput) => string; reset: () => void;
  createProject: (i: ProjectInput) => Promise<string | null>;
  addProjectMember: (projectId: string, userId: string) => Promise<boolean>;
  linkPrototype: (prototypeId: string, projectId: string) => Promise<boolean>;
  unlinkPrototype: (prototypeId: string) => Promise<boolean>;
  createTask: (i: TaskInput) => Promise<string | null>;
  assignTask: (taskId: string, userId: string) => Promise<boolean>;
  changeTaskStatus: (taskId: string, s: TaskStatus) => Promise<boolean>;
  setTaskProgress: (taskId: string, progress: number) => Promise<boolean>;
  submitForValidation: (taskId: string) => Promise<boolean>;
  decideValidation: (id: string, d: "approve" | "reject", comment?: string) => Promise<boolean>;
  updateUser: (id: string, patch: UserUpdateInput) => Promise<boolean>;
  markRead: (id: string) => void; markAllRead: () => void;
}

const C = createContext<Ctx | null>(null);
export function useDemoStore() { const c = useContext(C); if (!c) throw new Error("DemoStoreProvider manquant"); return c; }

export function DemoStoreProvider({ children }: { children: ReactNode }) {
  const [snap, setSnap] = useState<Snapshot>(emptySnapshot);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [toastState, setToast] = useState<{ msg: string; tone: "ok" | "error" } | null>(null);
  const reposRef = useRef<Repositories | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  // localStorage is only read after mount (no hydration mismatch).
  useEffect(() => {
    const repos = getRepositories(); reposRef.current = repos;
    try { setSessionId(localStorage.getItem(SESSION_KEY)); } catch { /* private mode */ }
    const refresh = () => loadSnapshot(repos).then(setSnap);
    refresh().then(() => setReady(true));
    return repos.demo.subscribe(() => { void refresh(); });
  }, []);

  const toast: Toast = useCallback((msg, tone = "ok") => {
    setToast({ msg, tone }); clearTimeout(timer.current); timer.current = setTimeout(() => setToast(null), tone === "error" ? 4500 : 2800);
  }, []);

  const currentUser = useMemo(() => resolveSessionUser(sessionId, snap.users), [sessionId, snap.users]);
  const repos = () => reposRef.current ?? getRepositories();
  const ctx = (): ServiceContext => ({ repos: repos(), actor: currentUser, now: nowIso });
  const run = <T,>(fn: () => Promise<CommandResult<T>>, ok?: (v: T) => string) => runCommand(repos(), toast, fn, ok);

  const can = useCallback((p: Permission) => hasPermission(currentUser, p), [currentUser]);
  const myNotifications = useMemo(() => snap.notifications.filter(n => n.recipientId === currentUser.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [snap.notifications, currentUser.id]);

  const value: Ctx = {
    ...snap, ready, currentUser, can, myNotifications, unreadCount: myNotifications.filter(n => !n.readAt).length,
    switchUser: id => {
      const u = snap.users.find(x => x.id === id); if (!u) return;
      try { localStorage.setItem(SESSION_KEY, id); } catch { /* ignore */ }
      setSessionId(id); toast(`Profil actif : ${displayName(u)} — ${ROLE_LABELS[u.systemRole]} (simulation)`);
    },
    setStatut: (id, s, note) => { void run(() => changeAnomalyStatus(ctx(), id, s, note), () => `${id} → ${s}`); },
    addNote: (id, t) => { void run(() => addNoteCommand(ctx(), id, t), () => "Observation ajoutée"); },
    declare: i => {
      // The legacy API returns the new id synchronously; the anomaly is built here and persisted as-is.
      const a = buildAnomaly(snap.anos, i, displayName(currentUser), currentUser.id);
      if (!can("incident:declare")) { toast(`Action non autorisée pour le profil ${ROLE_LABELS[currentUser.systemRole]} (simulation).`, "error"); return ""; }
      setSnap(p => ({ ...p, anos: [a, ...p.anos] }));
      void run(() => declareAnomaly(ctx(), i, a), () => `${a.id} déclarée`);
      return a.id;
    },
    reset: () => { void run(() => resetDemo(ctx()), () => "Données de démonstration réinitialisées"); },
    createProject: async i => { const r = await run(() => createProjectSvc(ctx(), i), p => `Projet ${p.code} créé`); return r.ok ? r.value.id : null; },
    addProjectMember: async (projectId, userId) => (await run(() => addMemberSvc(ctx(), projectId, userId), () => "Collaborateur ajouté au projet")).ok,
    linkPrototype: async (prototypeId, projectId) => (await run(() => linkSvc(ctx(), prototypeId, projectId), () => `${prototypeId} rattaché au projet`)).ok,
    unlinkPrototype: async prototypeId => (await run(() => unlinkSvc(ctx(), prototypeId), () => `${prototypeId} détaché du projet`)).ok,
    createTask: async i => { const r = await run(() => createTaskSvc(ctx(), i), t => `Tâche ${t.code} créée`); return r.ok ? r.value.id : null; },
    assignTask: async (taskId, userId) => (await run(() => assignSvc(ctx(), taskId, userId), t => `${t.code} attribuée`)).ok,
    changeTaskStatus: async (taskId, s) => (await run(() => statusSvc(ctx(), taskId, s), t => `${t.code} → ${t.status}`)).ok,
    setTaskProgress: async (taskId, p) => (await run(() => updateTaskProgress(ctx(), taskId, p), t => `Avancement de ${t.code} : ${t.progress} %`)).ok,
    submitForValidation: async taskId => (await run(() => submitSvc(ctx(), taskId), () => "Tâche soumise à validation")).ok,
    // Routes the decision to the service owning the validated subject (tasks or purchase requests).
    decideValidation: async (id, d, comment) => {
      const isPurchase = snap.validations.find(v => v.id === id)?.subjectType === "purchase_request";
      return (await run(() => (isPurchase ? decidePurchaseApproval : decideSvc)(ctx(), id, d, comment), v => (v.status === "Approuvée" ? "Validation approuvée" : "Validation rejetée"))).ok;
    },
    ...purchasingCommands(run, ctx),
    updateUser: async (id, patch) => (await run(() => updateUserSvc(ctx(), id, patch), () => "Fiche collaborateur mise à jour")).ok,
    markRead: id => { markReadSvc(ctx(), id).catch(e => toast(e instanceof Error ? e.message : "Erreur inattendue.", "error")); },
    markAllRead: () => { void markAllReadSvc(ctx()).then(() => toast("Notifications marquées comme lues")); },
  };

  return <C.Provider value={value}>{children}{toastState && <div role="status" aria-live="polite" className={`fixed bottom-4 left-1/2 z-[60] max-w-[90vw] -translate-x-1/2 rounded-lg px-4 py-2.5 text-sm text-white shadow-lg ${toastState.tone === "error" ? "bg-red-700" : "bg-slate-900"}`}>{toastState.msg}</div>}</C.Provider>;
}
