import { expect, test } from "@playwright/test";

test("materi ketenagalistrikan dapat ditemukan dan dibuka", async ({ page }) => {
  await page.goto("/study-materials");

  await expect(page.getByRole("heading", { name: "Materi Belajar Konstruksi" })).toBeVisible();
  await page.getByRole("button", { name: "Filter", exact: true }).click();
  await page.getByRole("button", { name: "Ketenagalistrikan", exact: true }).click();

  const moduleCards = page.getByRole("main").getByRole("heading", { level: 3 });
  await expect(moduleCards).toHaveCount(6);
  await expect(page.getByRole("heading", { name: "Peta Dokumen SBUJPTL dan IUJPTL" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Pembangkitan Tenaga Listrik & EBT" })).toBeVisible();

  await page.getByRole("heading", { name: "Pengenalan Usaha Jasa Penunjang Tenaga Listrik" }).click();
  await expect(page.getByText(/tidak mencantumkan daftar keenam jenisnya/i)).toBeVisible();
  await expect(page.getByText(/tidak mengklaim sebagai daftar klasifikasi resmi/i)).toBeVisible();
});

test("progres materi yang selesai tetap tersimpan setelah halaman dimuat ulang", async ({ page }) => {
  await page.goto("/study-materials");
  await page.getByRole("heading", { name: "Instalasi Listrik Bangunan Hunian (PUIL 2011)" }).click();
  await page.getByRole("button", { name: "Tandai Selesai" }).click();
  await expect(page.getByRole("button", { name: "Sudah Dipelajari" })).toBeVisible();

  await page.reload();
  await expect(page.getByText("1/18 selesai dipelajari")).toBeVisible();
  await page.getByRole("heading", { name: "Instalasi Listrik Bangunan Hunian (PUIL 2011)" }).click();
  await expect(page.getByRole("button", { name: "Sudah Dipelajari" })).toBeVisible();
});
