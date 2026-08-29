import { expect, test } from "@playwright/test";

test.describe("Panduan password pendaftaran", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/register");
  });

  test("menampilkan aturan dan status password yang konsisten", async ({ page }) => {
    const password = page.locator('input[name="password"]');
    const hint = page.locator("#register-password-hint");

    await expect(hint).toHaveText("Minimal 8 karakter.");

    await password.fill("1234567");
    await expect(hint).toHaveText("Masih kurang 1 karakter (minimal 8 karakter).");
    await expect(password).toHaveAttribute("aria-invalid", "true");

    await password.fill("12345678");
    await expect(hint).toHaveText("Password memenuhi syarat minimum.");
    await expect(password).toHaveAttribute("aria-invalid", "false");
  });

  test("menolak password yang hanya berisi spasi tanpa mengirim pendaftaran", async ({ page }) => {
    const registerRequests: string[] = [];
    page.on("request", (request) => {
      if (request.method() === "POST" && request.url().endsWith("/api/register")) {
        registerRequests.push(request.url());
      }
    });

    await page.locator('input[name="name"]').fill("Pengguna Uji");
    await page.locator('input[name="username"]').fill("pengguna-uji-password");
    await page.locator('input[name="email"]').fill("pengguna-uji-password@example.com");
    await page.locator('input[name="password"]').fill("        ");
    await page.getByRole("button", { name: "Daftar Sekarang" }).click();

    await expect(page.locator("#register-password-hint")).toHaveText(
      "Password tidak boleh hanya berisi spasi."
    );
    await expect(page.locator('[role="alert"]')).toContainText("Password belum memenuhi syarat");
    await expect.poll(() => registerRequests).toHaveLength(0);
  });
});