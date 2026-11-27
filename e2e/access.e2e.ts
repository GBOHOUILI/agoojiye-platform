import { expect, test } from "@playwright/test";
import { openAs, switchTo } from "./helpers";

// The Administrator reads purchasing but cannot operate it. Each check is paired with the
// Purchasing profile seeing the same control, so an absent button really means "refused", not "broken page".
test("the Administrator consults purchasing without operating it", async ({ page }) => {
  const checks: [string, string, string[]][] = [
    ["/purchasing/requests/DA-2026-004", "Équipements de protection de l’équipe Essais", ["Saisir un devis"]],
    ["/purchasing/orders/BC-2026-0001", "Bon de commande BC-2026-0001", ["Réceptionner une livraison", "Saisir une facture"]],
    ["/purchasing/orders/BC-2026-0002", "Bon de commande BC-2026-0002", ["Transmettre à la Finance"]],
  ];
  await openAs(page, "U-ACH");
  for (const [path, heading, buttons] of checks) {
    await switchTo(page, "U-ACH", path);
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    for (const b of buttons) await expect(page.getByRole("button", { name: b }).first()).toBeVisible();
    await switchTo(page, "U-ADM", path);
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    for (const b of buttons) await expect(page.getByRole("button", { name: b })).toHaveCount(0);
  }
  await switchTo(page, "U-ADM", "/purchasing/suppliers");
  await expect(page.getByRole("button", { name: /Nouveau fournisseur/ })).toHaveCount(0);
  await switchTo(page, "U-ADM", "/settings");
  await expect(page.getByRole("button", { name: "Réinitialiser la démo" })).toBeVisible();
});
