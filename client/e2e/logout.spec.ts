import { expect, test } from "@playwright/test";

test.describe("Logout", () => {
  test("mengarah ke login dan tidak memicu 401 setelah sesi dihapus", async ({ page }) => {
    let loggedOut = false;
    let delayedMilestoneRequestAborted = false;
    let resolveMilestoneRequestStarted: () => void = () => {};
    const milestoneRequestStarted = new Promise<void>((resolve) => {
      resolveMilestoneRequestStarted = resolve;
    });
    const unauthorizedAfterLogout: string[] = [];

    page.on("requestfailed", (request) => {
      if (new URL(request.url()).pathname === "/api/dashboard/milestones") {
        delayedMilestoneRequestAborted = true;
      }
    });
    page.on("response", (response) => {
      if (loggedOut && response.status() === 401) {
        unauthorizedAfterLogout.push(new URL(response.url()).pathname);
      }
    });

    await page.route("**/api/**", async (route) => {
      const requestUrl = new URL(route.request().url());
      const path = requestUrl.pathname;

      if (path === "/api/logout") {
        loggedOut = true;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true }),
        });
        return;
      }

      if (path === "/api/dashboard/milestones") {
        resolveMilestoneRequestStarted();
        await new Promise((resolve) => setTimeout(resolve, 1500));
        await route.fulfill({
          status: loggedOut ? 401 : 200,
          contentType: "application/json",
          body: JSON.stringify(loggedOut ? { error: "Unauthorized" } : []),
        }).catch(() => {});
        return;
      }

      if (path === "/api/auth/user" && loggedOut) {
        unauthorizedAfterLogout.push(path);
        await route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({ error: "Unauthorized" }),
        });
        return;
      }

      if (loggedOut) {
        // Any authenticated dashboard request made after logout would be a
        // regression, even if the UI happens to hide its error.
        const authenticatedPaths = new Set([
          "/api/notifications",
          "/api/notifications/unread-count",
          "/api/contracts",
          "/api/analytics/summary",
          "/api/dashboard/milestones",
          "/api/agents/insights",
        ]);
        if (authenticatedPaths.has(path)) {
          unauthorizedAfterLogout.push(path);
          await route.fulfill({
            status: 401,
            contentType: "application/json",
            body: JSON.stringify({ error: "Unauthorized" }),
          });
          return;
        }
      }

      if (path === "/api/auth/user") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: 42,
            fullName: "Pengguna Uji",
            email: "pengguna-uji@example.com",
            role: "pelanggan",
            onboardingCompleted: true,
          }),
        });
        return;
      }

      const body = path === "/api/health"
        ? { status: "ok" }
        : path === "/api/notifications/unread-count"
          ? { count: 0 }
        : path === "/api/analytics/summary"
          ? {}
          : [];
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    });

    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /Selamat .*Pengguna/ })).toBeVisible();
    await milestoneRequestStarted;

    await page.getByRole("button", { name: "Buka menu pengguna Pengguna Uji" }).click();
    await page.getByRole("button", { name: "Keluar" }).click();

    await expect(page).toHaveURL(/\/login$/);
    await expect.poll(() => delayedMilestoneRequestAborted).toBe(true);
    expect(unauthorizedAfterLogout).toEqual([]);
  });
});