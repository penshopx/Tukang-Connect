import { expect, test, type Page, type Route } from "@playwright/test";

const owner = {
  id: 42,
  username: "budi",
  fullName: "Budi Pemilik",
  email: "budi@example.com",
  role: "pelanggan",
  onboardingCompleted: true,
};

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function mockJobCreateApis(page: Page, failedEndpoints: string[] = []) {
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/auth/user") return fulfillJson(route, owner);
    if (url.pathname === "/api/health") return fulfillJson(route, { status: "ok" });
    if (failedEndpoints.includes(url.pathname)) {
      return fulfillJson(route, { error: "Simulasi layanan AI gagal" }, 503);
    }
    if (url.pathname === "/api/agents/price-suggest") {
      return fulfillJson(route, {
        agent: "PricingAgent",
        category: "Renovasi",
        location: "Jakarta",
        locationMultiplier: 1.35,
        baseMin: "1500000",
        baseMax: "4000000",
        adjustedMin: "2025000",
        adjustedMid: "3375000",
        adjustedMax: "5400000",
        unit: "per m²",
        tips: ["Harga belum termasuk material."],
      });
    }
    if (url.pathname === "/api/agents/milestones") {
      return fulfillJson(route, {
        agent: "MilestoneAgent",
        category: "Renovasi",
        budget: "10000000",
        milestones: [{
          title: "Pekerjaan Awal",
          description: "Persiapan dan mobilisasi",
          amount: "2500000",
          percentage: 25,
          estimatedDays: 3,
          dueDate: "2026-12-01",
        }],
      });
    }
    return fulfillJson(route, []);
  });
}

test.describe("Respons AI tampil sebagai data JSON", () => {
  test("menampilkan saran harga dan milestone pada form proyek", async ({ page }) => {
    await mockJobCreateApis(page);
    await page.goto("/jobs/create");

    await page.getByRole("combobox").click();
    await page.getByRole("option", { name: "Renovasi" }).click();
    await page.locator('input[placeholder="Contoh: Jakarta Selatan"]').fill("Jakarta");
    await page.locator('input[inputmode="numeric"]').fill("10000000");

    await page.getByRole("button", { name: "Saran Harga Pasar" }).click();
    await expect(page.getByText("Saran Harga: Renovasi di Jakarta")).toBeVisible();
    await expect(page.getByText("Rp 3.375.000", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Generate Milestone Otomatis" }).click();
    await expect(page.getByText("Pekerjaan Awal")).toBeVisible();
    await expect(page.getByText("Persiapan dan mobilisasi")).toBeVisible();
  });

  test("menampilkan error API, bukan menyamarkannya sebagai hasil kosong", async ({ page }) => {
    await mockJobCreateApis(page, ["/api/agents/price-suggest", "/api/agents/milestones"]);
    await page.goto("/jobs/create");

    await page.getByRole("combobox").click();
    await page.getByRole("option", { name: "Renovasi" }).click();
    await page.locator('input[placeholder="Contoh: Jakarta Selatan"]').fill("Jakarta");
    await page.locator('input[inputmode="numeric"]').fill("10000000");

    await page.getByRole("button", { name: "Saran Harga Pasar" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Saran harga belum dapat dimuat." })).toBeVisible();

    await page.getByRole("button", { name: "Generate Milestone Otomatis" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Milestone belum dapat dibuat." })).toBeVisible();
  });

  test("menampilkan isi rekomendasi pada dashboard", async ({ page }) => {
    await page.route("**/api/**", async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === "/api/auth/user") return fulfillJson(route, owner);
      if (url.pathname === "/api/health") return fulfillJson(route, { status: "ok" });
      if (url.pathname === "/api/agents/insights") {
        return fulfillJson(route, {
          userId: owner.id,
          role: owner.role,
          insights: [{
            type: "applications",
            title: "Lamaran baru perlu ditinjau",
            message: "Ada kandidat yang menunggu keputusan Anda.",
            priority: "medium",
          }],
          generatedAt: "2026-11-11T00:00:00.000Z",
        });
      }
      if (url.pathname === "/api/notifications/unread-count") return fulfillJson(route, { count: 0 });
      return fulfillJson(route, []);
    });

    await page.goto("/dashboard");

    await expect(page.getByText("Lamaran baru perlu ditinjau")).toBeVisible();
    await expect(page.getByText("Ada kandidat yang menunggu keputusan Anda.")).toBeVisible();
  });

  test("menampilkan kandidat ranking, bukan objek Response", async ({ page }) => {
    await page.route("**/api/**", async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === "/api/auth/user") return fulfillJson(route, owner);
      if (url.pathname === "/api/health") return fulfillJson(route, { status: "ok" });
      if (url.pathname === "/api/jobs/1") {
        return fulfillJson(route, {
          id: 1,
          clientId: owner.id,
          workerId: null,
          title: "Renovasi rumah",
          description: "Perbaikan dapur dan ruang keluarga",
          category: "Renovasi",
          location: "Jakarta",
          budget: "10000000",
          status: "open",
          createdAt: "2026-11-10T00:00:00.000Z",
          deadline: null,
        });
      }
      if (url.pathname === "/api/jobs/1/applications") {
        return fulfillJson(route, [{
          id: 7,
          applicantId: 51,
          status: "pending",
          createdAt: "2026-11-10T00:00:00.000Z",
          applicant: { fullName: "Siti Ahli", profile: null },
        }]);
      }
      if (url.pathname === "/api/jobs/1/messages") return fulfillJson(route, []);
      if (url.pathname === "/api/agents/match/1") return fulfillJson(route, { results: [] });
      if (url.pathname === "/api/agents/rank-applications/1") {
        return fulfillJson(route, {
          agent: "ApplicationRankingAgent",
          jobId: 1,
          ranked: [{
            applicationId: 7,
            applicantId: 51,
            applicantName: "Siti Ahli",
            profile: null,
            totalScore: 72,
            breakdown: { rating: 18, experience: 12, budgetFit: 20, kkni: 7, verified: 15 },
            badge: "Top Pick",
            proposedBudget: "9000000",
            message: "Berpengalaman mengerjakan renovasi",
            createdAt: "2026-11-10T00:00:00.000Z",
          }],
        });
      }
      return fulfillJson(route, []);
    });

    await page.goto("/jobs/1");
    await page.getByRole("tab", { name: /Ranking AI/ }).click();

    await expect(page.getByText("Siti Ahli")).toBeVisible();
    await expect(page.getByText("72")).toBeVisible();
    await expect(page.getByText("Top Pick")).toBeVisible();
  });
});
