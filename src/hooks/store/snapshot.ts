import { SEED_ANCHOR } from "@/lib/demo-clock";
import { seedDocument, type DbDocument } from "@/repositories/local/database";
import type { Repositories } from "@/repositories/types";

export type Snapshot = Omit<DbDocument, "version">;

export async function loadSnapshot(r: Repositories): Promise<Snapshot> {
  const [users, departments, teams, projects, projectMembers, prototypeLinks, tasks, validations, anos, notes, notifications, activity] = await Promise.all([
    r.users.list(), r.departments.list(), r.teams.list(), r.projects.list(), r.projects.listMembers(), r.projects.listPrototypeLinks(),
    r.tasks.list(), r.validations.list(), r.anomalies.list(), r.anomalies.listNotes(), r.notifications.list(), r.activity.list(),
  ]);
  const p = r.purchasing;
  const [suppliers, purchaseRequests, quotes, purchaseOrders, receipts, invoices, seedOffsetDays] = await Promise.all([
    p.suppliers.list(), p.requests.list(), p.quotes.list(), p.orders.list(), p.receipts.list(), p.invoices.list(), r.demo.seedOffsetDays(),
  ]);
  return { users, departments, teams, projects, projectMembers, prototypeLinks, tasks, validations, anos, notes, notifications, activity, suppliers, purchaseRequests, quotes, purchaseOrders, receipts, invoices, seedOffsetDays };
}

// Rendered on the server and on the first client render: anchored on a fixed day so both are identical
// whatever the build or visit day (no hydration mismatch).
export const emptySnapshot = (): Snapshot => { const { version: _v, ...rest } = seedDocument(SEED_ANCHOR); return rest; };
