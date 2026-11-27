import { describe, expect, it } from "vitest";
import { LocalDatabase } from "@/repositories/local/database";
import { createLocalRepositories } from "@/repositories/local";
import { addNoteCommand, changeAnomalyStatus } from "./anomalies.commands";
import type { ServiceContext } from "./context";
import { markRead } from "./notifications.service";
import { updateUser } from "./organization.service";
import { addProjectMember, createProject } from "./projects.service";
import { assignTask, changeTaskStatus, createTask, updateTaskProgress } from "./tasks.service";
import { submitForValidation } from "./validations.service";

const now = () => "2026-11-26T10:00:00.000Z";
const setup = () => {
  const repos = createLocalRepositories(new LocalDatabase(null), now);
  const as = async (id: string): Promise<ServiceContext> => ({ repos, actor: (await repos.users.get(id))!, now });
  return { repos, as };
};
const base = { projectId: "PRJ-01", title: "Tâche durcissement", priority: "Normale" as const, dueDate: "2026-12-10" };

describe("services enforce what the UI used to enforce alone", () => {
  it("a profile can only mark its own notifications as read", async () => {
    const { repos, as } = setup();
    const n = (await repos.notifications.list()).find(x => x.recipientId === "U-QUA")!;
    await expect(markRead(await as("U-KOF"), n.id)).rejects.toThrow("ne vous est pas destinée");
  });
  it("a note needs an existing anomaly or test", async () => {
    const { as } = setup();
    await expect(addNoteCommand(await as("U-AWA"), "TES-999", "Observation")).rejects.toThrow("introuvable");
  });
  it("anomaly status follows the workflow one step at a time", async () => {
    const { as } = setup();
    await expect(changeAnomalyStatus(await as("U-AWA"), "ANO-001", "Résolue", "Vérifié sur banc")).rejects.toThrow("Transition impossible");
  });
  it("resolving an anomaly requires a verification justification", async () => {
    const { as } = setup();
    const c = await as("U-AWA");
    await changeAnomalyStatus(c, "ANO-002", "En vérification", "");
    await expect(changeAnomalyStatus(c, "ANO-002", "Résolue", "")).rejects.toThrow("Justification");
  });
  it("tasks cannot be given to an inactive collaborator", async () => {
    const { repos, as } = setup();
    await repos.users.update("U-KOF", { active: false });
    await expect(createTask(await as("U-KAR"), { ...base, assigneeId: "U-KOF" })).rejects.toThrow("inactif");
    await expect(createTask(await as("U-KAR"), { ...base, validatorId: "U-KOF" })).rejects.toThrow("inactif");
  });
  it("a team lead cannot assign within a project they do not take part in", async () => {
    const { as } = setup();
    // U-ABL leads T-ENE (U-ROM's team) but is not a member of PRJ-02.
    await expect(assignTask(await as("U-ABL"), "TSK-009", "U-ROM")).rejects.toThrow("non autorisée");
  });
  it("progress of a closed or pending-validation task is frozen", async () => {
    const { as } = setup();
    await expect(updateTaskProgress(await as("U-KAR"), "TSK-003", 10)).rejects.toThrow("ne peut plus être modifié");
    await expect(updateTaskProgress(await as("U-KAR"), "TSK-027", 10)).rejects.toThrow("ne peut plus être modifié");
  });
  it("concurrent submissions create a single validation request", async () => {
    const { repos, as } = setup();
    const c = await createTask(await as("U-KAR"), { ...base, assigneeId: "U-KOF", validatorId: "U-QUA" });
    const kofi = await as("U-KOF");
    await changeTaskStatus(kofi, c.value.id, "En cours");
    await Promise.allSettled([submitForValidation(kofi, c.value.id), submitForValidation(kofi, c.value.id)]);
    expect((await repos.validations.list()).filter(v => v.subjectId === c.value.id)).toHaveLength(1);
  });
  it("the last administrator cannot lose the administrator role", async () => {
    const { as } = setup();
    await expect(updateUser(await as("U-ADM"), "U-ADM", { systemRole: "ENGINEER" })).rejects.toThrow("dernier administrateur");
  });
  it("only an administrator creates a project on behalf of another manager", async () => {
    const { as } = setup();
    await expect(createProject(await as("U-KAR"), { name: "Projet pour Nadia", priority: "Normale", startDate: "2026-12-01", dueDate: "2027-01-01", ownerId: "U-NAD" })).rejects.toThrow("non autorisée");
    await expect(createProject(await as("U-ADM"), { name: "Projet pour Nadia", priority: "Normale", startDate: "2026-12-01", dueDate: "2027-01-01", ownerId: "U-NAD" })).resolves.toBeDefined();
  });
  it("inactive collaborators cannot join a project", async () => {
    const { repos, as } = setup();
    await repos.users.update("U-ESP", { active: false });
    await expect(addProjectMember(await as("U-KAR"), "PRJ-01", "U-ESP")).rejects.toThrow("inactif");
  });
});
