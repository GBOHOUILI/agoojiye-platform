import { expect, test } from "@playwright/test";
import { openAs, switchTo } from "./helpers";

const ROUTES: [user: string, path: string][] = [
  ["U-DIR", "/espace"], ["U-DIR", "/dashboard"], ["U-DIR", "/projects"], ["U-DIR", "/projects/PRJ-02"], ["U-DIR", "/tasks"],
  ["U-DIR", "/validations"], ["U-DIR", "/notifications"], ["U-DIR", "/activity"], ["U-DIR", "/organization"],
  ["U-DIR", "/prototypes/AG-02"], ["U-DIR", "/tests/TES-003"], ["U-DIR", "/anomalies"], ["U-NAD", "/anomalies/ANO-002"],
  ["U-ACH", "/purchasing"], ["U-ACH", "/purchasing/requests/DA-2026-007"], ["U-ACH", "/purchasing/orders/BC-2026-0004"],
  ["U-ACH", "/purchasing/invoices"], ["U-ACH", "/purchasing/reports"], ["U-ADM", "/admin"], ["U-ADM", "/settings"],
];

// No page may scroll horizontally on a phone, a tablet or a laptop.
for (const [width, height] of [[375, 667], [768, 1024], [1280, 800]]) {
  test(`no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await openAs(page, "U-DIR");
    const overflowing: string[] = [];
    for (const [user, path] of ROUTES) {
      await switchTo(page, user, path);
      await expect(page.locator("main")).toBeVisible();
      await page.waitForLoadState("networkidle");
      const extra = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (extra > 0) overflowing.push(`${path} (+${extra}px)`);
    }
    expect(overflowing).toEqual([]);
  });
}
