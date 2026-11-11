import { expect, test } from "@playwright/test";

const OUTAGE_MESSAGE = "Layanan sedang tidak tersedia. Silakan tunggu sebentar dan coba lagi.";
const CALLBACK_OUTAGE_MESSAGE = "Database sedang tidak dapat dijangkau. Silakan tunggu sebentar dan coba lagi.";

test.describe("Pesan gangguan autentikasi", () => {
  test("menampilkan pesan layanan saat login menerima HTTP 503", async ({ page }) => {
    await page.route("**/api/login", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }

      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          code: "DB_UNAVAILABLE",
          error: "Layanan sedang tidak tersedia. Silakan coba lagi.",
        }),
      });
    });

    await page.goto("/login");
    await page.locator('input[name="email"]').fill("outage-login@example.com");
    await page.locator('input[name="password"]').fill("password123");
    await page.getByRole("button", { name: "Masuk", exact: true }).click();

    const formAlert = page.getByRole("main").locator('[role="alert"]');
    await expect(formAlert).toContainText("Layanan Tidak Tersedia");
    await expect(formAlert).toContainText(OUTAGE_MESSAGE);
    await expect(formAlert).not.toContainText("Gagal masuk");
  });

  test("menampilkan pesan layanan saat pendaftaran menerima HTTP 503", async ({ page }) => {
    await page.route("**/api/register", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }

      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          code: "DB_UNAVAILABLE",
          error: "Layanan sedang tidak tersedia. Silakan coba lagi.",
        }),
      });
    });

    await page.goto("/register");
    await page.locator('input[name="name"]').fill("Pengguna Gangguan");
    await page.locator('input[name="username"]').fill("pengguna-gangguan");
    await page.locator('input[name="email"]').fill("outage-register@example.com");
    await page.locator('input[name="password"]').fill("password123");
    await page.getByRole("button", { name: "Daftar Sekarang", exact: true }).click();

    const formAlert = page.getByRole("main").locator('[role="alert"]');
    await expect(formAlert).toContainText("Layanan Tidak Tersedia");
    await expect(formAlert).toContainText(OUTAGE_MESSAGE);
    await expect(formAlert).not.toContainText("Gagal daftar");
  });

  test("menampilkan pesan database dari callback tanpa pesan login gagal", async ({ page }) => {
    await page.goto("/login?error=db_unavailable");

    const formAlert = page.getByRole("main").locator('[role="alert"]');
    await expect(formAlert).toContainText("Layanan Tidak Tersedia");
    await expect(formAlert).toContainText(CALLBACK_OUTAGE_MESSAGE);
    await expect(formAlert).not.toContainText("Gagal masuk");
  });
});