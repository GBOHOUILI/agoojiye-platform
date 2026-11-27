import { ROLE_LABELS } from "@/lib/access-simulation/roles";
import type { NotificationPriority, Priority, SystemRole, TaskStatus } from "@/types";
import { NOTIF_DOT, PRIORITY_TONE, ROLE_TONE, TASK_STATUS_TONE } from "./tones";
const pill = "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium";
export const PriorityBadge = ({ p }: { p: Priority }) => <span className={`${pill} ${PRIORITY_TONE[p]}`}>{p}</span>;
export const TaskStatusBadge = ({ s }: { s: TaskStatus }) => <span className={`${pill} ${TASK_STATUS_TONE[s]}`}>{s}</span>;
export const RoleBadge = ({ role }: { role: SystemRole }) => <span className={`${pill} ring-1 ring-inset ${ROLE_TONE[role].chip}`}>{ROLE_LABELS[role]}</span>;
export const NotificationPriorityDot = ({ p }: { p: NotificationPriority }) => <span title={`Priorité ${p.toLowerCase()}`} className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${NOTIF_DOT[p]}`} />;
