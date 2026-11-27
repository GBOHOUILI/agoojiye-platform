import type { Permission } from "./permissions";
// No permission = reachable by every simulated profile.
export const ROUTE_ACCESS: { prefix: string; permission?: Permission }[] = [
  { prefix: "/espace" }, { prefix: "/my-tasks" }, { prefix: "/notifications" }, { prefix: "/projects" },
  { prefix: "/tasks" }, { prefix: "/validations" }, { prefix: "/activity" }, { prefix: "/settings" },
  { prefix: "/organization", permission: "org:read" }, { prefix: "/admin", permission: "admin:access" },
  { prefix: "/hr", permission: "space:hr" }, { prefix: "/finance", permission: "space:finance" }, { prefix: "/purchasing", permission: "purchase:read_all" },
  { prefix: "/purchasing/requests", permission: "purchase:request" }, { prefix: "/purchasing/orders", permission: "purchase:request" },
  ...["/dashboard", "/prototypes", "/components", "/tests", "/anomalies", "/analytics", "/reports"].map(prefix => ({ prefix, permission: "engineering:read" as const })),
];
const matches = (path: string, prefix: string) => path === prefix || path.startsWith(prefix + "/");
export function routePermission(pathname: string): Permission | undefined {
  const hit = ROUTE_ACCESS.filter(r => matches(pathname, r.prefix)).sort((a, b) => b.prefix.length - a.prefix.length)[0];
  return hit?.permission;
}
