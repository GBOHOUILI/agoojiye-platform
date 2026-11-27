// Storage-agnostic contracts. Today: local/ (localStorage). Tomorrow: http/ (NestJS + PostgreSQL),
// with the same signatures, so services and views stay unchanged.
import type { ActivityEntry, Ano, Department, Ev, GoodsReceipt, Notification, Project, ProjectMember, PrototypeLink, PurchaseOrder, PurchaseRequest, Quote, Supplier, SupplierInvoice, Task, Team, User, ValidationRequest } from "@/types";

export interface CrudRepository<T, Create, Patch = Partial<T>> {
  list(): Promise<T[]>;
  get(id: string): Promise<T | undefined>;
  create(input: Create): Promise<T>;
  update(id: string, patch: Patch): Promise<T>;
}

export type ProjectCreate = Omit<Project, "id" | "code" | "createdAt">;
export type TaskCreate = Omit<Task, "id" | "code" | "createdAt" | "updatedAt">;

export interface Repositories {
  users: CrudRepository<User, Omit<User, "id">>;
  departments: { list(): Promise<Department[]> };
  teams: { list(): Promise<Team[]> };
  projects: CrudRepository<Project, ProjectCreate> & {
    listMembers(): Promise<ProjectMember[]>;
    addMember(m: ProjectMember): Promise<void>;
    removeMember(projectId: string, userId: string): Promise<void>;
    listPrototypeLinks(): Promise<PrototypeLink[]>;
    linkPrototype(l: PrototypeLink): Promise<void>;
    unlinkPrototype(prototypeId: string): Promise<void>;
  };
  tasks: CrudRepository<Task, TaskCreate>;
  validations: CrudRepository<ValidationRequest, Omit<ValidationRequest, "id">>;
  anomalies: {
    list(): Promise<Ano[]>;
    save(a: Ano): Promise<void>;
    listNotes(): Promise<Record<string, Ev[]>>;
    addNote(targetId: string, e: Ev): Promise<void>;
  };
  notifications: {
    list(): Promise<Notification[]>;
    createMany(ns: Omit<Notification, "id">[]): Promise<void>;
    markRead(id: string, at: string): Promise<void>;
    markAllRead(recipientId: string, at: string): Promise<void>;
  };
  activity: { list(): Promise<ActivityEntry[]>; append(es: Omit<ActivityEntry, "id">[]): Promise<void> };
  purchasing: {
    suppliers: CrudRepository<Supplier, Omit<Supplier, "id" | "createdAt">>;
    requests: CrudRepository<PurchaseRequest, Omit<PurchaseRequest, "id" | "createdAt">>;
    quotes: CrudRepository<Quote, Omit<Quote, "id">>;
    orders: CrudRepository<PurchaseOrder, Omit<PurchaseOrder, "id">>;
    receipts: { list(): Promise<GoodsReceipt[]>; create(r: Omit<GoodsReceipt, "id">): Promise<GoodsReceipt> }; // append-only
    invoices: CrudRepository<SupplierInvoice, Omit<SupplierInvoice, "id">>;
  };
  // seedOffsetDays: shift applied to the fictitious data when they were seeded; read-only engineering data use it too.
  demo: { reset(): Promise<void>; subscribe(fn: () => void): () => void; seedOffsetDays(): Promise<number> };
}
