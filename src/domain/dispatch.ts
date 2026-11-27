import type { Repositories } from "@/repositories/types";
import { activityFor } from "./activity-rules";
import type { DomainEvent } from "./events";
import { notificationsFor } from "./notification-rules";

// Only entry point that writes notifications and activity: views never create them directly.
export async function dispatchEvents(repos: Repositories, events: DomainEvent[]): Promise<void> {
  if (!events.length) return;
  const [users, projects, prototypeLinks, teams] = await Promise.all([repos.users.list(), repos.projects.list(), repos.projects.listPrototypeLinks(), repos.teams.list()]);
  const dir = { users, projects, prototypeLinks, teams };
  await repos.notifications.createMany(events.flatMap(e => notificationsFor(e, dir)));
  await repos.activity.append(events.map(e => activityFor(e, dir)));
}
