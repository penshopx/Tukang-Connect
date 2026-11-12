export type ReviewGroup = "pokok" | "tambahan";

export interface DocumentReviewCheck {
  id: string;
  title: string;
  group: ReviewGroup;
  found: boolean;
  detail: string;
}

export interface DocumentReviewResult {
  characters: number;
  words: number;
  checks: DocumentReviewCheck[];
  coreFound: number;
  coreTotal: number;
  needsAttention: number;
}

export const DOCUMENT_TEXT_LIMIT = 50_000;
export const DOCUMENT_FILE_LIMIT = 1_000_000;

const CHECK_DEFINITIONS: Array<{
  id: string;
  title: string;
  group: ReviewGroup;
  detail: string;
  pattern: RegExp;
}> = [
  {
    id: "parties",
    title: "Identitas para pihak",
    group: "pokok",
    detail: "Pastikan pihak yang terlibat, peran, dan kontaknya tertulis dengan jelas.",
    pattern: /\b(para pihak|pihak pertama|pihak kedua|pemberi kerja|penyedia jasa|pemilik proyek|kontraktor|pelaksana)\b/i,
  },
  {
    id: "scope",
    title: "Ruang lingkup pekerjaan",
    group: "pokok",
    detail: "Periksa uraian pekerjaan, batas lingkup, spesifikasi, dan hasil yang diminta.",
    pattern: /\b(ruang lingkup|lingkup pekerjaan|uraian pekerjaan|spesifikasi pekerjaan|volume pekerjaan|hasil pekerjaan)\b/i,
  },
  {
    id: "payment",
    title: "Nilai dan pembayaran",
    group: "pokok",
    detail: "Cocokkan nilai, termin atau cara bayar, waktu pembayaran, dan syaratnya.",
    pattern: /\b(nilai kontrak|nilai pekerjaan|biaya pekerjaan|harga pekerjaan|pembayaran|termin pembayaran|termin|uang muka|down payment)\b/i,
  },
  {
    id: "schedule",
    title: "Jadwal dan jangka waktu",
    group: "pokok",
    detail: "Pastikan tanggal mulai, durasi, target, dan ketentuan perubahan jadwal ditinjau.",
    pattern: /\b(jangka waktu|durasi pekerjaan|jadwal pekerjaan|tanggal mulai|tanggal selesai|target penyelesaian|batas waktu)\b/i,
  },
  {
    id: "changes",
    title: "Perubahan pekerjaan",
    group: "tambahan",
    detail: "Perjelas cara menyetujui perubahan lingkup, biaya, atau waktu.",
    pattern: /\b(perubahan pekerjaan|perubahan lingkup|pekerjaan tambah|pekerjaan kurang|addendum|instruksi perubahan)\b/i,
  },
  {
    id: "safety",
    title: "Keselamatan kerja",
    group: "tambahan",
    detail: "Tinjau pembagian tanggung jawab keselamatan dan prosedur lapangan yang relevan.",
    pattern: /\b(k3|keselamatan kerja|alat pelindung diri|apd|rencana keselamatan|prosedur keselamatan)\b/i,
  },
  {
    id: "acceptance",
    title: "Mutu dan serah terima",
    group: "tambahan",
    detail: "Periksa kriteria hasil, pemeriksaan, serah terima, dan masa pemeliharaan bila diperlukan.",
    pattern: /\b(kriteria penerimaan|pemeriksaan hasil|serah terima|berita acara|masa pemeliharaan|garansi pekerjaan)\b/i,
  },
  {
    id: "dispute",
    title: "Penanganan perselisihan",
    group: "tambahan",
    detail: "Tandai mekanisme komunikasi dan penyelesaian masalah untuk ditinjau bersama.",
    pattern: /\b(perselisihan|sengketa|mediasi|penyelesaian sengketa|pemutusan kontrak|wanprestasi)\b/i,
  },
];

export function reviewDocumentText(input: string): DocumentReviewResult {
  const text = input.slice(0, DOCUMENT_TEXT_LIMIT);
  const normalized = text.toLocaleLowerCase("id");
  const checks = CHECK_DEFINITIONS.map(({ pattern, ...check }) => ({
    ...check,
    found: pattern.test(normalized),
  }));
  const coreChecks = checks.filter((check) => check.group === "pokok");
  const coreFound = coreChecks.filter((check) => check.found).length;

  return {
    characters: text.length,
    words: text.trim() ? text.trim().split(/\s+/u).length : 0,
    checks,
    coreFound,
    coreTotal: coreChecks.length,
    needsAttention: checks.filter((check) => !check.found).length,
  };
}
