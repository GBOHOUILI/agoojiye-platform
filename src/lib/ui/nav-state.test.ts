import { describe, expect, it } from "vitest";
import { activeGroup, DEFAULT_PREFS, openWith, parsePrefs, toggleGroup } from "./nav-state";

const groups = [
  { title: "Pilotage", items: [{ href: "/projects" }, { href: "/tasks" }] },
  { title: "Achats", items: [{ href: "/purchasing", exact: true }, { href: "/purchasing/orders" }] },
];

describe("sidebar state", () => {
  it("finds the group of the current page, including detail pages", () => {
    expect(activeGroup("/tasks/TSK-001", groups)).toBe("Pilotage");
    expect(activeGroup("/purchasing/orders/BC-2026-0001", groups)).toBe("Achats");
    expect(activeGroup("/purchasing", groups)).toBe("Achats");
    expect(activeGroup("/espace", groups)).toBeUndefined();
  });
  it("reads preferences safely", () => {
    expect(parsePrefs(null)).toEqual(DEFAULT_PREFS);
    expect(parsePrefs("{oops")).toEqual(DEFAULT_PREFS);
    expect(parsePrefs(JSON.stringify({ density: "confortable", autoOpen: false, openGroups: ["Achats", "Pilotage"] }))).toEqual({ density: "confortable", autoOpen: false, openGroups: ["Achats", "Pilotage"] });
    expect(parsePrefs(JSON.stringify({ density: "énorme", autoOpen: "oui" }))).toEqual(DEFAULT_PREFS);
  });
  it("keeps the group opened under the previous single-group format", () =>
    expect(parsePrefs(JSON.stringify({ density: "compacte", autoOpen: true, openGroup: "Achats" })).openGroups).toEqual(["Achats"]));
  it("opening a group never closes the others; only the user closes a group", () => {
    expect(toggleGroup(["Pilotage"], "Achats")).toEqual(["Pilotage", "Achats"]);
    expect(toggleGroup(["Pilotage", "Achats"], "Pilotage")).toEqual(["Achats"]);
    expect(openWith(["Pilotage"], "Achats")).toEqual(["Pilotage", "Achats"]);
    expect(openWith(["Pilotage"], "Pilotage")).toEqual(["Pilotage"]);
  });
});
