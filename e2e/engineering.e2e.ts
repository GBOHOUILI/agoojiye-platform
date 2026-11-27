import { expect, test } from "@playwright/test";
import { openAs } from "./helpers";

// Lot 3: a corrective action of an anomaly becomes a task of the prototype's project, and it survives a reload.
test("a corrective task is created from an anomaly and persists", async ({ page }) => {
  await openAs(page, "U-NAD", "/anomalies/ANO-002");
  const section = page.locator(".card", { has: page.getByRole("heading", { name: "Tâches correctives" }) });
  await expect(section.getByRole("link", { name: /TSK-009/ })).toBeVisible();

  await section.getByRole("button", { name: "Créer une tâche corrective" }).click();
  const form = page.getByRole("dialog");
  await expect(form.getByText("Action corrective de ANO-002")).toBeVisible();
  await expect(form.locator("#tf-project")).toBeDisabled();
  await form.locator("#tf-title").fill("Contrôler le montage des disques après remplacement");
  await form.locator("#tf-due").fill("2030-01-15");
  await form.getByRole("button", { name: "Créer la tâche" }).click();
  await expect(form).toBeHidden();

  const created = section.getByRole("link", { name: /Contrôler le montage des disques/ });
  await expect(created).toBeVisible();
  await page.reload();
  await expect(created).toBeVisible();
  await created.click();
  await expect(page.getByText("Action corrective de l’anomalie")).toBeVisible();
  await expect(page.getByRole("link", { name: "ANO-002" })).toHaveAttribute("href", "/anomalies/ANO-002");
});
