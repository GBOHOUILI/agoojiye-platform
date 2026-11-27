import { expect, test } from "@playwright/test";
import { openAs, switchTo } from "./helpers";

// Demo scenario, steps 1 to 4 and 11 (steps 5 to 10 are replayed by purchasing.e2e.ts).
test("demo scenario: direction overview, project, test to anomaly, corrective task, journal", async ({ page }) => {
  const main = page.locator("main");

  // 1. Hervé (Director): organisation-wide overview, then the organisation chart.
  await openAs(page, "U-DIR", "/espace");
  for (const block of ["Projets à surveiller", "Anomalies critiques et élevées"]) await expect(main.getByText(block).first()).toBeVisible();
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Synthèse ingénierie" })).toBeVisible();
  await page.goto("/organization");
  await expect(page.getByRole("heading", { name: "Organisation" })).toBeVisible();
  await expect(main.getByText("Ingénierie").filter({ visible: true }).first()).toBeVisible();

  // 2. PRJ-02: computed progress, prototype AG-02, purchasing tab with the committed amount.
  await page.goto("/projects/PRJ-02");
  await page.getByRole("tab", { name: "Prototypes" }).click();
  await expect(main.getByRole("link", { name: /AG-02/ }).first()).toBeVisible();
  await page.getByRole("tab", { name: /Achats/ }).click();
  await expect(main.getByText(/Engagé/).first()).toBeVisible();
  await page.goto("/prototypes/AG-02");
  await expect(main.getByText("Avancement technique").first()).toBeVisible();
  await expect(main.getByText("Avancement du projet PRJ-02")).toBeVisible();

  // 3. Test TES-003 (8,4 m for a 7,5 m target) leads to the critical anomaly ANO-002.
  await page.goto("/tests/TES-003");
  await expect(main.getByText(/8[,.]4/).first()).toBeVisible();
  await main.getByRole("link", { name: /ANO-002/ }).first().click();
  await page.waitForURL(/\/anomalies\/ANO-002/);
  await expect(main.getByText("Critique").first()).toBeVisible();
  await expect(main.getByText(/Analyser et corriger le composant/)).toHaveCount(0); // A1: no generated placeholder

  // 4. Nadia (project manager) creates the corrective task from ANO-002 for Espérance, validated by Ségla.
  await switchTo(page, "U-NAD", "/anomalies/ANO-002");
  await page.getByRole("button", { name: "Créer une tâche corrective" }).click();
  const form = page.getByRole("dialog");
  await form.locator("#tf-title").fill("Contrôler le montage des disques après remplacement");
  await form.locator("#tf-due").fill("2030-01-15");
  await form.locator("#tf-assignee").selectOption("U-ESP");
  await form.locator("#tf-validator").selectOption("U-SEG");
  await form.getByRole("button", { name: "Créer la tâche" }).click();
  await expect(form).toBeHidden();
  await expect(main.getByRole("link", { name: /Contrôler le montage des disques/ })).toBeVisible();

  // Espérance is notified (start of step 5).
  await switchTo(page, "U-ESP", "/notifications");
  await expect(main.getByText(/Contrôler le montage des disques/).first()).toBeVisible();

  // 11. The Director's journal shows the action with its real author.
  await switchTo(page, "U-DIR", "/activity");
  await expect(main.getByText(/Nadia Sossou a créé la tâche .* « Contrôler le montage des disques après remplacement », action corrective de ANO-002/)).toBeVisible();
});
