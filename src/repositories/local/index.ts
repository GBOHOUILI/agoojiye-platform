import type { Repositories } from "../types";
import { LocalDatabase, seedFor, type DbDocument } from "./database";

type Keyed = { id: string };
// Mimics a database sequence: prefix + (max numeric suffix + 1), zero-padded.
export function nextId(prefix: string, existing: Keyed[], width = 3): string {
  const max = existing.reduce((m, x) => { if (!x.id.startsWith(prefix + "-")) return m; const n = Number(x.id.slice(prefix.length + 1)); return Number.isFinite(n) && n > m ? n : m; }, 0);
  return `${prefix}-${String(max + 1).padStart(width, "0")}`;
}

export function createLocalRepositories(db: LocalDatabase, now: () => string): Repositories {
  const read = () => db.read();
  const notFound = (id: string) => new Error(`Not found: ${id}`);
  const clone = <T>(x: T): T => structuredClone(x);

  type CrudKey = "users" | "projects" | "tasks" | "validations" | "suppliers" | "purchaseRequests" | "quotes" | "purchaseOrders" | "invoices";
  function crud<K extends CrudKey>(key: K, prefix: string, build: (input: never, id: string) => DbDocument[K][number], width = 3) {
    type T = DbDocument[K][number];
    return {
      list: async () => clone(read()[key]) as T[],
      get: async (id: string) => clone((read()[key] as T[]).find(x => x.id === id)),
      create: async (input: unknown) => {
        const item = build(input as never, nextId(prefix, read()[key], width));
        db.write(d => { (d[key] as T[]).push(item); });
        return clone(item);
      },
      update: async (id: string, patch: Partial<T>) => {
        const current = (read()[key] as T[]).find(x => x.id === id);
        if (!current) throw notFound(id);
        const next = { ...current, ...patch, ...("updatedAt" in current ? { updatedAt: now() } : {}) } as T;
        db.write(d => { d[key] = (d[key] as T[]).map(x => (x.id === id ? next : x)) as DbDocument[K]; });
        return clone(next);
      },
    };
  }

  return {
    users: crud("users", "U", (input: object, id) => ({ ...input, id }) as never),
    departments: { list: async () => clone(read().departments) },
    teams: { list: async () => clone(read().teams) },
    projects: {
      ...crud("projects", "PRJ", (input: object, id) => ({ ...input, id, code: id, createdAt: now() }) as never),
      listMembers: async () => clone(read().projectMembers),
      addMember: async m => db.write(d => { d.projectMembers = [...d.projectMembers.filter(x => !(x.projectId === m.projectId && x.userId === m.userId)), m]; }),
      removeMember: async (projectId, userId) => db.write(d => { d.projectMembers = d.projectMembers.filter(x => !(x.projectId === projectId && x.userId === userId)); }),
      listPrototypeLinks: async () => clone(read().prototypeLinks),
      linkPrototype: async l => db.write(d => { d.prototypeLinks = [...d.prototypeLinks.filter(x => x.prototypeId !== l.prototypeId), l]; }),
      unlinkPrototype: async prototypeId => db.write(d => { d.prototypeLinks = d.prototypeLinks.filter(x => x.prototypeId !== prototypeId); }),
    },
    tasks: crud("tasks", "TSK", (input: object, id) => ({ ...input, id, code: id, createdAt: now(), updatedAt: now() }) as never),
    validations: crud("validations", "VAL", (input: object, id) => ({ ...input, id }) as never),
    anomalies: {
      list: async () => clone(read().anos),
      save: async a => db.write(d => { d.anos = d.anos.some(x => x.id === a.id) ? d.anos.map(x => (x.id === a.id ? a : x)) : [a, ...d.anos]; }),
      listNotes: async () => clone(read().notes),
      addNote: async (targetId, e) => db.write(d => { d.notes = { ...d.notes, [targetId]: [...(d.notes[targetId] ?? []), e] }; }),
    },
    notifications: {
      list: async () => clone(read().notifications),
      createMany: async ns => { if (!ns.length) return; db.write(d => { ns.forEach(n => d.notifications.push({ ...n, id: nextId("NTF", d.notifications) })); }); },
      markRead: async (id, at) => db.write(d => { d.notifications = d.notifications.map(n => (n.id === id && !n.readAt ? { ...n, readAt: at } : n)); }),
      markAllRead: async (recipientId, at) => db.write(d => { d.notifications = d.notifications.map(n => (n.recipientId === recipientId && !n.readAt ? { ...n, readAt: at } : n)); }),
    },
    activity: {
      list: async () => clone(read().activity),
      append: async es => { if (!es.length) return; db.write(d => { es.forEach(e => d.activity.push({ ...e, id: nextId("ACT", d.activity) })); }); },
    },
    purchasing: {
      suppliers: crud("suppliers", "SUP", (input: object, id) => ({ ...input, id, createdAt: now() }) as never),
      requests: crud("purchaseRequests", "DA-2026", (input: object, id) => ({ ...input, id, createdAt: now() }) as never),
      quotes: crud("quotes", "DEV", (input: object, id) => ({ ...input, id }) as never),
      orders: crud("purchaseOrders", "BC-2026", (input: object, id) => ({ ...input, id }) as never, 4),
      receipts: {
        list: async () => clone(read().receipts),
        create: async input => { const item = { ...input, id: nextId("REC", read().receipts) }; db.write(d => { d.receipts.push(item); }); return clone(item); },
      },
      invoices: crud("invoices", "FAC", (input: object, id) => ({ ...input, id }) as never),
    },
    demo: { reset: async () => db.replace(seedFor(now)), subscribe: fn => db.subscribe(fn), seedOffsetDays: async () => read().seedOffsetDays },
  };
}
