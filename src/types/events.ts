export type EntityType = "project" | "task" | "validation" | "anomaly" | "test" | "user" | "demo" | "purchase" | "supplier";
export const NOTIFICATION_PRIORITIES = ["Basse", "Normale", "Haute", "Critique"] as const;
export type NotificationPriority = (typeof NOTIFICATION_PRIORITIES)[number];
export interface Notification {
  id: string; recipientId: string; type: string; priority: NotificationPriority;
  title: string; body: string; link: string; entityType: EntityType; entityId: string; createdAt: string; readAt?: string;
}
export interface ActivityEntry { id: string; at: string; actorId: string; action: string; entityType: EntityType; entityId: string; summary: string }
