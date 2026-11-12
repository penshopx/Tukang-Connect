import { describe, expect, it } from "vitest";
import { DOCUMENT_TEXT_LIMIT, reviewDocumentText } from "./documentReview";

describe("reviewDocumentText", () => {
  it("marks project topics that are explicitly mentioned without judging completeness", () => {
    const result = reviewDocumentText(
      "Para pihak menyepakati ruang lingkup pekerjaan dan spesifikasi. Nilai kontrak dibayar dengan termin. Jadwal pekerjaan mencantumkan tanggal mulai.",
    );

    expect(result.coreFound).toBe(4);
    expect(result.coreTotal).toBe(4);
    expect(result.checks.find((check) => check.id === "parties")?.found).toBe(true);
    expect(result.checks.find((check) => check.id === "payment")?.found).toBe(true);
    expect(result.needsAttention).toBe(4);
  });

  it("leaves every topic unconfirmed for empty or unrelated text", () => {
    const result = reviewDocumentText("Catatan rapat internal.");

    expect(result.coreFound).toBe(0);
    expect(result.needsAttention).toBe(8);
    expect(result.words).toBe(3);
    expect(reviewDocumentText("").words).toBe(0);
  });

  it("limits analysis input to the configured character ceiling", () => {
    const result = reviewDocumentText("x".repeat(DOCUMENT_TEXT_LIMIT + 25));

    expect(result.characters).toBe(DOCUMENT_TEXT_LIMIT);
  });

  it("recognizes added work, safety, acceptance, and dispute topics", () => {
    const result = reviewDocumentText(
      "Addendum mengatur pekerjaan tambah, K3 dan alat pelindung diri, serah terima, serta mediasi perselisihan.",
    );

    expect(result.checks.filter((check) => check.group === "tambahan" && check.found).map((check) => check.id))
      .toEqual(["changes", "safety", "acceptance", "dispute"]);
  });
});
