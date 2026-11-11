import { expect, test } from "@playwright/test";

const USER = {
  id: 42,
  fullName: "Tenaga Ahli Uji",
  role: "tukang",
  onboardingCompleted: true,
};

const PORTFOLIO = [
  {
    id: 1,
    userId: USER.id,
    title: "Renovasi Rumah",
    description: "Perbaikan dapur keluarga",
    category: "Renovasi",
    completedAt: "2025-12-20",
    clientName: "Keluarga Santoso",
  },
  {
    id: 2,
    userId: USER.id,
    title: "Instalasi Kantor",
    description: "Panel listrik dan penerangan",
    category: "Listrik",
    completedAt: "2026-03-12",
    clientName: null,
  },
];

test("Ruang Proyek dapat mencari dan menyaring portofolio", async ({ page }) => {
  await page.route("**/api/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === "/api/auth/user") return route.fulfill({ json: USER });
    if (pathname === "/api/portfolio") return route.fulfill({ json: PORTFOLIO });
    if (pathname === "/api/notifications/unread-count") return route.fulfill({ json: { count: 0 } });
    if (pathname === "/api/health") return route.fulfill({ json: { status: "ok" } });
    return route.fulfill({ json: [] });
  });

  await page.goto("/portfolio");
  await expect(page.getByRole("heading", { name: "Ruang Proyek" })).toBeVisible();
  await expect(page.getByText("Menampilkan 2 dari 2 proyek")).toBeVisible();
  await expect(page.getByText("Instalasi Kantor", { exact: true })).toBeVisible();
  await expect(page.getByText("Renovasi Rumah", { exact: true })).toBeVisible();

  await page.getByRole("textbox", { name: "Cari proyek" }).fill("penerangan");
  await expect(page.getByText("Menampilkan 1 dari 2 proyek")).toBeVisible();
  await expect(page.getByText("Instalasi Kantor", { exact: true })).toBeVisible();
  await expect(page.getByText("Renovasi Rumah", { exact: true })).toHaveCount(0);

  await page.getByRole("textbox", { name: "Cari proyek" }).fill("");
  await page.getByRole("combobox", { name: "Filter kategori" }).click();
  await page.getByRole("option", { name: "Renovasi", exact: true }).click();
  await expect(page.getByText("Menampilkan 1 dari 2 proyek")).toBeVisible();
  await expect(page.getByText("Renovasi Rumah", { exact: true })).toBeVisible();
  await expect(page.getByText("Instalasi Kantor", { exact: true })).toHaveCount(0);

  await page.getByRole("textbox", { name: "Cari proyek" }).fill("tidak ditemukan");
  await expect(page.getByText("Proyek tidak ditemukan")).toBeVisible();
  await page.getByRole("button", { name: "Hapus filter" }).click();
  await expect(page.getByText("Menampilkan 2 dari 2 proyek")).toBeVisible();
});
