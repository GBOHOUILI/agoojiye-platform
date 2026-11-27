import { describe, expect, it } from "vitest";
import { LocalDatabase } from "@/repositories/local/database";
import { createLocalRepositories } from "@/repositories/local";
import { assignTask, changeTaskStatus, createTask, updateTaskProgress } from "./tasks.service";
import { decideValidation, submitForValidation } from "./validations.service";
import { updateUser } from "./organization.service";
import { createProject, linkPrototype, projectProgress } from "./projects.service";
import { DomainError, type ServiceContext } from "./context";
import { USERS0 } from "@/data/seed-org";

const now = () => "2026-11-26T10:00:00.000Z";
const setup = () => {
  const repos = createLocalRepositories(new LocalDatabase(null), now);
  const as = (id: string): ServiceContext => ({ repos, actor: USERS0.find(u => u.id === id)!, now });
  return { repos, as };
};
const qualityId = USERS0.find(u => u.systemRole === "QUALITY_MANAGER")!.id;
const techId = USERS0.find(u => u.systemRole === "TECHNICIAN")!.id;
const adminId = USERS0.find(u => u.systemRole === "ADMIN")!.id;
const base = { projectId: "PRJ-01", title: "Calibrer capteur", priority: "Haute" as const, dueDate: "2026-12-05" };

describe("task workflow", () => {
  it("full validation cycle emits expected events", async () => {
    const { as, repos } = setup();
    const c = await createTask(as("U-KAR"), { ...base, assigneeId: techId, validatorId: qualityId });
    expect(c.events.map(e => e.type)).toEqual(["task.created", "task.assigned"]);
    await changeTaskStatus(as(techId), c.value.id, "En cours");
    await expect(changeTaskStatus(as(techId), c.value.id, "Terminée")).rejects.toThrow("Transition impossible");
    const s = await submitForValidation(as(techId), c.value.id);
    expect(s.value).toMatchObject({ authorId: "U-KAR", ownerId: techId, validatorId: qualityId, status: "En attente" });
    expect((await repos.tasks.get(c.value.id))?.status).toBe("En validation");
    const r = await decideValidation(as(qualityId), s.value.id, "approve");
    expect(r.events[0].type).toBe("validation.approved");
    expect(await repos.tasks.get(c.value.id)).toMatchObject({ status: "Terminée", progress: 100 });
  });
  it("rejection requires a comment and reopens the task", async () => {
    const { as, repos } = setup();
    const c = await createTask(as("U-KAR"), { ...base, assigneeId: techId, validatorId: qualityId });
    await changeTaskStatus(as(techId), c.value.id, "En cours");
    const s = await submitForValidation(as(techId), c.value.id);
    await expect(decideValidation(as(qualityId), s.value.id, "reject", "")).rejects.toThrow("commentaire");
    await decideValidation(as(qualityId), s.value.id, "reject", "Mesures incomplètes");
    expect((await repos.tasks.get(c.value.id))?.status).toBe("En cours");
    expect((await repos.validations.get(s.value.id))?.comment).toBe("Mesures incomplètes");
  });
  it("an already decided validation cannot be decided again", async () => {
    const { as } = setup();
    const c = await createTask(as("U-KAR"), { ...base, assigneeId: techId, validatorId: qualityId });
    await changeTaskStatus(as(techId), c.value.id, "En cours");
    const s = await submitForValidation(as(techId), c.value.id);
    await decideValidation(as(qualityId), s.value.id, "approve");
    await expect(decideValidation(as(qualityId), s.value.id, "approve")).rejects.toThrow(DomainError);
  });
  it("task without validator can be closed directly", async () => {
    const { as } = setup();
    const c = await createTask(as("U-KAR"), { ...base, assigneeId: techId });
    await changeTaskStatus(as(techId), c.value.id, "En cours");
    expect((await changeTaskStatus(as(techId), c.value.id, "Terminée")).value.status).toBe("Terminée");
  });
  it("unassigned task: created without assignment event, submission refused", async () => {
    const { as } = setup();
    const c = await createTask(as("U-KAR"), { ...base, validatorId: qualityId });
    expect(c.events.map(e => e.type)).toEqual(["task.created"]);
    await expect(submitForValidation(as("U-KAR"), c.value.id)).rejects.toThrow(DomainError);
  });
  it("technician cannot create or reassign tasks", async () => {
    const { as } = setup();
    await expect(createTask(as(techId), base)).rejects.toThrow("non autorisée");
    await expect(assignTask(as(techId), "TSK-001", techId)).rejects.toThrow("non autorisée");
  });
  it("non-designated user cannot decide", async () => {
    const { as } = setup();
    const c = await createTask(as("U-KAR"), { ...base, assigneeId: techId, validatorId: qualityId });
    await changeTaskStatus(as(techId), c.value.id, "En cours");
    const s = await submitForValidation(as(techId), c.value.id);
    await expect(decideValidation(as(techId), s.value.id, "approve")).rejects.toThrow("non autorisée");
  });
  it("cannot reassign a task waiting for validation", async () => {
    const { as } = setup();
    const c = await createTask(as("U-KAR"), { ...base, assigneeId: techId, validatorId: qualityId });
    await changeTaskStatus(as(techId), c.value.id, "En cours");
    await submitForValidation(as(techId), c.value.id);
    await expect(assignTask(as("U-KAR"), c.value.id, "U-AWA")).rejects.toThrow("en attente de validation");
  });
  it("invalid input is rejected with the schema message", async () => {
    const { as } = setup();
    await expect(createTask(as("U-KAR"), { ...base, title: "x" })).rejects.toThrow("au moins 3 caractères");
  });
  it("validator must be allowed to decide", async () => {
    const { as } = setup();
    await expect(createTask(as("U-KAR"), { ...base, validatorId: techId })).rejects.toThrow("validateur");
  });
  it("progress is clamped and requires update rights", async () => {
    const { as } = setup();
    const c = await createTask(as("U-KAR"), { ...base, assigneeId: techId });
    expect((await updateTaskProgress(as(techId), c.value.id, 140)).value.progress).toBe(100);
    await expect(updateTaskProgress(as(qualityId), c.value.id, 50)).rejects.toThrow("non autorisée");
  });
});

describe("projects", () => {
  it("PM creates a project with members, members get event", async () => {
    const { as, repos } = setup();
    const r = await createProject(as("U-KAR"), { name: "Projet test", priority: "Normale", startDate: "2026-12-01", dueDate: "2027-01-01", ownerId: "U-KAR", memberIds: ["U-AWA", "U-KOF"] });
    expect(r.events[0]).toMatchObject({ type: "project.created", memberIds: ["U-AWA", "U-KOF"] });
    expect((await repos.projects.listMembers()).filter(m => m.projectId === r.value.id).map(m => m.userId).sort()).toEqual(["U-AWA", "U-KAR", "U-KOF"]);
  });
  it("rejects due date before start", async () => {
    const { as } = setup();
    await expect(createProject(as("U-KAR"), { name: "Projet test", priority: "Normale", startDate: "2027-01-01", dueDate: "2026-12-01", ownerId: "U-KAR" })).rejects.toThrow("échéance");
  });
  it("only the owner PM links prototypes", async () => {
    const { as } = setup();
    await expect(linkPrototype(as("U-NAD"), "AG-03", "PRJ-03")).rejects.toThrow("non autorisée");
    expect((await linkPrototype(as("U-YAN"), "AG-03", "PRJ-03")).events[0].type).toBe("project.prototype_linked");
  });
  it("moving a prototype requires managing the source project and logs the unlink", async () => {
    const { as } = setup();
    await expect(linkPrototype(as("U-NAD"), "AG-01", "PRJ-04")).rejects.toThrow("non autorisée");
    const r = await linkPrototype(as(adminId), "AG-01", "PRJ-04");
    expect(r.events.map(e => e.type)).toEqual(["project.prototype_unlinked", "project.prototype_linked"]);
    expect(r.events[0]).toMatchObject({ project: { id: "PRJ-01" } });
  });
  it("progress = share of done tasks", () => {
    expect(projectProgress([{ projectId: "P", status: "Terminée" }, { projectId: "P", status: "En cours" }] as never, "P")).toBe(50);
    expect(projectProgress([], "P")).toBe(0);
  });
});

describe("organization", () => {
  it("HR cannot change system role; admin can", async () => {
    const { as } = setup();
    const hr = USERS0.find(u => u.systemRole === "HR")!.id;
    await expect(updateUser(as(hr), techId, { systemRole: "ENGINEER" })).rejects.toThrow("non autorisée");
    expect((await updateUser(as(adminId), techId, { systemRole: "ENGINEER" })).value.systemRole).toBe("ENGINEER");
  });
  it("HR can change team and the user is the event subject", async () => {
    const { as } = setup();
    const hr = USERS0.find(u => u.systemRole === "HR")!.id;
    const r = await updateUser(as(hr), techId, { teamId: "T-ENE" });
    expect(r.value.teamId).toBe("T-ENE");
    expect(r.events[0]).toMatchObject({ type: "user.updated", changes: ["équipe"] });
  });
  it("rejects self-manager and cycles", async () => {
    const { as } = setup();
    await expect(updateUser(as(adminId), "U-KAR", { managerId: "U-KAR" })).rejects.toThrow("propre responsable");
    await expect(updateUser(as(adminId), "U-DIR", { managerId: "U-KAR" })).rejects.toThrow("boucle");
  });
});
