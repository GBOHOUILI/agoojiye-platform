import { expect, test, type Page } from "@playwright/test";
import { openAs, switchTo } from "./helpers";

// Demo scenario, steps 5 to 10: from the technician's need to the invoice handed over to Finance.
test("the full purchasing circuit, with segregation of duties", async ({ page }) => {
  test.setTimeout(120_000);
  const dialog = page.getByRole("dialog");

  // 5. Espérance (technician) requests 6 brake discs at 120 000 FCFA HT on PRJ-02.
  await openAs(page, "U-ESP", "/purchasing/requests");
  await page.getByRole("button", { name: "Nouvelle demande" }).click();
  await dialog.locator("#rf-title").fill("Disques de frein de remplacement AG-02");
  await dialog.locator("#rf-just").fill("Remplacement des disques après l’essai de freinage TES-003 (ANO-002).");
  await dialog.locator("#rf-need").fill("2030-02-01");
  await dialog.locator("#rf-proj").selectOption("PRJ-02");
  await dialog.getByLabel("Désignation ligne 1").fill("Disque de frein ventilé");
  await dialog.getByLabel("Quantité ligne 1").fill("6");
  await dialog.getByLabel("Unité ligne 1").fill("pièce");
  await dialog.getByLabel("Prix unitaire estimé HT ligne 1").fill("120000");
  await dialog.getByRole("button", { name: "Enregistrer et soumettre" }).click();
  await page.waitForURL(/\/purchasing\/requests\/DA-/);
  const requestUrl = new URL(page.url()).pathname;

  // 6. Nadia (project manager) then Olivier (Finance) approve; the Director cannot decide in their place.
  await switchTo(page, "U-DIR", requestUrl);
  await expect(page.getByRole("heading", { name: "Disques de frein de remplacement AG-02" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Approuver/ })).toHaveCount(0);
  for (const approver of ["U-NAD", "U-FIN"]) {
    await switchTo(page, approver, requestUrl);
    await page.getByRole("button", { name: /Approuver/ }).click();
    await expect(page.getByRole("button", { name: /Approuver/ })).toHaveCount(0);
  }

  // 7. Josiane (Purchasing) records two quotes, keeps the cheaper one and issues the order.
  await switchTo(page, "U-ACH", requestUrl);
  for (const [ref, price] of [["DEV-FREIN-A", "118000"], ["DEV-FREIN-B", "125000"]]) {
    await page.getByRole("button", { name: "Saisir un devis" }).click();
    await dialog.locator("#qf-sup").selectOption({ index: ref.endsWith("A") ? 0 : 1 });
    await dialog.locator("#qf-ref").fill(ref);
    await dialog.locator("#qf-val").fill("2030-03-01");
    await dialog.locator("#qf-L1").fill(price);
    await dialog.getByRole("button", { name: "Enregistrer le devis" }).click();
    await expect(dialog).toBeHidden();
  }
  await page.getByRole("button", { name: "Retenir" }).first().click();
  await page.getByRole("button", { name: "Confirmer le choix" }).click();
  await page.getByRole("button", { name: "Émettre le bon de commande" }).click();
  await dialog.locator("#of-date").fill("2030-02-15");
  await dialog.getByRole("button", { name: "Émettre le bon de commande" }).click();
  // Issuing the order opens it.
  await page.waitForURL(/\/purchasing\/orders\/BC-/);
  const orderUrl = new URL(page.url()).pathname;
  // 6 × 118 000 = 708 000 HT, VAT 18 % = 127 440, TTC 835 440.
  await expect(page.getByText(/835\s440/).first()).toBeVisible();

  // 8. Ulrich (storekeeper) receives 6 discs: 5 accepted, 1 rejected.
  await switchTo(page, "U-MAG", orderUrl);
  await page.getByRole("button", { name: "Réceptionner une livraison" }).click();
  await dialog.locator("#rc-ref").fill("BL-FREIN-01");
  await dialog.locator("#rc-r-0").fill("6");
  await dialog.locator("#rc-a-0").fill("5");
  await dialog.locator("#rc-j-0").fill("1");
  await dialog.locator("#rc-m-0").fill("Voile au contrôle");
  await dialog.getByRole("button", { name: "Enregistrer la réception" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Partiellement reçu").first()).toBeVisible();

  // 9. Josiane records an invoice at the wrong price (dispute), corrects it, then hands it to Finance.
  await switchTo(page, "U-ACH", orderUrl);
  await invoice(page, "FV-FREIN-001", "120000");
  await expect(page.getByText("En litige").first()).toBeVisible();
  await page.getByRole("button", { name: "Corriger" }).click();
  // The corrected supplier invoice carries a new TTC: 5 accepted × 118 000 = 590 000 HT, 696 200 TTC.
  await dialog.getByLabel(/Prix unitaire facturé/).fill("118000");
  await dialog.locator("#if-ttc").fill("696200");
  await dialog.getByRole("button", { name: "Enregistrer la correction" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Conforme").first()).toBeVisible();
  await page.getByRole("button", { name: "Transmettre à la Finance" }).click();
  await expect(page.getByText("Transmise à la Finance").first()).toBeVisible();

  // 10. Olivier (Finance) sees the transmitted invoice in his space.
  await switchTo(page, "U-FIN", "/finance");
  await expect(page.locator(".card", { hasText: "Factures transmises par les Achats" }).getByText(/FV-FREIN-001/)).toBeVisible();
});

async function invoice(page: Page, no: string, unitPrice: string) {
  const dialog = page.getByRole("dialog");
  await page.getByRole("button", { name: "Saisir une facture" }).click();
  await dialog.locator("#if-no").fill(no);
  await dialog.locator("#if-due").fill("2030-03-15");
  await dialog.getByLabel(/Prix unitaire facturé/).fill(unitPrice);
  await dialog.getByRole("button", { name: "Enregistrer la facture" }).click();
  await expect(dialog).toBeHidden();
}
