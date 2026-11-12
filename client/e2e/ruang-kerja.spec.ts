import { expect, test } from "@playwright/test";

const USER = {
  id: 42,
  fullName: "Tenaga Ahli Uji",
  role: "tukang",
  onboardingCompleted: true,
};

test("Ruang Kerja hanya memuat alat KerjaProyek dan menyimpan checklist per akun", async ({ page }) => {
  await page.route("**/api/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === "/api/auth/user") return route.fulfill({ json: USER });
    if (pathname === "/api/notifications/unread-count") return route.fulfill({ json: { count: 0 } });
    if (pathname === "/api/health") return route.fulfill({ json: { status: "ok" } });
    return route.fulfill({ json: [] });
  });

  await page.goto("/ruang-kerja");

  await expect(page.getByRole("heading", { name: /Semua pekerjaan/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Temukan proyek/ })).toHaveAttribute("href", "/jobs");
  await expect(page.getByRole("link", { name: /Portofolio/ })).toHaveAttribute("href", "/portfolio");
  await expect(page.getByText(/bukan penetapan persyaratan resmi/i)).toBeVisible();
  await expect(page.locator('a[href*="gustafta"], a[href^="http"]')).toHaveCount(0);

  const firstCheckbox = page.getByRole("checkbox").first();
  await expect(firstCheckbox).not.toBeChecked();
  await firstCheckbox.check();
  await expect(firstCheckbox).toBeChecked();
  await expect(page.getByText("10%")).toBeVisible();

  await page.reload();
  await expect(page.getByRole("checkbox").first()).toBeChecked();

  await page.getByRole("button", { name: "Reset" }).click();
  await expect(page.getByRole("checkbox").first()).not.toBeChecked();
  await expect(page.getByText("0%")).toBeVisible();
});
