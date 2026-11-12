import { expect, test } from "@playwright/test";

test("Gustafta directory searches services and clearly labels external destinations", async ({ page }) => {
  await page.goto("/ekosistem");

  await expect(page.getByRole("heading", { name: /Ekosistem konstruksi/ })).toBeVisible();
  await expect(page.getByText("20 layanan ditemukan")).toBeVisible();
  await expect(page.getByText(/tidak terintegrasi ke dalam KerjaProyek/i)).toBeVisible();

  const bimtekLink = page.locator('a[href="https://bimtek-skk.gustafta.my.id/"]');
  await expect(bimtekLink).toHaveAttribute("target", "_blank");
  await expect(bimtekLink).toHaveAttribute("rel", "noopener noreferrer");
  await expect(bimtekLink).toHaveAttribute("aria-label", "Bimtek SKK, situs eksternal");

  await page.getByRole("searchbox", { name: "Cari layanan Gustafta" }).fill("Bimtek SKK");
  await expect(page.getByText(/1 layanan ditemukan/)).toBeVisible();
  await expect(bimtekLink).toBeVisible();
  await expect(page.getByText("Ruang Proyek Portfolio")).toHaveCount(0);

  await page.getByRole("button", { name: "Hapus pencarian" }).click();
  await page.getByRole("button", { name: /Administrasi & dokumen/ }).click();
  await expect(page.getByText(/6 layanan ditemukan/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "LKPM" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Ebook" })).toHaveCount(0);
});
