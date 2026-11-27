import { expect, test, type Page } from "@playwright/test";
import { openAs } from "./helpers";

// Dates are fixed when the demo is seeded. Reopening it days later, or in another tab, never moves them,
// and the read-only test stays on the time base of the stored anomaly it revealed.
const dmy = (s: string) => { const [d, m, y] = s.split("/"); return `${y}-${m}-${d}`; };
const declaredOn = async (page: Page) => dmy((await page.getByText(/déclarée le \d{2}\/\d{2}\/\d{4}/).innerText()).match(/\d{2}\/\d{2}\/\d{4}/)![0]);
const testedOn = async (page: Page) => dmy((await page.getByText(/version .* · \d{2}\/\d{2}\/\d{4}/).first().innerText()).match(/\d{2}\/\d{2}\/\d{4}/)![0]);

test("dates stay put when the demo is reopened on a later day", async ({ page }) => {
  await page.clock.setFixedTime(new Date("2027-01-10T09:00:00Z"));
  await openAs(page, "U-DIR", "/tests/TES-003");
  const test1 = await testedOn(page);
  await page.goto("/anomalies/ANO-002");
  const ano1 = await declaredOn(page);
  expect(ano1 >= test1).toBe(true); // the anomaly comes from the test, never before it

  await page.clock.setFixedTime(new Date("2027-01-20T09:00:00Z"));
  await page.reload();
  expect(await declaredOn(page)).toBe(ano1);
  await page.goto("/tests/TES-003");
  expect(await testedOn(page)).toBe(test1);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("agj-demo-next-v3")!).seedOffsetDays)).toBe(45);
});

test("an action in one tab appears in another tab without reloading", async ({ context, page }) => {
  await openAs(page, "U-QUA", "/notifications");
  const other = await context.newPage();
  await other.goto("/notifications");
  const unread = other.getByRole("button", { name: /Tout marquer comme lu/ });
  await expect(unread).toBeEnabled();
  await page.getByRole("button", { name: /Tout marquer comme lu/ }).click();
  await expect(unread).toBeDisabled();
});
