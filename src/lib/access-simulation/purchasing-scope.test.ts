import { describe, expect, it } from "vitest";
import { canSeeOrder, canSeeRequest } from "./purchasing-scope";
import { hasPermission } from "./permissions";
import { routePermission } from "./routes";
import { USERS0 } from "@/data/seed-org";
import { SYSTEM_ROLES, type PurchaseRequest } from "@/types";

const u = (id: string) => USERS0.find(x => x.id === id)!;
const role = (r: (typeof SYSTEM_ROLES)[number]) => ({ systemRole: r }) as never;
const req = { id: "DA-2026-099", requesterId: "U-KOF", projectId: "PRJ-02" } as PurchaseRequest;
const scope = { projects: [{ id: "PRJ-02", ownerId: "U-NAD" } as never], validations: [{ subjectType: "purchase_request", subjectId: "DA-2026-099", validatorId: "U-FIN" } as never] };

describe("purchasing permissions", () => {
  it("every role may request a purchase", () => SYSTEM_ROLES.forEach(r => expect(hasPermission(role(r), "purchase:request")).toBe(true)));
  it("only purchasing records quotes, orders and invoices", () => {
    for (const p of ["purchase:quote", "purchase:order", "purchase:invoice"] as const)
      expect(SYSTEM_ROLES.filter(r => r !== "ADMIN" && hasPermission(role(r), p))).toEqual(["PURCHASING"]);
  });
  it("reception is open to the operational roles", () =>
    expect(SYSTEM_ROLES.filter(r => r !== "ADMIN" && hasPermission(role(r), "purchase:receive")).sort()).toEqual(["ENGINEER", "PURCHASING", "TEAM_LEAD", "TECHNICIAN"]));
  it("approval permissions belong to finance and director only", () => {
    expect(SYSTEM_ROLES.filter(r => r !== "ADMIN" && hasPermission(role(r), "purchase:approve_finance"))).toEqual(["FINANCE"]);
    expect(SYSTEM_ROLES.filter(r => r !== "ADMIN" && hasPermission(role(r), "purchase:approve_direction"))).toEqual(["DIRECTOR"]);
  });
  it("request visibility: requester, project owner, designated validator, read_all", () => {
    expect(canSeeRequest(u("U-KOF"), req, scope)).toBe(true);
    expect(canSeeRequest(u("U-NAD"), req, scope)).toBe(true);
    expect(canSeeRequest(u("U-FIN"), req, scope)).toBe(true);
    expect(canSeeRequest(u("U-ACH"), req, scope)).toBe(true);
    expect(canSeeRequest(u("U-AWA"), req, scope)).toBe(false);
  });
  it("receivers only see open orders of others (I-5)", () => {
    const closed = { id: "BC-Y", requestId: "DA-2026-099", status: "Clôturé" } as never;
    expect(canSeeOrder(u("U-MAG"), closed, req, scope)).toBe(false);
    expect(canSeeOrder(u("U-KOF"), closed, req, scope)).toBe(true);
  });
  it("receivers see orders (to receive them) without seeing other requests", () => {
    const order = { id: "BC-X", requestId: "DA-2026-099", status: "Émis" } as never;
    expect(canSeeOrder(u("U-MAG"), order, req, scope)).toBe(true);
    expect(canSeeRequest(u("U-MAG"), req, scope)).toBe(false);
    expect(canSeeOrder(u("U-RH"), order, req, scope)).toBe(false);
    expect(canSeeOrder(u("U-KOF"), order, req, scope)).toBe(true);
  });
  it("routes", () => {
    expect(routePermission("/purchasing/requests/DA-2026-001")).toBe("purchase:request");
    expect(routePermission("/purchasing/orders/BC-2026-0001")).toBe("purchase:request");
    expect(routePermission("/purchasing/suppliers")).toBe("purchase:read_all");
    expect(routePermission("/purchasing")).toBe("purchase:read_all");
  });
});
