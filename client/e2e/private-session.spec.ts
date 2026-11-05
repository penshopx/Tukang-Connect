import { expect, test } from "@playwright/test";

const USER = {
  id: 42, fullName: "Pengguna Uji", role: "pelanggan", onboardingCompleted: true,
};
const PRIVATE_ROUTES = [
  "/contracts", "/contracts/1", "/contracts/1/brain", "/disputes",
  "/profile/edit", "/portfolio", "/my-jobs", "/jobs/create",
  "/jobs/1/brain", "/admin", "/onboarding",
];

test.describe("Perlindungan sesi halaman privat", () => {
  for (const path of PRIVATE_ROUTES) {
    test(`menunggu konfirmasi sesi dan mengalihkan tamu dari ${path}`, async ({ page }) => {
      const privateRequests: string[] = [];
      let resolveSession!: () => void;
      const sessionReady = new Promise<void>((resolve) => { resolveSession = resolve; });
      await page.route("**/api/**", async (route) => {
        const pathname = new URL(route.request().url()).pathname;
        if (pathname === "/api/auth/user") {
          await sessionReady;
          return route.fulfill({ json: null });
        }
        if (pathname !== "/api/health") privateRequests.push(pathname);
        return route.fulfill({ json: { status: "ok" } });
      });

      await page.goto(path);
      await expect(page.getByText("Memuat halaman...", { exact: true })).toBeVisible();
      expect(privateRequests).toEqual([]);
      resolveSession();
      await expect(page).toHaveURL(/\/login$/);
      await expect(page.getByRole("heading", { name: "Masuk ke Akun Anda" })).toBeVisible();
      expect(privateRequests).toEqual([]);
    });
  }

  test("menghapus data sengketa dan membatalkan request ketika sesi aktif kedaluwarsa", async ({ page }) => {
    let sessionChecks = 0;
    let shouldExpire = false;
    let expired = false;
    let sessionCleared = false;
    let aborted = false;
    let contractRequests = 0;
    let releaseContracts!: () => void;
    const delayedContracts = new Promise<void>((resolve) => { releaseContracts = resolve; });
    const requestsAfterExpiry: string[] = [];
    page.on("requestfailed", (request) => {
      if (new URL(request.url()).pathname === "/api/contracts") aborted = true;
    });
    await page.clock.install();
    await page.route("**/api/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path === "/api/auth/user") {
        sessionChecks++;
        expired = shouldExpire;
        return route.fulfill({ json: expired ? null : USER });
      }
      if (sessionCleared && path !== "/api/health") requestsAfterExpiry.push(path);
      if (path === "/api/contracts") {
        contractRequests++;
        await delayedContracts;
        return route.fulfill({ json: [] }).catch(() => {});
      }
      const json = path === "/api/disputes"
        ? [{ id: 1, status: "open", reason: "Sengketa rahasia pengguna sebelumnya", createdAt: "2026-01-01" }]
        : path === "/api/health" ? { status: "ok" }
        : path === "/api/notifications/unread-count" ? { count: 0 } : [];
      return route.fulfill({ json });
    });

    await page.goto("/disputes");
    await expect(page.getByText("Sengketa rahasia pengguna sebelumnya")).toBeVisible();
    await expect.poll(() => sessionChecks).toBeGreaterThanOrEqual(1);
    await expect.poll(() => contractRequests).toBeGreaterThanOrEqual(1);
    aborted = false;
    shouldExpire = true;
    await page.clock.fastForward(61_000);
    await expect(page).toHaveURL(/\/login$/);
    // A timer may start a request while the session response is still being
    // processed. Measure new requests after the client has cleared the session.
    sessionCleared = true;
    await expect(page.getByText("Sengketa rahasia pengguna sebelumnya")).toHaveCount(0);
    await expect.poll(() => aborted).toBe(true);
    releaseContracts();
    await page.clock.fastForward(120_000);
    expect(requestsAfterExpiry).toEqual([]);
    await page.goBack();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText("Sengketa rahasia pengguna sebelumnya")).toHaveCount(0);
    expect(requestsAfterExpiry).toEqual([]);
  });

  test("mengalihkan ke login saat request privat mendapat 401", async ({ page }) => {
    let portfolioRequests = 0;
    await page.clock.install();
    await page.route("**/api/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path === "/api/auth/user") return route.fulfill({ json: USER });
      if (path === "/api/portfolio") {
        portfolioRequests++;
        return route.fulfill({ status: 401, json: { error: "Unauthorized" } });
      }
      return route.fulfill({ json: path === "/api/health" ? { status: "ok" } : { count: 0 } });
    });
    await page.goto("/portfolio");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "Masuk ke Akun Anda" })).toBeVisible();
    // StrictMode can cancel an initial mount request. Only assert that the 401
    // does not trigger retries or polling after the session has been cleared.
    expect(portfolioRequests).toBeGreaterThanOrEqual(1);
    const requestsAtRedirect = portfolioRequests;
    await page.clock.fastForward(10_000);
    expect(portfolioRequests).toBe(requestsAtRedirect);
  });

  test("tidak menganggap gangguan verifikasi sesi sebagai logout", async ({ page }) => {
    let unavailable = true;
    const privateRequests: string[] = [];
    await page.route("**/api/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      if (path === "/api/auth/user") {
        return unavailable
          ? route.fulfill({ status: 503, json: { error: "Layanan sedang tidak tersedia" } })
          : route.fulfill({ json: USER });
      }
      if (path !== "/api/health") privateRequests.push(path);
      return route.fulfill({ json: path === "/api/health" ? { status: "ok" } : [] });
    });
    await page.goto("/contracts");
    await expect(page.getByText("Sesi belum dapat diverifikasi")).toBeVisible();
    await expect(page).toHaveURL(/\/contracts$/);
    expect(privateRequests).toEqual([]);
    unavailable = false;
    await page.getByRole("button", { name: "Coba lagi", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Kontrak Saya" })).toBeVisible();
    await expect.poll(() => privateRequests.includes("/api/contracts")).toBe(true);
  });
});
