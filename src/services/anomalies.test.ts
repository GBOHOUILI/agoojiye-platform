import { describe, expect, it } from "vitest";
import { applyStatut, buildAnomaly } from "./anomalies.service";
import { addNoteCommand, changeAnomalyStatus, declareAnomaly } from "./anomalies.commands";
import { ANOS0 } from "@/data/seed";
import { LocalDatabase } from "@/repositories/local/database";
import { createLocalRepositories } from "@/repositories/local";
import { USERS0 } from "@/data/seed-org";

const now = () => "2026-11-26T10:00:00.000Z";
const input = { titre: "Bruit roulement", proto: "AG-01", comp: "MOT-001", g: "Élevée" as const, resp: "Équipe essais" };
const user = (role: string) => USERS0.find(u => u.systemRole === role)!;

describe("anomalies backward compatibility", () => {
  it("keeps legacy default author", () => {
    expect(buildAnomaly(ANOS0, input).tl[0].by).toBe("Utilisateur démo");
    expect(applyStatut(ANOS0[0], "En analyse", "").tl.at(-1)?.by).toBe("Utilisateur démo");
  });
  it("keeps sequential ANO id", () => expect(buildAnomaly(ANOS0, input).id).toBe("ANO-009"));
  it("never reuses an id when ids are not contiguous (migrated data)", () =>
    expect(buildAnomaly([{ ...ANOS0[0], id: "ANO-077" }], input).id).toBe("ANO-078"));
});

describe("anomaly commands", () => {
  const setup = () => createLocalRepositories(new LocalDatabase(null), now);
  const tech = user("TECHNICIAN"), eng = user("ENGINEER");
  it("declares with real author and emits incident.reported", async () => {
    const repos = setup();
    const r = await declareAnomaly({ repos, actor: tech, now }, input);
    expect(r.value.reporterId).toBe(tech.id);
    expect(r.value.tl[0].by).toBe(`${tech.firstName} ${tech.lastName}`);
    expect(r.events[0].type).toBe("incident.reported");
    expect((await repos.anomalies.list())[0].id).toBe(r.value.id);
  });
  it("persists the prebuilt anomaly as-is (same id)", async () => {
    const repos = setup();
    const pre = buildAnomaly(ANOS0, input, "X", tech.id);
    expect((await declareAnomaly({ repos, actor: tech, now }, input, pre)).value.id).toBe(pre.id);
  });
  it("technician cannot change status (simulation)", async () =>
    await expect(changeAnomalyStatus({ repos: setup(), actor: tech, now }, "ANO-001", "Action corrective", "")).rejects.toThrow("non autorisée"));
  it("engineer changes status with real author and event", async () => {
    const r = await changeAnomalyStatus({ repos: setup(), actor: eng, now }, "ANO-001", "Action corrective", "ok");
    expect(r.value.tl.at(-1)?.by).toBe(`${eng.firstName} ${eng.lastName}`);
    expect(r.events[0]).toMatchObject({ type: "incident.status_changed", from: "En analyse" });
  });
  it("finance cannot add notes", async () =>
    await expect(addNoteCommand({ repos: setup(), actor: user("FINANCE"), now }, "TES-001", "obs")).rejects.toThrow("non autorisée"));
  it("never overwrites an existing anomaly when the prebuilt id is already taken", async () => {
    const repos = setup();
    const pre = buildAnomaly(ANOS0, input, "X", tech.id); // ANO-009
    await declareAnomaly({ repos, actor: tech, now }, input, pre);
    const second = await declareAnomaly({ repos, actor: tech, now }, { ...input, titre: "Deuxième déclaration" }, { ...pre, titre: "Deuxième déclaration" });
    expect(second.value.id).toBe("ANO-010");
    const all = await repos.anomalies.list();
    expect(all.find(a => a.id === "ANO-009")?.titre).toBe("Bruit roulement");
  });
});
