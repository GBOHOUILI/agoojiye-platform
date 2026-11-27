import { shiftDate, shiftDateTime } from "@/lib/demo-clock";
import type { DbDocument } from "@/repositories/local/database";

/**
 * Every date field of the stored document, per collection ("x[].y" = field y of each item of array x).
 * Guarded by an exhaustiveness test: a new date field must be added here or the test fails.
 */
export const DATE_FIELDS: Record<string, string[]> = {
  projects: ["startDate", "dueDate", "createdAt"],
  tasks: ["dueDate", "createdAt", "updatedAt"],
  validations: ["requestedAt", "decidedAt"],
  anos: ["date", "tl[].d"],
  notes: ["d"],
  notifications: ["createdAt", "readAt"],
  activity: ["at"],
  suppliers: ["createdAt"],
  purchaseRequests: ["neededBy", "createdAt", "submittedAt", "approvedAt"],
  quotes: ["receivedAt", "validUntil"],
  purchaseOrders: ["expectedDelivery", "issuedAt", "closedAt"],
  receipts: ["receivedAt"],
  invoices: ["invoiceDate", "dueDate", "recordedAt", "transmittedAt"],
};

// "YYYY-MM-DD" stays a date, anything longer is a timestamp (time of day preserved).
export const shiftValue = (v: string, days: number) => (v.length === 10 ? shiftDate(v, days) : shiftDateTime(v, days));

function shiftItem<T extends object>(item: T, fields: string[], days: number): T {
  const out = { ...item } as Record<string, unknown>;
  for (const f of fields) {
    const [arr, sub] = f.split("[].");
    if (sub) { if (Array.isArray(out[arr])) out[arr] = (out[arr] as Record<string, unknown>[]).map(x => (typeof x[sub] === "string" ? { ...x, [sub]: shiftValue(x[sub] as string, days) } : x)); }
    else if (typeof out[f] === "string") out[f] = shiftValue(out[f] as string, days);
  }
  return out as T;
}

/** Shifts every date of the (possibly partial) document by `days`, keeping all gaps between dates. */
export function rebaseDocument<D extends Partial<DbDocument>>(doc: D, days: number): D {
  if (!days) return doc;
  const out: Record<string, unknown> = { ...doc };
  for (const [collection, fields] of Object.entries(DATE_FIELDS)) {
    if (collection === "notes") continue;
    const rows = out[collection];
    if (Array.isArray(rows)) out[collection] = rows.map((r: object) => shiftItem(r, fields, days));
  }
  if (doc.notes) out.notes = Object.fromEntries(Object.entries(doc.notes).map(([k, evs]) => [k, evs.map(e => shiftItem(e, DATE_FIELDS.notes, days))]));
  return out as D;
}
