import { DEFAULT_USER_ID } from "@/data/seed-org";
import type { User } from "@/types";
// Simulated "session": only remembers which fictitious profile is being viewed. No authentication.
export const SESSION_KEY = "agj-demo-session";
export function resolveSessionUser(storedId: string | null, users: User[]): User {
  const active = users.filter(u => u.active);
  return active.find(u => u.id === storedId) ?? active.find(u => u.id === DEFAULT_USER_ID) ?? active[0] ?? users[0];
}
