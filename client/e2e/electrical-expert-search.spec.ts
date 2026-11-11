import { expect, test } from "@playwright/test";

test("filter spesialis listrik mengirim pencarian ke direktori tenaga ahli", async ({ page }) => {
  const expertSearches: Array<string | null> = [];

  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/experts") {
      expertSearches.push(url.searchParams.get("search"));
      return route.fulfill({ json: [] });
    }
    if (url.pathname === "/api/auth/user") return route.fulfill({ json: null });
    if (url.pathname === "/api/health") return route.fulfill({ json: { status: "ok" } });
    return route.fulfill({ json: [] });
  });

  await page.goto("/experts");
  await expect(page.getByRole("heading", { name: "Cari Tenaga Ahli" })).toBeVisible();
  await page.getByRole("button", { name: "K3 Listrik", exact: true }).click();

  await expect.poll(() => expertSearches).toContain("K3 Listrik");
  await expect(page.getByText("Tidak ada tenaga ahli ditemukan")).toBeVisible();
});
