import { expect, test } from "@playwright/test";

const AUTHENTICATED_USER = {
  id: 42,
  fullName: "Budi Pemilik",
  email: "budi@example.com",
  role: "pelanggan",
  onboardingCompleted: true,
};

test.describe("Sesi dashboard", () => {
  test("mengembalikan pengguna ke halaman login setelah logout tanpa memuat ulang dashboard", async ({ page }) => {
    let authenticated = true;

    await page.route("**/api/auth/user", async (route) => {
      if (authenticated) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(AUTHENTICATED_USER),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: "null",
        });
      }
    });

    await page.route("**/api/logout", async (route) => {
      authenticated = false;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /Selamat siang|Selamat sore|Selamat malam|Selamat pagi/ })).toBeVisible();

    await page.locator("nav button").filter({ hasText: "Budi" }).click();
    await page.getByRole("button", { name: "Keluar" }).click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "Masuk ke Akun Anda" })).toBeVisible();
    await expect(page).not.toHaveURL(/dashboard/);
  });

  test("mengalihkan session yang kedaluwarsa dari dashboard ke login", async ({ page }) => {
    await page.route("**/api/auth/user", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "null",
      });
    });

    await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.locator('[role="alert"]')).toContainText("Sesi Berakhir");
    await expect(page.locator('[role="alert"]')).toContainText("Sesi Anda telah berakhir");
  });
});