import { describe, expect, it } from "vitest";
import { USERS0 } from "@/data/seed-org";
import { LocalDatabase } from "@/repositories/local/database";
import { createLocalRepositories } from "@/repositories/local";
import { addNoteCommand, declareAnomaly } from "./anomalies.commands";
import { correctiveProjectId, correctiveTasksOf, createTask } from "./tasks.service";
import { activityFor } from "@/domain/activity-rules";
import { TASKS0 } from "@/data/seed-work";
import type { ServiceContext } from "./context";
import { ANOS0, ESSAIS, PROTOS } from "@/data/seed";
import { TEAMS0 } from "@/data/seed-org";
import { responsibleLabel } from "@/lib/people";
import { notificationsFor } from "@/domain/notification-rules";
import { PROJECTS0, PROTOTYPE_LINKS0 } from "@/data/seed-work";

const now = () => "2026-11-26T10:00:00.000Z";
const setup = () => { const repos = createLocalRepositories(new LocalDatabase(null, now), now); return { repos, as: (id: string): ServiceContext => ({ repos, actor: USERS0.find(u => u.id === id)!, now }) }; };
const anomaly = { titre: "Bruit de roulement", proto: "AG-01", comp: "MOT-001", g: "Faible" as const, resp: "Équipe essais" };

describe("T2.1 anomaly rules enforced by the services", () => {
  it("refuses a too short title", async () =>
    await expect(declareAnomaly(setup().as("U-AWA"), { ...anomaly, titre: "Ko" })).rejects.toThrow("Le titre doit contenir au moins 5 caractères."));
  it("refuses an unknown prototype", async () =>
    await expect(declareAnomaly(setup().as("U-AWA"), { ...anomaly, proto: "AG-99" })).rejects.toThrow("Prototype introuvable"));
  it("refuses a component that is not part of the prototype", async () =>
    await expect(declareAnomaly(setup().as("U-AWA"), { ...anomaly, comp: "MOT-002" })).rejects.toThrow("n’appartient pas au prototype"));
  it("refuses an observation shorter than 3 characters", async () =>
    await expect(addNoteCommand(setup().as("U-AWA"), "TES-001", "ok")).rejects.toThrow("3 caractères minimum"));
  it("still accepts a valid declaration", async () =>
    expect((await declareAnomaly(setup().as("U-AWA"), anomaly)).value.comp).toBe("MOT-001"));
});

describe("T2.3 engineering owners linked to the organisation", () => {
  const userIds = new Set(USERS0.map(u => u.id)), teamIds = new Set(TEAMS0.map(t => t.id));
  it("prototypes and tests point to existing collaborators", () => {
    PROTOS.forEach(p => expect(userIds.has(p.respId!), p.id).toBe(true));
    ESSAIS.forEach(e => expect(userIds.has(e.respId!), e.id).toBe(true));
  });
  it("anomalies point to existing teams, chosen by category", () => {
    ANOS0.forEach(a => expect(teamIds.has(a.respTeamId!), a.id).toBe(true));
    expect(ANOS0.find(a => a.id === "ANO-001")?.respTeamId).toBe("T-ENE");
    expect(ANOS0.find(a => a.id === "ANO-002")?.respTeamId).toBe("T-ESS");
  });
  it("falls back to the stored text when an older record has no link", () => {
    expect(responsibleLabel({ resp: "Équipe technique" }, USERS0, TEAMS0)).toBe("Équipe technique");
    expect(responsibleLabel({ resp: "x", respTeamId: "T-ESS" }, USERS0, TEAMS0)).toBe("Équipe Essais");
    expect(responsibleLabel({ resp: "x", respId: "U-KAR" }, USERS0, TEAMS0)).toBe("Karim Adjovi");
  });
  it("a reported incident also notifies the lead of the responsible team", () => {
    const a = { ...ANOS0[0], proto: "AG-03", respTeamId: "T-ENE" };
    const ns = notificationsFor({ type: "incident.reported", actorId: "U-DIR", at: now(), anomaly: a }, { users: USERS0, projects: PROJECTS0, prototypeLinks: PROTOTYPE_LINKS0, teams: TEAMS0 });
    expect(ns.map(n => n.recipientId)).toContain("U-ABL");
  });
  it("a declaration from the form keeps the chosen team", async () =>
    expect((await declareAnomaly(setup().as("U-AWA"), { ...anomaly, resp: "Équipe Propulsion", respTeamId: "T-PRO" })).value.respTeamId).toBe("T-PRO"));
});

describe("T3 corrective tasks linked to anomalies", () => {
  const base = { title: "Remplacer les disques avant", priority: "Haute" as const, dueDate: "2026-12-10" };
  it("creates a corrective task in the project of the anomaly's prototype", async () => {
    const r = await createTask(setup().as("U-NAD"), { ...base, projectId: "PRJ-02", anomalyId: "ANO-002", assigneeId: "U-ESP" });
    expect(r.value.anomalyId).toBe("ANO-002");
    expect(activityFor(r.events[0], { users: USERS0, projects: PROJECTS0, prototypeLinks: PROTOTYPE_LINKS0 }).summary).toContain("action corrective de ANO-002");
  });
  it("refuses an unknown anomaly", async () =>
    await expect(createTask(setup().as("U-NAD"), { ...base, projectId: "PRJ-02", anomalyId: "ANO-999" })).rejects.toThrow("Anomalie introuvable"));
  it("refuses a project other than the one of the anomaly's prototype", async () =>
    await expect(createTask(setup().as("U-KAR"), { ...base, projectId: "PRJ-01", anomalyId: "ANO-002" })).rejects.toThrow("projet PRJ-02"));
  it("refuses when the anomaly's prototype is attached to no project", async () =>
    await expect(createTask(setup().as("U-YAN"), { ...base, projectId: "PRJ-03", anomalyId: "ANO-008" })).rejects.toThrow("rattaché à aucun projet"));
  it("keeps task permissions: a technician still cannot create a corrective task", async () =>
    await expect(createTask(setup().as("U-KOF"), { ...base, projectId: "PRJ-02", anomalyId: "ANO-002" })).rejects.toThrow("non autorisée"));
  it("seeded corrective tasks point to existing anomalies of the same project", () => {
    const links = { "TSK-009": "ANO-002", "TSK-011": "ANO-007", "TSK-013": "ANO-006" };
    for (const [taskId, anoId] of Object.entries(links)) expect(TASKS0.find(t => t.id === taskId)?.anomalyId).toBe(anoId);
    TASKS0.filter(t => t.anomalyId).forEach(t => {
      const a = ANOS0.find(x => x.id === t.anomalyId)!;
      expect(PROTOTYPE_LINKS0.find(l => l.prototypeId === a.proto)?.projectId, t.id).toBe(t.projectId);
    });
  });
});

describe("T3.3 corrective selectors used by the screens", () => {
  it("finds the project where a corrective task must be created", () => {
    expect(correctiveProjectId(ANOS0.find(a => a.id === "ANO-002")!, PROTOTYPE_LINKS0)).toBe("PRJ-02");
    expect(correctiveProjectId(ANOS0.find(a => a.id === "ANO-008")!, PROTOTYPE_LINKS0)).toBeUndefined();
  });
  it("lists the corrective tasks of an anomaly", () =>
    expect(correctiveTasksOf(TASKS0, "ANO-002").map(t => t.id)).toEqual(["TSK-009"]));
});

describe("review fixes: rules held by the services", () => {
  const base = { title: "Reprendre le réglage", priority: "Haute" as const, dueDate: "2026-12-10", projectId: "PRJ-02" };
  it("refuses a corrective task on a resolved anomaly", async () => {
    const s = setup(), resolved = (await s.repos.anomalies.list()).find(a => a.s === "Résolue" && PROTOTYPE_LINKS0.some(l => l.prototypeId === a.proto))!;
    const project = PROJECTS0.find(p => p.id === PROTOTYPE_LINKS0.find(l => l.prototypeId === resolved.proto)!.projectId)!;
    await expect(createTask(s.as(project.ownerId), { ...base, projectId: project.id, anomalyId: resolved.id })).rejects.toThrow("est résolue");
  });
  it("refuses an unknown responsible team", async () =>
    await expect(declareAnomaly(setup().as("U-AWA"), { ...anomaly, respTeamId: "T-XXX" })).rejects.toThrow("Équipe responsable introuvable"));
  it("refuses a team outside engineering", async () =>
    await expect(declareAnomaly(setup().as("U-AWA"), { ...anomaly, respTeamId: "T-SUP" })).rejects.toThrow("Équipe responsable introuvable"));
  it("names the anomaly owner after the chosen team", async () =>
    expect((await declareAnomaly(setup().as("U-AWA"), { ...anomaly, resp: "texte libre", respTeamId: "T-PRO" })).value.resp).toBe("Équipe Propulsion"));
});
