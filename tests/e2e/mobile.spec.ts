import { test, expect } from "@playwright/test";
import { expectNoHorizontalScroll, trackErrors } from "./helpers";

for (const path of ["/", "/vols", "/hotels", "/inspiration", "/destinations/lisbonne", "/communaute", "/assistant", "/compte/connexion"]) {
  test(`mobile : ${path} tient dans l'écran`, async ({ page }) => {
    const errors = trackErrors(page);
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expect(page.getByRole("navigation", { name: "Navigation mobile" })).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test("mobile : la barre de navigation mène aux sections", async ({ page }) => {
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Navigation mobile" });
  await nav.getByRole("link", { name: "Vols" }).click();
  await expect(page).toHaveURL(/\/vols/);
  await nav.getByRole("link", { name: "Où partir" }).click();
  await expect(page).toHaveURL(/\/inspiration/);
});
