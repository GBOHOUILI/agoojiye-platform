import type { Team, User } from "@/types";
export const displayName = (u: Pick<User, "firstName" | "lastName">) => `${u.firstName} ${u.lastName}`;
export const nameOf = (users: User[], id: string | undefined, fallback = "—") => {
  if (id === "system") return "Système";
  const u = id ? users.find(x => x.id === id) : undefined;
  return u ? displayName(u) : fallback;
};

/** Name of the linked collaborator or team; older records without a link fall back to their stored text. */
export function responsibleLabel(r: { resp: string; respId?: string; respTeamId?: string }, users: User[], teams: Team[]): string {
  const u = r.respId ? users.find(x => x.id === r.respId) : undefined;
  if (u) return displayName(u);
  return (r.respTeamId && teams.find(t => t.id === r.respTeamId)?.name) || r.resp;
}
