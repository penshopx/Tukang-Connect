import { expect, test } from "@playwright/test";

test("renders chatbot input as text instead of executable HTML", async ({ page }) => {
  await page.goto("/chatbot");

  const initialScriptCount = await page.locator("script").count();
  const payload = '<img src=x onerror="window.__chatbotXss = true"><script>window.__chatbotXss = true</script>';
  await page.getByPlaceholder("Tanya teknis, harga, fitur platform, K3, SNI...").fill(payload);
  await page.getByRole("button", { name: /kirim/i }).click();

  await expect(page.getByText(payload, { exact: true })).toBeVisible();
  await expect(page.locator("img[src='x']")).toHaveCount(0);
  await expect(page.locator("script")).toHaveCount(initialScriptCount);
  expect(await page.evaluate(() => (window as Window & { __chatbotXss?: boolean }).__chatbotXss)).toBeFalsy();

  const initialStrongCount = await page.locator("strong").count();
  const initialBreakCount = await page.locator("br").count();
  await page.getByPlaceholder("Tanya teknis, harga, fitur platform, K3, SNI...").fill("halo");
  await page.getByRole("button", { name: /kirim/i }).click();
  await expect(page.getByText("Apa yang bisa saya bantu hari ini?")).toBeVisible();
  expect(await page.locator("strong").count()).toBeGreaterThan(initialStrongCount);
  expect(await page.locator("br").count()).toBeGreaterThan(initialBreakCount);
});