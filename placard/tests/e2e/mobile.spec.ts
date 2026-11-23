import { expect, test } from "@playwright/test";
import { createItem, expectNoHorizontalScroll, register } from "./helpers";

test("sur téléphone : aucune page ne défile horizontalement et le parcours reste utilisable", async ({ page }) => {
  await page.goto("/");
  await expectNoHorizontalScroll(page);
  await page.goto("/conditions");
  await expectNoHorizontalScroll(page);
  await register(page, "mobile");
  await expectNoHorizontalScroll(page);
  await createItem(page, { kind: "veste en jean très longue description de type", brand: "Marque", size: "M", purchase: "12" });
  await expectNoHorizontalScroll(page);
  await page.getByRole("tab", { name: "Vestiaire Collective" }).click();
  await expect(page.getByRole("tabpanel")).toContainText("Vestiaire Collective contrôle l'authenticité");
  await expectNoHorizontalScroll(page);
  await page.goto("/app");
  await expectNoHorizontalScroll(page);
  await page.goto("/app/compte");
  await expectNoHorizontalScroll(page);
});
