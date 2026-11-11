import { expect, test } from "@playwright/test";

test("materi ketenagalistrikan dapat ditemukan dan dibuka", async ({ page }) => {
  await page.goto("/study-materials");

  await expect(page.getByRole("heading", { name: "Materi Belajar Konstruksi" })).toBeVisible();
  await page.getByRole("button", { name: "Filter", exact: true }).click();
  await page.getByRole("button", { name: "Ketenagalistrikan", exact: true }).click();

  const moduleCards = page.getByTestId("materials-grid").getByRole("heading", { level: 3 });
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

test("rekomendasi materi menjelaskan kecocokan dengan keahlian profil", async ({ page }) => {
  await page.route("**/api/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === "/api/auth/user") {
      return route.fulfill({
        json: { id: 42, fullName: "Tenaga Ahli Uji", role: "tukang", onboardingCompleted: true },
      });
    }
    if (pathname === "/api/me") {
      return route.fulfill({
        json: {
          id: 42,
          profile: { skills: ["K3 Listrik"], kkniLevel: "Level 4 - Supervisor" },
        },
      });
    }
    if (pathname === "/api/notifications/unread-count") return route.fulfill({ json: { count: 0 } });
    return route.fulfill({ json: [] });
  });

  await page.goto("/study-materials");
  const recommendations = page.getByRole("region", { name: "Rekomendasi untuk Anda" });
  await expect(recommendations.getByText("Berdasarkan keahlian: K3 Listrik").first()).toBeVisible();
  await expect(
    recommendations.getByRole("heading", { name: "Instalasi Pemanfaatan, K3 & Pengujian Listrik" }),
  ).toBeVisible();
  await expect(
    recommendations.getByText("Sesuai level profil: Level 4 - Supervisor").first(),
  ).toBeVisible();
});

test("profil tanpa keahlian mendapat tautan untuk melengkapi profil", async ({ page }) => {
  await page.route("**/api/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === "/api/auth/user") {
      return route.fulfill({
        json: { id: 42, fullName: "Tenaga Ahli Uji", role: "tukang", onboardingCompleted: true },
      });
    }
    if (pathname === "/api/me") {
      return route.fulfill({
        json: { id: 42, profile: { skills: [], kkniLevel: null } },
      });
    }
    if (pathname === "/api/notifications/unread-count") return route.fulfill({ json: { count: 0 } });
    return route.fulfill({ json: [] });
  });

  await page.goto("/study-materials");
  const recommendations = page.getByRole("region", { name: "Rekomendasi untuk Anda" });
  const profileLink = recommendations.getByRole("link", { name: "Lengkapi keahlian profil" });
  await expect(profileLink).toHaveAttribute("href", "/profile/edit");
  await expect(
    recommendations.getByText("Profil Anda belum mencantumkan keahlian; berikut materi dasar untuk memulai."),
  ).toBeVisible();
});

test("rekomendasi menggabungkan beberapa keahlian tanpa mengulang materi", async ({ page }) => {
  await page.route("**/api/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === "/api/auth/user") {
      return route.fulfill({
        json: { id: 42, fullName: "Tenaga Ahli Uji", role: "tukang", onboardingCompleted: true },
      });
    }
    if (pathname === "/api/me") {
      return route.fulfill({
        json: { id: 42, profile: { skills: ["K3 Listrik", "Beton"], kkniLevel: null } },
      });
    }
    if (pathname === "/api/notifications/unread-count") return route.fulfill({ json: { count: 0 } });
    return route.fulfill({ json: [] });
  });

  await page.goto("/study-materials");
  const recommendations = page.getByRole("region", { name: "Rekomendasi untuk Anda" });
  await expect(recommendations.getByText("Berdasarkan keahlian: K3 Listrik").first()).toBeVisible();
  await expect(recommendations.getByText("Berdasarkan keahlian: Beton")).toBeVisible();
  await expect(
    recommendations.getByRole("heading", { name: "Instalasi Listrik Bangunan Hunian (PUIL 2011)" }),
  ).toBeVisible();
  await expect(
    recommendations.getByRole("heading", { name: "Teknik Pembesian & Pengecoran Beton" }),
  ).toBeVisible();
});
