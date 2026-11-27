import { expect, type Page } from "@playwright/test";

/** Opens `path` as the simulated profile `userId`, on a fresh demo (empty storage = initial fictitious data). */
export async function openAs(page: Page, userId: string, path = "/espace") {
  await page.goto("/espace");
  await page.evaluate(id => localStorage.setItem("agj-demo-session", id), userId);
  await page.goto(path);
  await expect(page.locator("main")).toBeVisible();
}

/** Switches profile while keeping the stored demo data. */
export async function switchTo(page: Page, userId: string, path: string) {
  await page.evaluate(id => localStorage.setItem("agj-demo-session", id), userId);
  await page.goto(path);
}
