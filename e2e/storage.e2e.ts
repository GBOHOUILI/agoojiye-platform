import { expect, test } from "@playwright/test";
import { openAs } from "./helpers";

const V3 = "agj-demo-next-v3", V2 = "agj-demo-next-v2";

// A phase 2 browser (v2 data only) is migrated on first load: its data are kept, purchasing is added,
// and the v2 key is never modified.
test("v2 data are migrated to v3 without touching the v2 key", async ({ page }) => {
  await openAs(page, "U-DIR", "/espace");
  const v2 = await page.evaluate(([v3Key, v2Key]) => {
    const d = JSON.parse(localStorage.getItem(v3Key)!);
    for (const k of ["suppliers", "purchaseRequests", "quotes", "purchaseOrders", "receipts", "invoices"]) delete d[k];
    d.version = 2;
    d.validations = d.validations.filter((v: { subjectType: string }) => v.subjectType === "task");
    d.tasks[0].title = "Tâche conservée depuis la v2";
    const raw = JSON.stringify(d);
    localStorage.setItem(v2Key, raw);
    localStorage.removeItem(v3Key);
    return { raw, taskId: d.tasks[0].id as string };
  }, [V3, V2]);

  await page.goto(`/tasks/${v2.taskId}`);
  await expect(page.getByRole("heading", { name: "Tâche conservée depuis la v2" })).toBeVisible();
  await page.goto("/purchasing/requests/DA-2026-007");
  await expect(page.getByRole("heading", { name: "Disques et plaquettes de frein FRE-001" })).toBeVisible();

  const after = await page.evaluate(([v3Key, v2Key]) => ({ v2: localStorage.getItem(v2Key), v3: JSON.parse(localStorage.getItem(v3Key) ?? "null")?.version }), [V3, V2]);
  expect(after.v2).toBe(v2.raw);
  expect(after.v3).toBe(3);
});

test("an action survives a reload and the admin reset restores the initial data", async ({ page }) => {
  await openAs(page, "U-QUA", "/notifications");
  const before = await page.evaluate(k => JSON.parse(localStorage.getItem(k)!).notifications.filter((n: { recipientId: string; readAt?: string }) => n.recipientId === "U-QUA" && !n.readAt).length, V3);
  expect(before).toBeGreaterThan(0);
  await page.getByRole("button", { name: /Tout marquer comme lu/ }).click();
  await page.reload();
  const unread = () => page.evaluate(k => JSON.parse(localStorage.getItem(k)!).notifications.filter((n: { recipientId: string; readAt?: string }) => n.recipientId === "U-QUA" && !n.readAt).length, V3);
  await expect.poll(unread).toBe(0);

  await page.evaluate(() => localStorage.setItem("agj-demo-session", "U-ADM"));
  await page.goto("/settings");
  page.once("dialog", d => void d.accept());
  await page.getByRole("button", { name: "Réinitialiser la démo" }).click();
  await expect.poll(unread).toBe(before);
});
