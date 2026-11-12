import { expect, test } from "@playwright/test";

test("external job board directs users to the active project marketplace", async ({ page }) => {
  await page.goto("/job-board");

  await expect(
    page.getByRole("heading", { name: "Lowongan eksternal sementara dinonaktifkan" }),
  ).toBeVisible();
  await expect(page.getByText(/masa berlaku dan tautan aslinya/i)).toBeVisible();
  await page.getByRole("button", { name: /lihat proyek tersedia/i }).click();
  await expect(page).toHaveURL(/\/jobs$/);
});

test("unverified training schedules direct users to active learning tools", async ({ page }) => {
  await page.goto("/bimtek");

  await expect(page.getByRole("heading", { name: "Jadwal Bimtek sedang ditinjau" })).toBeVisible();
  await page.getByRole("button", { name: "Buka materi belajar" }).click();
  await expect(page).toHaveURL(/\/study-materials$/);
});
