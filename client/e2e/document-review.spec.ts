import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("**/api/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === "/api/auth/user") return route.fulfill({ json: null });
    if (pathname === "/api/health") return route.fulfill({ json: { status: "ok" } });
    return route.fulfill({ json: [] });
  });
});

test("penelaah dokumen menganalisis topik lokal tanpa mengirim teks", async ({ page }) => {
  const outgoingBodies: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/")) {
      outgoingBodies.push(request.postData() ?? "");
    }
  });

  await page.goto("/bedah-dokumen");
  await expect(page.getByRole("heading", { name: /Tanpa mengirim dokumen/ })).toBeVisible();
  await expect(page.getByText(/tidak mengunggah atau menyimpan teks/i)).toBeVisible();

  const marker = "DOKUMEN-PRIBADI-UJI-2026";
  await page.getByLabel("Tempel isi dokumen di sini").fill(
    `${marker}. Para pihak menyepakati ruang lingkup pekerjaan. Nilai kontrak dibayar dengan termin. Jadwal pekerjaan menetapkan tanggal mulai.`,
  );
  await page.getByRole("button", { name: /Tinjau topik/ }).click();

  await expect(page.getByText("Topik pokok terdeteksi")).toBeVisible();
  await expect(page.getByText("Terdeteksi", { exact: true })).toHaveCount(4);
  await expect(page.getByText("Tidak terdeteksi", { exact: true })).toHaveCount(4);
  await expect(page.getByText(/Tidak terdeteksi bukan berarti topik tidak ada/)).toBeVisible();
  expect(outgoingBodies.some((body) => body.includes(marker))).toBe(false);

  await page.getByRole("button", { name: "Bersihkan" }).click();
  await expect(page.getByLabel("Tempel isi dokumen di sini")).toHaveValue("");
  await expect(page.getByText("Hasil akan tampil di sini")).toBeVisible();
});

test("penelaah dokumen membaca file teks lokal dan menolak format lain", async ({ page }) => {
  await page.goto("/bedah-dokumen");
  const fileInput = page.getByLabel("Pilih file teks");
  await fileInput.setInputFiles({
    name: "rencana-proyek.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("K3 dan keselamatan kerja menjadi perhatian. Serah terima dicatat."),
  });

  await expect(page.getByText("File lokal: rencana-proyek.txt")).toBeVisible();
  await page.getByRole("button", { name: /Tinjau topik/ }).click();
  await expect(page.getByRole("heading", { name: "Keselamatan kerja" })).toBeVisible();
  await expect(page.getByText("Terdeteksi", { exact: true })).toHaveCount(2);

  await fileInput.setInputFiles({
    name: "kontrak.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4"),
  });
  await expect(page.getByRole("alert")).toHaveText("Pilih file .txt atau .md.");
});
