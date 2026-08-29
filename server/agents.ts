import { storage } from "./storage.js";
import type { Job, Profile } from "../shared/types.js";
import {
  addMoney,
  allocateMoneyPercentage,
  compareMoney,
  formatIdrInteger,
  moneyToBigInt,
  multiplyMoney,
  scaleMoney,
  type Money,
  type MoneyLike,
} from "../shared/money.js";

const LOCATION_MAP: Record<string, string> = {
  "jakarta selatan": "jakarta", "jakarta utara": "jakarta", "jakarta barat": "jakarta",
  "jakarta timur": "jakarta", "jakarta pusat": "jakarta",
  "bandung": "jawa barat", "depok": "jawa barat", "bogor": "jawa barat", "bekasi": "jawa barat",
  "surabaya": "jawa timur", "malang": "jawa timur", "sidoarjo": "jawa timur",
  "yogyakarta": "diy", "sleman": "diy", "bantul": "diy",
  "medan": "sumatera utara", "deli serdang": "sumatera utara",
  "semarang": "jawa tengah", "solo": "jawa tengah",
  "makassar": "sulawesi selatan", "gowa": "sulawesi selatan",
  "denpasar": "bali", "badung": "bali",
};

const CATEGORY_SKILL_MAP: Record<string, string[]> = {
  "Renovasi": ["Tukang Batu", "Renovasi Rumah", "Tukang Cat Bangunan Gedung", "Tukang Kayu", "Pemasangan Keramik"],
  "Konstruksi Baru": ["Tukang Besi Beton", "Mandor Konstruksi", "Beton", "Pondasi", "Konstruksi Gedung"],
  "Listrik": ["Instalasi Listrik"],
  "Plambing": ["Plumbing & Pipa", "Drainase"],
  "Pengecatan": ["Tukang Cat Bangunan Gedung", "Pengecatan", "Renovasi Rumah"],
  "Lantai": ["Pemasangan Keramik", "Tukang Batu"],
  "Atap": ["Pemasangan Atap", "Tukang Kayu Konstruksi"],
  "Pondasi": ["Pondasi", "Beton", "Tukang Besi Beton", "Mandor Pekerjaan Beton"],
  "Interior": ["Tukang Kayu", "Pengecatan", "Pemasangan Keramik", "Renovasi Rumah"],
  "Arsitektur": ["Arsitektur", "Sipil"],
  "Las": ["Tukang Las Listrik", "Tukang Las Konstruksi"],
  "Kayu": ["Tukang Kayu", "Tukang Kayu Konstruksi"],
  "Batu & Bata": ["Tukang Batu", "Pemasangan Dinding"],
  "Beton": ["Beton", "Tukang Besi Beton", "Mandor Pekerjaan Beton"],
  "Sipil": ["Sipil", "Drainase", "Pondasi", "Beton"],
  "Lainnya": [],
};

const PRICE_BASE: Record<string, { min: number; mid: number; max: number; unit: string }> = {
  "Renovasi":         { min: 1_500_000, mid: 2_500_000, max: 4_000_000, unit: "per m²" },
  "Konstruksi Baru":  { min: 3_000_000, mid: 4_500_000, max: 7_000_000, unit: "per m²" },
  "Listrik":          { min: 500_000,   mid: 1_000_000, max: 2_500_000, unit: "per titik" },
  "Plambing":         { min: 800_000,   mid: 1_500_000, max: 3_000_000, unit: "per titik" },
  "Pengecatan":       { min: 40_000,    mid: 70_000,    max: 120_000,   unit: "per m²" },
  "Lantai":           { min: 150_000,   mid: 250_000,   max: 450_000,   unit: "per m²" },
  "Atap":             { min: 200_000,   mid: 350_000,   max: 600_000,   unit: "per m²" },
  "Pondasi":          { min: 2_000_000, mid: 3_500_000, max: 6_000_000, unit: "per m lari" },
  "Interior":         { min: 500_000,   mid: 1_200_000, max: 3_000_000, unit: "per m²" },
  "Arsitektur":       { min: 100_000,   mid: 200_000,   max: 400_000,   unit: "per m² (jasa desain)" },
  "Las":              { min: 300_000,   mid: 600_000,   max: 1_200_000, unit: "per meter las" },
  "Kayu":             { min: 400_000,   mid: 800_000,   max: 1_500_000, unit: "per m²" },
  "Batu & Bata":      { min: 180_000,   mid: 280_000,   max: 500_000,   unit: "per m²" },
  "Beton":            { min: 800_000,   mid: 1_400_000, max: 2_500_000, unit: "per m³" },
  "Sipil":            { min: 2_500_000, mid: 4_000_000, max: 8_000_000, unit: "per m²" },
  "Lainnya":          { min: 500_000,   mid: 1_000_000, max: 3_000_000, unit: "per unit" },
};

const LOCATION_MULTIPLIER_PERCENT: Record<string, number> = {
  "jakarta": 135, "bali": 120, "surabaya": 110, "bandung": 105,
  "semarang": 100, "yogyakarta": 95, "medan": 95,
  "makassar": 90, "jawa barat": 100, "jawa timur": 100,
  "jawa tengah": 95, "diy": 95, "sumatera utara": 90,
};

const MILESTONE_TEMPLATES: Record<string, Array<{ title: string; pct: number; desc: string; days: number }>> = {
  "Renovasi": [
    { title: "Uang Muka & Persiapan", pct: 20, desc: "Pembayaran uang muka, persiapan material, pembongkaran ringan.", days: 3 },
    { title: "Pekerjaan Utama Tahap 1", pct: 30, desc: "Pekerjaan struktur, bata, plesteran/acian.", days: 14 },
    { title: "Pekerjaan Utama Tahap 2", pct: 30, desc: "Pemasangan keramik, instalasi, kusen.", days: 14 },
    { title: "Finishing & Pengecatan", pct: 15, desc: "Pengecatan, detail finishing, pembersihan.", days: 7 },
    { title: "Serah Terima", pct: 5, desc: "Inspeksi akhir, serah terima proyek.", days: 2 },
  ],
  "Konstruksi Baru": [
    { title: "Uang Muka & Mobilisasi", pct: 15, desc: "DP, mobilisasi alat dan tenaga, pekerjaan persiapan.", days: 5 },
    { title: "Pekerjaan Pondasi", pct: 20, desc: "Galian, pondasi, sloof.", days: 21 },
    { title: "Pekerjaan Struktur", pct: 25, desc: "Kolom, balok, lantai, dak beton.", days: 30 },
    { title: "Pekerjaan Dinding & Atap", pct: 20, desc: "Pasang dinding bata, kuda-kuda, atap.", days: 21 },
    { title: "Pekerjaan MEP & Finishing", pct: 15, desc: "Listrik, plumbing, plesteran, cat.", days: 21 },
    { title: "Serah Terima", pct: 5, desc: "Inspeksi akhir, punchlist, serah terima.", days: 5 },
  ],
  "Pengecatan": [
    { title: "Uang Muka & Material", pct: 25, desc: "DP, pembelian cat dan material persiapan.", days: 2 },
    { title: "Persiapan Permukaan", pct: 20, desc: "Amplas, plamir, plamur, dempul.", days: 3 },
    { title: "Pengecatan Dasar & Lapisan 1", pct: 30, desc: "Cat dasar, lapisan pertama.", days: 5 },
    { title: "Finishing & Lapisan Akhir", pct: 20, desc: "Lapisan akhir, sentuhan detail.", days: 3 },
    { title: "Serah Terima", pct: 5, desc: "Pembersihan dan serah terima.", days: 1 },
  ],
  "Listrik": [
    { title: "Uang Muka & Material", pct: 30, desc: "DP, pembelian material kabel, saklar, stopkontak.", days: 2 },
    { title: "Pemasangan Jalur Kabel", pct: 35, desc: "Instalasi konduit dan penarikan kabel.", days: 5 },
    { title: "Pemasangan Komponen", pct: 25, desc: "Pasang saklar, stopkontak, lampu, panel.", days: 3 },
    { title: "Uji Coba & Serah Terima", pct: 10, desc: "Testing, commissioning, serah terima.", days: 1 },
  ],
  "Pondasi": [
    { title: "Uang Muka & Persiapan", pct: 20, desc: "DP, mobilisasi, pemasangan profil/bowplank.", days: 3 },
    { title: "Pekerjaan Galian", pct: 20, desc: "Galian tanah sesuai gambar.", days: 7 },
    { title: "Pekerjaan Pondasi", pct: 40, desc: "Pasang batu kali/cor pondasi.", days: 14 },
    { title: "Sloof & Pengurugan", pct: 15, desc: "Sloof beton, pengurugan, pemadatan.", days: 7 },
    { title: "Serah Terima", pct: 5, desc: "Inspeksi dan serah terima.", days: 1 },
  ],
};

function getDefaultMilestones(_budget: MoneyLike): Array<{ title: string; pct: number; desc: string; days: number }> {
  return [
    { title: "Uang Muka", pct: 25, desc: "Pembayaran uang muka dimulainya pekerjaan.", days: 3 },
    { title: "Progres 50%", pct: 40, desc: "Pekerjaan mencapai 50% sesuai scope.", days: 14 },
    { title: "Progres 80%", pct: 25, desc: "Pekerjaan mencapai 80%, memasuki finishing.", days: 10 },
    { title: "Serah Terima", pct: 10, desc: "Pekerjaan selesai, inspeksi, serah terima.", days: 2 },
  ];
}

function getProvince(location: string): string {
  const loc = location.toLowerCase();
  for (const [city, prov] of Object.entries(LOCATION_MAP)) {
    if (loc.includes(city)) return prov;
  }
  return loc;
}

function locationScore(jobLoc: string, workerLoc: string): number {
  if (!workerLoc) return 0;
  const jLoc = jobLoc.toLowerCase();
  const wLoc = workerLoc.toLowerCase();
  if (jLoc === wLoc) return 20;
  if (jLoc.includes(wLoc) || wLoc.includes(jLoc)) return 20;
  const jProv = getProvince(jobLoc);
  const wProv = getProvince(workerLoc);
  if (jProv === wProv) return 10;
  return 0;
}

function skillScore(job: Job, profile: Profile): number {
  const relevantSkills = CATEGORY_SKILL_MAP[job.category] || [];
  if (relevantSkills.length === 0) return 20;
  const matched = profile.skills.filter((s) => relevantSkills.some((r) => s.toLowerCase().includes(r.toLowerCase()) || r.toLowerCase().includes(s.toLowerCase())));
  const ratio = matched.length / relevantSkills.length;
  return Math.round(Math.min(ratio * 1.5, 1) * 40);
}

function kkniScore(job: Job, profile: Profile): number {
  if (!profile.kkniLevel) return 5;
  const level = parseInt(profile.kkniLevel.replace("Level ", "").split(" ")[0]) || 1;
  const budget = job.budget;
  let targetLevel = 1;
  if (compareMoney(budget, 500_000_000) >= 0) targetLevel = 7;
  else if (compareMoney(budget, 200_000_000) >= 0) targetLevel = 6;
  else if (compareMoney(budget, 100_000_000) >= 0) targetLevel = 5;
  else if (compareMoney(budget, 50_000_000) >= 0) targetLevel = 4;
  else if (compareMoney(budget, 20_000_000) >= 0) targetLevel = 3;
  else if (compareMoney(budget, 5_000_000) >= 0) targetLevel = 2;
  else targetLevel = 1;
  const diff = Math.abs(level - targetLevel);
  if (diff === 0) return 15;
  if (diff === 1) return 12;
  if (diff === 2) return 8;
  return 3;
}

function ratingScore(profile: Profile): number {
  if (profile.ratingCount === 0) return 8;
  return Math.round((profile.rating / 5) * 15);
}

function experienceScore(profile: Profile): number {
  const score = Math.min(profile.completedProjects / 50, 1) * 10;
  return Math.round(score);
}

export interface MatchResult {
  workerId: number;
  workerName: string;
  profile: Profile;
  totalScore: number;
  breakdown: {
    skills: number;
    location: number;
    kkni: number;
    rating: number;
    experience: number;
  };
  recommendation: string;
}

export interface PriceSuggestion {
  category: string;
  location: string;
  locationMultiplier: number;
  baseMin: Money;
  baseMax: Money;
  adjustedMin: Money;
  adjustedMid: Money;
  adjustedMax: Money;
  unit: string;
  tips: string[];
}

export interface MilestoneSuggestion {
  title: string;
  description: string;
  amount: Money;
  percentage: number;
  estimatedDays: number;
  dueDate: string;
}

export interface RankedApplication {
  applicationId: number;
  applicantId: number;
  applicantName: string;
  profile: Profile | null;
  totalScore: number;
  breakdown: {
    rating: number;
    experience: number;
    budgetFit: number;
    kkni: number;
    verified: number;
  };
  badge: "Top Pick" | "Good Match" | "Consider" | null;
  proposedBudget: Money | null;
  message: string | null;
  createdAt: string;
}

export const MatchingAgent = {
  name: "MatchingAgent",
  description: "Mencocokkan proyek dengan pekerja terbaik berdasarkan keahlian, lokasi, level SKK, rating, dan pengalaman.",

  async findBestWorkers(job: Job, limit = 5): Promise<MatchResult[]> {
    const [allUsers, allProfiles, allContracts] = await Promise.all([
      storage.getUsers(),
      storage.getProfiles(),
      storage.getAllContracts(),
    ]);

    const workers = allUsers.filter((u) => u.role === "tukang");
    const activeContractWorkerIds = new Set(
      allContracts
        .filter((c) => c.status === "active")
        .map((c) => c.workerId)
    );

    const results: MatchResult[] = workers
      .map((worker) => {
        const profile = allProfiles.find((p) => p.userId === worker.id);
        if (!profile) return null;

        const skills = skillScore(job, profile);
        const location = locationScore(job.location, profile.location || "");
        const kkni = kkniScore(job, profile);
        const rating = ratingScore(profile);
        const experience = experienceScore(profile);
        const totalScore = skills + location + kkni + rating + experience;

        const busy = activeContractWorkerIds.has(worker.id);
        const adjustedScore = busy ? Math.round(totalScore * 0.7) : totalScore;

        let recommendation = "";
        if (adjustedScore >= 70) recommendation = "Sangat cocok untuk proyek ini";
        else if (adjustedScore >= 50) recommendation = "Cocok, perlu pertimbangan lebih";
        else if (adjustedScore >= 30) recommendation = "Bisa dipertimbangkan";
        else recommendation = "Kurang sesuai dengan kebutuhan";
        if (busy) recommendation += " (sedang aktif di proyek lain)";

        return {
          workerId: worker.id,
          workerName: worker.fullName,
          profile,
          totalScore: adjustedScore,
          breakdown: { skills, location, kkni, rating, experience },
          recommendation,
        };
      })
      .filter(Boolean) as MatchResult[];

    return results.sort((a, b) => b.totalScore - a.totalScore).slice(0, limit);
  },
};

export const PricingAgent = {
  name: "PricingAgent",
  description: "Menyarankan kisaran harga yang wajar berdasarkan kategori pekerjaan, lokasi, dan kondisi pasar.",

  suggestPrice(category: string, location: string, existingBudget?: MoneyLike): PriceSuggestion {
    const base = PRICE_BASE[category] || PRICE_BASE["Lainnya"];
    const province = getProvince(location);
    const multiplierPercent = LOCATION_MULTIPLIER_PERCENT[province]
      || LOCATION_MULTIPLIER_PERCENT[location.toLowerCase()]
      || 100;
    const multiplier = multiplierPercent / 100;

    const adjustedMin = scaleMoney(base.min, multiplierPercent, 100);
    const adjustedMid = scaleMoney(base.mid, multiplierPercent, 100);
    const adjustedMax = scaleMoney(base.max, multiplierPercent, 100);

    const tips: string[] = [];
    if (multiplier > 1.1) tips.push(`Lokasi ${location} memiliki indeks biaya tinggi (+${Math.round((multiplier - 1) * 100)}%).`);
    if (multiplier < 0.95) tips.push(`Lokasi ${location} relatif lebih terjangkau dari rata-rata nasional.`);
    tips.push("Harga ini belum termasuk material jika tidak disebutkan dalam kontrak.");
    tips.push("Negosiasi harga boleh dilakukan, namun hati-hati dengan penawaran terlalu jauh di bawah minimum.");
    if (existingBudget) {
      if (compareMoney(existingBudget, adjustedMin) < 0) tips.push("⚠️ Anggaran yang Anda masukkan di bawah kisaran pasar — bisa sulit menarik tenaga ahli berkualitas.");
      else if (compareMoney(existingBudget, multiplyMoney(adjustedMax, 5)) > 0) tips.push("✅ Anggaran Anda sangat kompetitif untuk menarik tenaga ahli terbaik.");
    }

    return {
      category,
      location,
      locationMultiplier: multiplier,
      baseMin: base.min.toString(),
      baseMax: base.max.toString(),
      adjustedMin,
      adjustedMid,
      adjustedMax,
      unit: base.unit,
      tips,
    };
  },
};

export const MilestoneAgent = {
  name: "MilestoneAgent",
  description: "Auto-generate rencana milestone pembayaran berdasarkan jenis pekerjaan, anggaran, dan estimasi durasi.",

  generateMilestones(category: string, budget: MoneyLike, startDate?: string): MilestoneSuggestion[] {
    const configuredTemplate = MILESTONE_TEMPLATES[category] || getDefaultMilestones(budget);
    const budgetValue = moneyToBigInt(budget);
    // A persisted milestone must be positive. For a budget smaller than the
    // normal number of phases, collapse deterministically to the final
    // handover phase rather than emitting zero-value rows.
    const template = budgetValue < BigInt(configuredTemplate.length)
      ? [{ ...configuredTemplate[configuredTemplate.length - 1], pct: 100 }]
      : configuredTemplate;
    const start = startDate ? new Date(startDate) : new Date();
    let currentDate = new Date(start);

    let allocated = 0n;
    return template.map((t, index) => {
      const remainingPhases = BigInt(template.length - index - 1);
      let amountValue: bigint;
      if (index === template.length - 1) {
        amountValue = budgetValue - allocated;
      } else {
        const proportional = BigInt(allocateMoneyPercentage(budget, t.pct));
        const maximumForPhase = budgetValue - allocated - remainingPhases;
        // Reserve at least one unit for every later phase while keeping this
        // phase positive, even when percentage flooring would produce zero.
        amountValue = proportional < 1n ? 1n : proportional;
        if (amountValue > maximumForPhase) amountValue = maximumForPhase;
      }
      const amount = amountValue.toString();
      allocated += BigInt(amount);
      const dueDate = new Date(currentDate);
      dueDate.setDate(dueDate.getDate() + t.days);
      currentDate = new Date(dueDate);

      return {
        title: t.title,
        description: t.desc,
        amount,
        percentage: t.pct,
        estimatedDays: t.days,
        dueDate: dueDate.toISOString().split("T")[0],
      };
    });
  },
};

export const ApplicationRankingAgent = {
  name: "ApplicationRankingAgent",
  description: "Meranking lamaran kerja berdasarkan kualifikasi pelamar, rating, kesesuaian harga, dan level SKK.",

  async rankApplications(jobId: number): Promise<RankedApplication[]> {
    const [job, applications, allUsers, allProfiles] = await Promise.all([
      storage.getJobById(jobId),
      storage.getApplicationsByJob(jobId),
      storage.getUsers(),
      storage.getProfiles(),
    ]);
    if (!job) return [];

    const results: RankedApplication[] = applications.map((app) => {
      const user = allUsers.find((u) => u.id === app.applicantId);
      const profile = allProfiles.find((p) => p.userId === app.applicantId) || null;

      if (!user) return null;

      let ratingPts = 0;
      let experiencePts = 0;
      let budgetFitPts = 0;
      let kkniPts = 0;
      let verifiedPts = 0;

      if (profile) {
        ratingPts = profile.ratingCount > 0 ? Math.round((profile.rating / 5) * 30) : 15;
        experiencePts = Math.round(Math.min(profile.completedProjects / 30, 1) * 20);
        kkniPts = profile.kkniLevel ? Math.round((parseInt(profile.kkniLevel.replace("Level ", "")) / 9) * 15) : 5;
        verifiedPts = profile.isVerified ? 15 : 0;
      }

      if (app.proposedBudget) {
        const proposed = moneyToBigInt(app.proposedBudget);
        const budget = moneyToBigInt(job.budget);
        if (proposed * 10n >= budget * 7n && proposed <= budget) budgetFitPts = 20;
        else if (proposed > budget && proposed * 10n <= budget * 12n) budgetFitPts = 15;
        else if (proposed * 10n > budget * 5n && proposed * 10n < budget * 7n) budgetFitPts = 10;
        else budgetFitPts = 5;
      } else {
        budgetFitPts = 12;
      }

      const totalScore = ratingPts + experiencePts + budgetFitPts + kkniPts + verifiedPts;

      let badge: "Top Pick" | "Good Match" | "Consider" | null = null;
      if (totalScore >= 70) badge = "Top Pick";
      else if (totalScore >= 50) badge = "Good Match";
      else if (totalScore >= 30) badge = "Consider";

      return {
        applicationId: app.id,
        applicantId: app.applicantId,
        applicantName: user.fullName,
        profile,
        totalScore,
        breakdown: { rating: ratingPts, experience: experiencePts, budgetFit: budgetFitPts, kkni: kkniPts, verified: verifiedPts },
        badge,
        proposedBudget: app.proposedBudget,
        message: app.message,
        createdAt: app.createdAt,
      };
    }).filter(Boolean) as RankedApplication[];

    return results.sort((a, b) => b.totalScore - a.totalScore);
  },
};

// ---------------------------------------------------------------------
// BRAIN PROJECT — SISTEM SUPERVISI KONSTRUKSI MULTI-AGEN
// ---------------------------------------------------------------------

type FindingSeverity = "critical" | "warning" | "info";

interface AgentFinding {
  agentName: string;
  severity: FindingSeverity;
  code: string;
  title: string;
  detail: string;
  recommendation: string;
}

interface AgentResult {
  score: number;
  findings: AgentFinding[];
  summary: string;
  label: string;
}

const CONSTRUCTION_SEQUENCES: Record<string, string[]> = {
  "Konstruksi Baru": [
    "Persiapan & Pembersihan Lahan",
    "Survey & Pengukuran (Uitzetten)",
    "Pekerjaan Pondasi",
    "Pekerjaan Struktur Bawah (Sloof/Ring Balk)",
    "Pekerjaan Kolom & Balok",
    "Pekerjaan Dinding & Pasangan Bata",
    "Pekerjaan Atap & Rangka Atap",
    "Instalasi MEP (Listrik, Plambing, Mekanikal)",
    "Pekerjaan Plesteran & Acian",
    "Pekerjaan Lantai & Keramik",
    "Pekerjaan Finishing & Pengecatan",
    "Pembersihan Akhir & Serah Terima",
  ],
  "Renovasi": [
    "Survei Kondisi Awal & Dokumentasi",
    "Persetujuan Rencana Renovasi",
    "Pembongkaran Area yang Direnovasi",
    "Perbaikan Struktur (jika ditemukan kerusakan)",
    "Pekerjaan Batu, Bata & Plesteran",
    "Pekerjaan Instalasi MEP",
    "Pekerjaan Keramik & Lantai",
    "Pekerjaan Finishing & Kayu",
    "Pengecatan",
    "Pembersihan Akhir & Serah Terima",
  ],
  "Pengecatan": [
    "Persiapan Permukaan (Bersihkan, Amplas, Tambal)",
    "Aplikasi Cat Dasar / Primer",
    "Pengecatan Lapisan Pertama",
    "Inspeksi Lapisan Pertama",
    "Pengecatan Lapisan Kedua",
    "Finishing, Touch-up & Rapikan",
    "Serah Terima & Dokumentasi",
  ],
  "Listrik": [
    "Perencanaan & Gambar Jalur Instalasi",
    "Pemasangan Konduit & Jalur Kabel",
    "Penarikan Kabel Utama",
    "Instalasi Panel Listrik / MCB",
    "Instalasi Stop Kontak, Saklar & Fitting",
    "Testing & Commissioning",
    "Serah Terima & Dokumentasi",
  ],
  "Plambing": [
    "Survei & Perencanaan Jalur Pipa",
    "Bobok Dinding / Penggalian Jalur",
    "Pemasangan Pipa Utama (Air Bersih & Kotor)",
    "Instalasi Fitting, Kran & Aksesoris",
    "Testing Tekanan & Uji Kebocoran",
    "Finishing & Rapi Jalur Pipa",
    "Serah Terima & Dokumentasi",
  ],
  "Atap": [
    "Persiapan & Pengukuran Struktur Atap",
    "Pemasangan Rangka/Kuda-kuda Atap",
    "Pemasangan Reng & Usuk",
    "Pemasangan Penutup Atap (Genteng/Metal)",
    "Pemasangan Talang & Drainase Atap",
    "Waterproofing & Sealant Nok/Lisplang",
    "Serah Terima & Dokumentasi",
  ],
  "Pondasi": [
    "Pengukuran & Penggalian",
    "Pemasangan Bekisting Pondasi",
    "Pemasangan Tulangan Baja",
    "Pengecoran Beton",
    "Curing Beton (7-28 hari)",
    "Bongkar Bekisting & Pengurugan",
    "Serah Terima & Dokumentasi",
  ],
  "Lantai": [
    "Persiapan & Pembersihan Permukaan Dasar",
    "Pemasangan Screeding / Rabat Beton",
    "Leveling & Waterproofing (jika diperlukan)",
    "Pemasangan Material Lantai (Keramik/Granit/Vinyl)",
    "Pemasangan Nat & Grouting",
    "Pembersihan & Poles Lantai",
    "Serah Terima & Dokumentasi",
  ],
  "Beton": [
    "Persiapan Bekisting",
    "Pemasangan Tulangan Baja & Pembesian",
    "Inspeksi Tulangan (Quality Check)",
    "Pengecoran Beton",
    "Perataan & Pemadatan (Vibrator)",
    "Curing Beton",
    "Bongkar Bekisting",
    "Serah Terima & Dokumentasi",
  ],
  "Las": [
    "Persiapan Material & Peralatan Las",
    "Pemotongan & Pembentukan Material",
    "Penyetelan & Pengeboran",
    "Pengelasan (Tack Weld → Full Weld)",
    "Inspeksi Sambungan Las",
    "Finishing: Gerinda & Anti Karat",
    "Serah Terima & Dokumentasi",
  ],
};

const BUDGET_RULES: Record<string, { maxDpPct: number; maxSinglePct: number; minFinalPct: number }> = {
  "Konstruksi Baru": { maxDpPct: 25, maxSinglePct: 35, minFinalPct: 10 },
  "Renovasi":        { maxDpPct: 30, maxSinglePct: 40, minFinalPct: 10 },
  "Pondasi":         { maxDpPct: 20, maxSinglePct: 35, minFinalPct: 15 },
  "Pengecatan":      { maxDpPct: 40, maxSinglePct: 60, minFinalPct: 10 },
  "Listrik":         { maxDpPct: 30, maxSinglePct: 50, minFinalPct: 10 },
  "Plambing":        { maxDpPct: 30, maxSinglePct: 50, minFinalPct: 10 },
  "Atap":            { maxDpPct: 30, maxSinglePct: 40, minFinalPct: 10 },
  "Lantai":          { maxDpPct: 30, maxSinglePct: 50, minFinalPct: 10 },
  "Beton":           { maxDpPct: 20, maxSinglePct: 35, minFinalPct: 15 },
  "Las":             { maxDpPct: 30, maxSinglePct: 50, minFinalPct: 10 },
  "default":         { maxDpPct: 30, maxSinglePct: 50, minFinalPct: 10 },
};

// ─── Agen 1: Contract Compliance Agent ───────────────────────────────────────
export const ContractComplianceAgent = {
  name: "ContractComplianceAgent",
  description: "Verifikasi kesesuaian pekerjaan dengan isi kontrak yang disepakati.",

  async analyze(contractId: number): Promise<AgentResult> {
    const allContracts = await storage.getAllContracts();
    const contract = allContracts.find((c) => c.id === contractId);
    if (!contract) return { score: 0, findings: [], summary: "Kontrak tidak ditemukan.", label: "N/A" };

    const milestones = await storage.getMilestonesByContract(contractId);
    const findings: AgentFinding[] = [];
    let deduction = 0;

    const milestoneTotal = milestones.reduce((sum, m) => sum + moneyToBigInt(m.amount), 0n);
    const contractValue = moneyToBigInt(contract.totalValue);
    const diff = milestoneTotal >= contractValue ? milestoneTotal - contractValue : contractValue - milestoneTotal;
    const diffPct = Number(diff * 1000n / contractValue) / 10;
    if (diffPct > 5) {
      deduction += 25;
      findings.push({
        agentName: this.name, severity: "critical", code: "CC-001",
        title: "Nilai milestone tidak sesuai kontrak",
        detail: `Total milestone Rp ${formatIdrInteger(milestoneTotal)} vs nilai kontrak Rp ${formatIdrInteger(contract.totalValue)} (selisih ${diffPct.toFixed(1)}%).`,
        recommendation: "Sesuaikan jumlah milestone agar totalnya tepat sama dengan nilai kontrak.",
      });
    } else if (diffPct > 1) {
      deduction += 10;
      findings.push({
        agentName: this.name, severity: "warning", code: "CC-002",
        title: "Selisih kecil antara milestone dan nilai kontrak",
        detail: `Selisih Rp ${formatIdrInteger(diff)} (${diffPct.toFixed(1)}%) mungkin disebabkan pembulatan.`,
        recommendation: "Pastikan total milestone persis sama dengan nilai kontrak untuk menghindari sengketa.",
      });
    }

    if (!contract.clientSigned || !contract.workerSigned) {
      deduction += 20;
      const pihak = !contract.clientSigned && !contract.workerSigned ? "kedua pihak" : !contract.clientSigned ? "klien" : "pekerja";
      findings.push({
        agentName: this.name, severity: "critical", code: "CC-003",
        title: `Kontrak belum ditandatangani ${pihak}`,
        detail: "Kontrak yang belum ditandatangani tidak sah secara hukum dan tidak memberikan perlindungan.",
        recommendation: `Minta ${pihak} segera menandatangani kontrak sebelum pekerjaan dilanjutkan.`,
      });
    }

    const noDesc = milestones.filter((m) => !m.description || m.description.trim().length < 10);
    if (noDesc.length > 0) {
      deduction += noDesc.length * 5;
      findings.push({
        agentName: this.name, severity: "warning", code: "CC-004",
        title: `${noDesc.length} milestone tidak memiliki deskripsi memadai`,
        detail: `Milestone tanpa deskripsi: ${noDesc.map((m) => `"${m.title}"`).join(", ")}.`,
        recommendation: "Tambahkan deskripsi detail apa yang harus diselesaikan di setiap milestone.",
      });
    }

    const noDue = milestones.filter((m) => !m.dueDate && m.status === "pending");
    if (noDue.length > 0) {
      deduction += noDue.length * 3;
      findings.push({
        agentName: this.name, severity: "warning", code: "CC-005",
        title: `${noDue.length} milestone tanpa tanggal target`,
        detail: `Milestone tanpa deadline: ${noDue.map((m) => `"${m.title}"`).join(", ")}.`,
        recommendation: "Tetapkan target tanggal selesai untuk setiap milestone agar progres bisa dipantau.",
      });
    }

    if (milestones.length === 0) {
      deduction += 30;
      findings.push({
        agentName: this.name, severity: "critical", code: "CC-006",
        title: "Kontrak tidak memiliki milestone pembayaran",
        detail: "Tanpa milestone, tidak ada struktur pembayaran yang jelas dan tidak ada checkpoint pekerjaan.",
        recommendation: "Tambahkan milestone pembayaran bertahap sesuai progress pekerjaan.",
      });
    }

    const score = Math.max(0, 100 - deduction);
    const summary = score >= 80 ? "Kontrak sesuai dan lengkap." : score >= 60 ? "Ada beberapa ketidaksesuaian kontrak yang perlu diperbaiki." : "Kontrak memiliki masalah serius yang berisiko sengketa.";
    const label = score >= 80 ? "Sesuai" : score >= 60 ? "Perlu Perbaikan" : "Bermasalah";

    return { score, findings, summary, label };
  },
};

// ─── Agen 2: Construction Sequence Agent ─────────────────────────────────────
export const ConstructionSequenceAgent = {
  name: "ConstructionSequenceAgent",
  description: "Validasi urutan pekerjaan konstruksi sesuai standar keilmuan teknik (SNI).",

  async analyze(contractId: number): Promise<AgentResult> {
    const allContracts = await storage.getAllContracts();
    const contract = allContracts.find((c) => c.id === contractId);
    if (!contract) return { score: 0, findings: [], summary: "Kontrak tidak ditemukan.", label: "N/A" };

    const [job, milestones] = await Promise.all([
      storage.getJobById(contract.jobId),
      storage.getMilestonesByContract(contractId),
    ]);
    if (!job) return { score: 50, findings: [], summary: "Data pekerjaan tidak ditemukan.", label: "N/A" };

    const findings: AgentFinding[] = [];
    let deduction = 0;

    const expectedSeq = CONSTRUCTION_SEQUENCES[job.category] || CONSTRUCTION_SEQUENCES["Renovasi"];

    if (!CONSTRUCTION_SEQUENCES[job.category]) {
      findings.push({
        agentName: this.name, severity: "info", code: "CS-000",
        title: "Tidak ada standar urutan untuk kategori ini",
        detail: `Kategori "${job.category}" belum memiliki standar urutan pekerjaan yang didefinisikan.`,
        recommendation: "Pastikan urutan pekerjaan disepakati bersama secara tertulis di kontrak.",
      });
    }

    if (milestones.length === 0) {
      return { score: 50, findings, summary: "Belum ada milestone untuk divalidasi urutannya.", label: "Belum Ada Data" };
    }

    const criticalSteps: Record<string, string[]> = {
      "Konstruksi Baru": ["Pondasi", "Struktur", "Atap"],
      "Renovasi": ["Survei", "Pembongkaran", "Finishing"],
      "Pengecatan": ["Persiapan", "Cat Dasar", "Serah Terima"],
      "Pondasi": ["Tulangan", "Pengecoran", "Curing"],
      "Beton": ["Tulangan", "Pengecoran", "Curing"],
      "Listrik": ["Kabel", "Panel", "Testing"],
      "Plambing": ["Pipa", "Testing", "Serah Terima"],
    };

    const requiredKeywords = criticalSteps[job.category] || [];
    const milestoneTitlesLower = milestones.map((m) => m.title.toLowerCase());

    for (const keyword of requiredKeywords) {
      const found = milestoneTitlesLower.some((t) => t.includes(keyword.toLowerCase()));
      if (!found) {
        deduction += 15;
        findings.push({
          agentName: this.name, severity: "warning", code: "CS-001",
          title: `Tahapan kritis "${keyword}" tidak ditemukan`,
          detail: `Pekerjaan kategori "${job.category}" seharusnya memiliki tahap "${keyword}" yang tidak terlihat dalam milestone.`,
          recommendation: `Tambahkan milestone untuk tahap "${keyword}" agar pekerjaan sesuai standar konstruksi.`,
        });
      }
    }

    const lastMs = milestones[milestones.length - 1];
    const hasHandover = lastMs && (
      lastMs.title.toLowerCase().includes("serah terima") ||
      lastMs.title.toLowerCase().includes("finishing") ||
      lastMs.title.toLowerCase().includes("pembersihan") ||
      lastMs.title.toLowerCase().includes("final")
    );
    if (!hasHandover && milestones.length > 1) {
      deduction += 10;
      findings.push({
        agentName: this.name, severity: "warning", code: "CS-002",
        title: "Tidak ada milestone serah terima / finishing",
        detail: "Milestone terakhir harus mencakup serah terima, pembersihan akhir, dan dokumentasi.",
        recommendation: `Tambahkan milestone "Serah Terima & Dokumentasi" sebagai tahap penutup.`,
      });
    }

    const firstMs = milestones[0];
    const firstIsPrep = firstMs && (
      firstMs.title.toLowerCase().includes("persiapan") ||
      firstMs.title.toLowerCase().includes("dp") ||
      firstMs.title.toLowerCase().includes("uang muka") ||
      firstMs.title.toLowerCase().includes("survei") ||
      firstMs.title.toLowerCase().includes("mobilisasi")
    );
    if (!firstIsPrep && milestones.length > 0) {
      deduction += 5;
      findings.push({
        agentName: this.name, severity: "info", code: "CS-003",
        title: "Milestone pertama bukan tahap persiapan",
        detail: `Milestone pertama "${firstMs.title}" tidak tampak sebagai tahap mobilisasi/persiapan awal.`,
        recommendation: "Pastikan milestone pertama mencakup persiapan lahan, mobilisasi alat, dan survei awal.",
      });
    }

    if (findings.filter(f => f.severity !== "info").length === 0) {
      findings.push({
        agentName: this.name, severity: "info", code: "CS-OK",
        title: "Urutan pekerjaan tampak sesuai standar",
        detail: `Milestone yang ada tampak mengikuti alur konstruksi yang benar untuk kategori "${job.category}".`,
        recommendation: "Pastikan setiap milestone diselesaikan secara berurutan dan didokumentasikan dengan baik.",
      });
    }

    const score = Math.max(0, 100 - deduction);
    const label = score >= 80 ? "Urutan Benar" : score >= 60 ? "Perlu Penyesuaian" : "Urutan Salah";
    const summary = score >= 80 ? `Urutan pekerjaan sesuai standar konstruksi untuk kategori ${job.category}.` :
      `Ada ${findings.filter(f => f.severity !== "info").length} tahapan penting yang perlu diperhatikan.`;

    return { score, findings, summary, label };
  },

  getExpectedSequence(category: string): string[] {
    return CONSTRUCTION_SEQUENCES[category] || [];
  },
};

// ─── Agen 3: Budget Health Agent ─────────────────────────────────────────────
export const BudgetHealthAgent = {
  name: "BudgetHealthAgent",
  description: "Memantau kewajaran distribusi anggaran, uang muka, dan pembayaran bertahap.",

  async analyze(contractId: number): Promise<AgentResult> {
    const allContracts = await storage.getAllContracts();
    const contract = allContracts.find((c) => c.id === contractId);
    if (!contract) return { score: 0, findings: [], summary: "Kontrak tidak ditemukan.", label: "N/A" };

    const [job, milestones] = await Promise.all([
      storage.getJobById(contract.jobId),
      storage.getMilestonesByContract(contractId),
    ]);

    const findings: AgentFinding[] = [];
    let deduction = 0;

    const rules = BUDGET_RULES[job?.category || ""] || BUDGET_RULES["default"];
    const total = moneyToBigInt(contract.totalValue);
    const percentOfTotal = (amount: MoneyLike) => Number(moneyToBigInt(amount) * 1000n / total) / 10;

    if (milestones.length === 0) {
      return { score: 50, findings, summary: "Belum ada milestone untuk dianalisis.", label: "Belum Ada Data" };
    }

    const firstMs = milestones[0];
    const dpPct = percentOfTotal(firstMs.amount);
    if (dpPct > rules.maxDpPct) {
      deduction += 25;
      findings.push({
        agentName: this.name, severity: "critical", code: "BH-001",
        title: `Uang muka terlalu besar (${dpPct.toFixed(0)}%)`,
        detail: `Milestone pertama "${firstMs.title}" senilai Rp ${formatIdrInteger(firstMs.amount)} (${dpPct.toFixed(1)}% dari total). Batas wajar untuk ${job?.category}: ${rules.maxDpPct}%.`,
        recommendation: "Kurangi uang muka di bawah batas wajar untuk melindungi klien dari risiko wanprestasi.",
      });
    }

    for (const ms of milestones) {
      const pct = percentOfTotal(ms.amount);
      if (pct > rules.maxSinglePct && ms.id !== firstMs.id) {
        deduction += 15;
        findings.push({
          agentName: this.name, severity: "warning", code: "BH-002",
          title: `Milestone "${ms.title}" terlalu besar (${pct.toFixed(0)}%)`,
          detail: `Nilai Rp ${formatIdrInteger(ms.amount)} (${pct.toFixed(1)}% dari total) melampaui batas wajar ${rules.maxSinglePct}%.`,
          recommendation: "Pecah milestone besar menjadi 2-3 tahap yang lebih kecil untuk kontrol kualitas lebih baik.",
        });
      }
    }

    const lastMs = milestones[milestones.length - 1];
    const finalPct = percentOfTotal(lastMs.amount);
    if (finalPct < rules.minFinalPct && milestones.length > 1) {
      deduction += 15;
      findings.push({
        agentName: this.name, severity: "warning", code: "BH-003",
        title: `Pembayaran final terlalu kecil (${finalPct.toFixed(0)}%)`,
        detail: `Milestone terakhir "${lastMs.title}" hanya ${finalPct.toFixed(1)}% dari total. Ini mengurangi leverage klien untuk memastikan kualitas akhir.`,
        recommendation: "Pastikan pembayaran final minimal 10% dari total untuk menjaga kualitas serah terima.",
      });
    }

    const approved = milestones.filter((m) => m.status === "approved").reduce((sum, m) => sum + moneyToBigInt(m.amount), 0n);
    const approvedPct = Number(approved * 1000n / total) / 10;
    const remaining = total - approved;

    if (approvedPct > 80 && milestones.some((m) => m.status !== "approved")) {
      deduction += 10;
      findings.push({
        agentName: this.name, severity: "warning", code: "BH-004",
        title: `${approvedPct.toFixed(0)}% anggaran sudah dibayar tapi pekerjaan belum selesai`,
        detail: `Rp ${formatIdrInteger(approved)} sudah dibayarkan, sisa Rp ${formatIdrInteger(remaining)} untuk pekerjaan yang belum selesai.`,
        recommendation: "Pastikan semua pekerjaan yang tersisa selesai dan diterima sebelum pembayaran final.",
      });
    }

    if (findings.filter(f => f.severity !== "info").length === 0) {
      findings.push({
        agentName: this.name, severity: "info", code: "BH-OK",
        title: "Distribusi anggaran dalam batas kewajaran",
        detail: `Struktur pembayaran ${milestones.length} milestone dalam batas standar industri konstruksi.`,
        recommendation: "Pertahankan struktur ini dan pastikan pembayaran hanya dilakukan setelah milestone disetujui.",
      });
    }

    const score = Math.max(0, 100 - deduction);
    const label = score >= 80 ? "Sehat" : score >= 60 ? "Perlu Perhatian" : "Berisiko";
    const summary = `${approvedPct.toFixed(0)}% anggaran terpakai. ${score >= 80 ? "Distribusi pembayaran wajar." : "Ada anomali distribusi anggaran."}`;

    return { score, findings, summary, label };
  },
};

// ─── Agen 4: Progress Monitor Agent ──────────────────────────────────────────
export const ProgressMonitorAgent = {
  name: "ProgressMonitorAgent",
  description: "Memantau progress pekerjaan, mendeteksi keterlambatan, dan mengukur kecepatan kerja.",

  async analyze(contractId: number): Promise<AgentResult> {
    const allContracts = await storage.getAllContracts();
    const contract = allContracts.find((c) => c.id === contractId);
    if (!contract) return { score: 0, findings: [], summary: "Kontrak tidak ditemukan.", label: "N/A" };

    const [milestones, reports] = await Promise.all([
      storage.getMilestonesByContract(contractId),
      storage.getReportsByContract(contractId),
    ]);

    const findings: AgentFinding[] = [];
    let deduction = 0;
    const now = new Date();

    if (milestones.length === 0) {
      return { score: 50, findings: [{ agentName: this.name, severity: "warning", code: "PM-000", title: "Belum ada milestone", detail: "Tidak ada milestone yang bisa dipantau progressnya.", recommendation: "Tambahkan milestone untuk bisa memantau progres pekerjaan." }], summary: "Tidak ada milestone.", label: "Belum Ada Data" };
    }

    const approved = milestones.filter((m) => m.status === "approved");
    const submitted = milestones.filter((m) => m.status === "submitted");
    const rejected = milestones.filter((m) => m.status === "rejected");
    const progressPct = Math.round((approved.length / milestones.length) * 100);

    const overdue = milestones.filter((m) => {
      if (!m.dueDate || m.status === "approved") return false;
      return new Date(m.dueDate) < now;
    });

    if (overdue.length > 0) {
      const worst = overdue.reduce((a, b) => {
        const daysA = (now.getTime() - new Date(a.dueDate!).getTime()) / 86400000;
        const daysB = (now.getTime() - new Date(b.dueDate!).getTime()) / 86400000;
        return daysA > daysB ? a : b;
      });
      const maxDelay = Math.floor((now.getTime() - new Date(worst.dueDate!).getTime()) / 86400000);
      deduction += Math.min(overdue.length * 15, 45);
      findings.push({
        agentName: this.name, severity: "critical", code: "PM-001",
        title: `${overdue.length} milestone melewati deadline`,
        detail: `Milestone paling terlambat: "${worst.title}" (${maxDelay} hari terlambat). Total ${overdue.length} milestone overdue.`,
        recommendation: "Koordinasikan dengan pekerja segera untuk menyelesaikan milestone yang terlambat atau revisi jadwal.",
      });
    }

    if (reports.length > 0) {
      const lastReport = reports.reduce((a: any, b: any) => new Date(a.createdAt) > new Date(b.createdAt) ? a : b);
      const daysSinceReport = (now.getTime() - new Date(lastReport.createdAt).getTime()) / 86400000;
      if (daysSinceReport > 14 && contract.status === "active") {
        deduction += 20;
        findings.push({
          agentName: this.name, severity: "critical", code: "PM-002",
          title: `Tidak ada laporan selama ${Math.floor(daysSinceReport)} hari`,
          detail: `Laporan terakhir pada ${new Date(lastReport.createdAt).toLocaleDateString("id-ID")}. Tidak ada aktivitas tercatat selama ${Math.floor(daysSinceReport)} hari.`,
          recommendation: "Minta pekerja untuk mengirimkan laporan progres harian atau mingguan segera.",
        });
      } else if (daysSinceReport > 7 && contract.status === "active") {
        deduction += 10;
        findings.push({
          agentName: this.name, severity: "warning", code: "PM-002B",
          title: `Laporan terakhir ${Math.floor(daysSinceReport)} hari lalu`,
          detail: "Disarankan laporan progres minimal seminggu sekali.",
          recommendation: "Ingatkan pekerja untuk rutin membuat laporan progres.",
        });
      }
    } else if (contract.status === "active") {
      const contractStart = contract.startDate ? new Date(contract.startDate) : new Date(contract.createdAt);
      const daysActive = (now.getTime() - contractStart.getTime()) / 86400000;
      if (daysActive > 7) {
        deduction += 15;
        findings.push({
          agentName: this.name, severity: "warning", code: "PM-003",
          title: "Belum ada laporan lapangan",
          detail: `Kontrak aktif selama ${Math.floor(daysActive)} hari tetapi belum ada laporan progres yang dikirim.`,
          recommendation: "Minta pekerja mulai mengirimkan laporan harian/mingguan melalui fitur Laporan Kontrak.",
        });
      }
    }

    if (rejected.length >= 2) {
      deduction += rejected.length * 8;
      findings.push({
        agentName: this.name, severity: "warning", code: "PM-004",
        title: `${rejected.length} milestone pernah ditolak`,
        detail: "Penolakan berulang mengindikasikan kualitas pekerjaan tidak memenuhi standar atau komunikasi kurang jelas.",
        recommendation: "Klarifikasi standar penerimaan setiap milestone secara tertulis sebelum dikerjakan.",
      });
    }

    for (const ms of submitted) {
      if (ms.completedAt) {
        const daysPending = (now.getTime() - new Date(ms.completedAt).getTime()) / 86400000;
        if (daysPending > 5) {
          deduction += 8;
          findings.push({
            agentName: this.name, severity: "warning", code: "PM-005",
            title: `Milestone "${ms.title}" menunggu persetujuan ${Math.floor(daysPending)} hari`,
            detail: "Keterlambatan persetujuan menghambat laju pekerjaan dan mempengaruhi cashflow pekerja.",
            recommendation: "Segera tinjau dan setujui atau berikan catatan penolakan milestone ini.",
          });
        }
      }
    }

    if (findings.filter(f => f.severity !== "info").length === 0) {
      findings.push({
        agentName: this.name, severity: "info", code: "PM-OK",
        title: "Progres pekerjaan berjalan sesuai rencana",
        detail: `${progressPct}% milestone selesai. Tidak ada keterlambatan signifikan terdeteksi.`,
        recommendation: "Pertahankan ritme kerja dan terus dokumentasikan progres secara berkala.",
      });
    }

    const score = Math.max(0, 100 - deduction);
    const label = score >= 80 ? "On Track" : score >= 60 ? "Terlambat Sedikit" : "Terlambat Parah";
    const summary = `${progressPct}% selesai (${approved.length}/${milestones.length} milestone). ${overdue.length > 0 ? `${overdue.length} milestone overdue.` : "Tidak ada keterlambatan."}`;

    return { score, findings, summary, label };
  },
};

// ─── Agen 5: Field Quality Agent ─────────────────────────────────────────────
export const FieldQualityAgent = {
  name: "FieldQualityAgent",
  description: "Menganalisis laporan lapangan untuk mendeteksi masalah kualitas, keselamatan, dan kelalaian.",

  async analyze(contractId: number): Promise<AgentResult> {
    const allContracts = await storage.getAllContracts();
    const contract = allContracts.find((c) => c.id === contractId);
    if (!contract) return { score: 0, findings: [], summary: "Kontrak tidak ditemukan.", label: "N/A" };

    const [reports, milestones] = await Promise.all([
      storage.getReportsByContract(contractId),
      storage.getMilestonesByContract(contractId),
    ]);

    const findings: AgentFinding[] = [];
    let deduction = 0;

    const dangerKeywords = ["retak", "bocor", "rusak", "amblas", "miring", "tidak rata", "korosi", "karat", "longsor", "roboh", "bahaya", "kecelakaan", "luka", "gagal", "cacat", "bongkar ulang"];
    const qualityKeywords = ["tidak sesuai", "spek berbeda", "material buruk", "kualitas rendah", "asal-asalan", "tidak rapi"];

    const problemReports = reports.filter((r: any) => r.type === "problem");
    if (problemReports.length > 0) {
      for (const pr of problemReports) {
        const text = `${pr.title} ${pr.description}`.toLowerCase();
        const isDangerous = dangerKeywords.some((k) => text.includes(k));
        const isQuality = qualityKeywords.some((k) => text.includes(k));

        if (isDangerous) {
          deduction += 25;
          findings.push({
            agentName: this.name, severity: "critical", code: "FQ-001",
            title: `Masalah kritis terdeteksi: "${pr.title}"`,
            detail: `Laporan tanggal ${new Date(pr.createdAt).toLocaleDateString("id-ID")}: "${pr.description.substring(0, 120)}..."`,
            recommendation: "Hentikan pekerjaan di area bermasalah. Lakukan inspeksi dan perbaikan sebelum melanjutkan.",
          });
        } else if (isQuality) {
          deduction += 15;
          findings.push({
            agentName: this.name, severity: "warning", code: "FQ-002",
            title: `Masalah kualitas dilaporkan: "${pr.title}"`,
            detail: `Laporan tanggal ${new Date(pr.createdAt).toLocaleDateString("id-ID")}: "${pr.description.substring(0, 120)}"`,
            recommendation: "Diskusikan standar kualitas yang diharapkan dan buat checklist inspeksi per milestone.",
          });
        } else {
          deduction += 8;
          findings.push({
            agentName: this.name, severity: "warning", code: "FQ-003",
            title: `Laporan masalah: "${pr.title}"`,
            detail: pr.description.substring(0, 150),
            recommendation: "Tindak lanjuti laporan masalah ini dan pastikan sudah diselesaikan sebelum milestone berikutnya.",
          });
        }
      }
    }

    const rejected = milestones.filter((m) => m.status === "rejected");
    if (rejected.length > 0) {
      deduction += rejected.length * 10;
      findings.push({
        agentName: this.name, severity: "warning", code: "FQ-004",
        title: `${rejected.length} milestone ditolak karena kualitas`,
        detail: `Milestone yang ditolak: ${rejected.map((m) => `"${m.title}"`).join(", ")}.`,
        recommendation: "Periksa catatan penolakan dan pastikan standar penerimaan dipahami sebelum pengerjaan ulang.",
      });
    }

    if (reports.length === 0 && contract.status === "active") {
      deduction += 10;
      findings.push({
        agentName: this.name, severity: "warning", code: "FQ-005",
        title: "Tidak ada laporan lapangan",
        detail: "Tanpa laporan lapangan, tidak ada bukti dokumentasi kondisi dan kualitas pekerjaan.",
        recommendation: "Wajibkan pekerja membuat laporan progres harian/mingguan dengan foto untuk dokumentasi.",
      });
    }

    const progressReports = reports.filter((r: any) => r.type === "progress");
    if (progressReports.length >= 5 && problemReports.length === 0) {
      findings.push({
        agentName: this.name, severity: "info", code: "FQ-OK",
        title: `${progressReports.length} laporan progres terdokumentasi dengan baik`,
        detail: "Pekerja aktif melaporkan kondisi lapangan — ini adalah praktik terbaik.",
        recommendation: "Pertahankan kebiasaan baik ini dan tambahkan foto di setiap laporan.",
      });
    }

    if (findings.length === 0) {
      findings.push({
        agentName: this.name, severity: "info", code: "FQ-CLEAN",
        title: "Tidak ada masalah kualitas terdeteksi",
        detail: "Tidak ada laporan masalah atau indikator kualitas negatif dari lapangan.",
        recommendation: "Tetap waspada dan lakukan inspeksi fisik berkala di lokasi pekerjaan.",
      });
    }

    const score = Math.max(0, 100 - deduction);
    const label = score >= 80 ? "Baik" : score >= 60 ? "Ada Masalah" : "Kritis";
    const summary = problemReports.length > 0 ? `${problemReports.length} laporan masalah terdeteksi. Perlu tindak lanjut segera.` : `${progressReports.length} laporan progres. Kualitas terpantau baik.`;

    return { score, findings, summary, label };
  },
};

// ─── Brain Contract Orchestrator ─────────────────────────────────────────────
export const BrainContractOrchestrator = {
  async analyze(contractId: number) {
    const allContracts = await storage.getAllContracts();
    const contract = allContracts.find((c) => c.id === contractId);
    if (!contract) return null;

    const [job, milestones, workerProfile, clientUser, workerUser] = await Promise.all([
      storage.getJobById(contract.jobId),
      storage.getMilestonesByContract(contractId),
      storage.getProfileByUserId(contract.workerId),
      storage.getUserById(contract.clientId),
      storage.getUserById(contract.workerId),
    ]);

    const [compliance, sequence, budget, progress, quality] = await Promise.all([
      ContractComplianceAgent.analyze(contractId),
      ConstructionSequenceAgent.analyze(contractId),
      BudgetHealthAgent.analyze(contractId),
      ProgressMonitorAgent.analyze(contractId),
      FieldQualityAgent.analyze(contractId),
    ]);

    const healthScore = Math.round(
      compliance.score * 0.20 +
      sequence.score * 0.20 +
      budget.score * 0.15 +
      progress.score * 0.25 +
      quality.score * 0.20
    );

    const allFindings = [
      ...compliance.findings,
      ...sequence.findings,
      ...budget.findings,
      ...progress.findings,
      ...quality.findings,
    ].sort((a, b) => {
      const order = { critical: 0, warning: 1, info: 2 };
      return order[a.severity] - order[b.severity];
    });

    const criticalCount = allFindings.filter((f) => f.severity === "critical").length;
    const warningCount = allFindings.filter((f) => f.severity === "warning").length;

    const actions: Array<{ priority: "segera" | "disarankan" | "pantau"; title: string; detail: string; link?: string }> = [];

    if (criticalCount > 0) {
      actions.push({ priority: "segera", title: `Selesaikan ${criticalCount} masalah kritis`, detail: "Ada temuan kritis dari agen supervisi yang perlu tindak lanjut segera.", link: `/contracts/${contractId}` });
    }
    const overdueMilestones = milestones.filter((m) => m.dueDate && new Date(m.dueDate) < new Date() && m.status !== "approved");
    if (overdueMilestones.length > 0) {
      actions.push({ priority: "segera", title: `Percepat ${overdueMilestones.length} milestone yang terlambat`, detail: `"${overdueMilestones[0].title}" dan lainnya sudah melewati batas waktu.`, link: `/contracts/${contractId}` });
    }
    const submittedMs = milestones.filter((m) => m.status === "submitted");
    if (submittedMs.length > 0) {
      actions.push({ priority: "segera", title: `Tinjau ${submittedMs.length} milestone menunggu persetujuan`, detail: "Keterlambatan persetujuan menghambat progress dan cashflow pekerja.", link: `/contracts/${contractId}` });
    }
    if (warningCount > 0) {
      actions.push({ priority: "disarankan", title: `Perbaiki ${warningCount} peringatan dari agen`, detail: "Perhatikan peringatan dari agen supervisi untuk mencegah eskalasi masalah." });
    }
    if (!contract.clientSigned || !contract.workerSigned) {
      actions.push({ priority: "segera", title: "Tanda tangani kontrak", detail: "Kontrak belum sah — semua pihak harus menandatangani.", link: `/contracts/${contractId}` });
    }
    if (milestones.every((m) => m.status === "approved") && contract.status === "active") {
      actions.push({ priority: "disarankan", title: "Semua milestone selesai — ajukan penyelesaian kontrak", detail: "Semua milestone sudah disetujui. Buat laporan penutup dan selesaikan kontrak.", link: `/contracts/${contractId}` });
    }

    const overallStatus: "excellent" | "good" | "warning" | "critical" =
      healthScore >= 85 ? "excellent" :
      healthScore >= 70 ? "good" :
      healthScore >= 50 ? "warning" : "critical";

    const expectedSequence = ConstructionSequenceAgent.getExpectedSequence(job?.category || "");

    return {
      contractId,
      contract,
      job,
      workerUser,
      clientUser,
      workerProfile,
      milestones,
      healthScore,
      overallStatus,
      agents: {
        compliance: { ...compliance, weight: 20, icon: "📋", label_id: "Kepatuhan Kontrak" },
        sequence:   { ...sequence,   weight: 20, icon: "🔗", label_id: "Urutan Konstruksi" },
        budget:     { ...budget,     weight: 15, icon: "💰", label_id: "Kesehatan Anggaran" },
        progress:   { ...progress,   weight: 25, icon: "📈", label_id: "Monitor Progres" },
        quality:    { ...quality,    weight: 20, icon: "🔍", label_id: "Kualitas Lapangan" },
      },
      allFindings,
      criticalCount,
      warningCount,
      actions,
      expectedSequence,
      generatedAt: new Date().toISOString(),
    };
  },
};

export const AgentOrchestrator = {
  async getDashboardInsights(userId: number) {
    const user = await storage.getUserById(userId);
    if (!user) return null;

    const insights: Array<{ type: string; title: string; message: string; link?: string; priority: "high" | "medium" | "low" }> = [];

    if (user.role === "pelanggan") {
      const myJobs = await storage.getJobs({ clientId: userId });
      const openJobs = myJobs.filter((j) => j.status === "open");
      const activeJobs = myJobs.filter((j) => j.status === "in_progress");

      for (const job of openJobs) {
        const apps = await storage.getApplicationsByJob(job.id);
        const pending = apps.filter((a) => a.status === "pending");
        if (pending.length > 0) {
          const ranked = await ApplicationRankingAgent.rankApplications(job.id);
          const topPick = ranked.find((r) => r.badge === "Top Pick");
          insights.push({
            type: "applications",
            title: `${pending.length} lamaran baru untuk "${job.title}"`,
            message: topPick
              ? `Kandidat terbaik: ${topPick.applicantName} (skor ${topPick.totalScore}/100)`
              : `Ada ${pending.length} pelamar menunggu review Anda.`,
            link: `/jobs/${job.id}`,
            priority: pending.length >= 3 ? "high" : "medium",
          });
        }
      }

      for (const job of activeJobs) {
        const allContracts = await storage.getAllContracts();
        const contracts = allContracts.filter((c) => c.jobId === job.id && c.status === "active");
        for (const contract of contracts) {
          const milestones = await storage.getMilestonesByContract(contract.id);
          const submitted = milestones.filter((m) => m.status === "submitted");
          if (submitted.length > 0) {
            insights.push({
              type: "milestone",
              title: `Milestone menunggu persetujuan`,
              message: `Kontrak "${contract.title}" memiliki ${submitted.length} milestone yang perlu disetujui.`,
              link: `/contracts/${contract.id}`,
              priority: "high",
            });
          }
          const upcoming = milestones.filter((m) => {
            if (m.status !== "pending" || !m.dueDate) return false;
            const due = new Date(m.dueDate);
            const now = new Date();
            const diffDays = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
            return diffDays <= 7 && diffDays >= 0;
          });
          if (upcoming.length > 0) {
            insights.push({
              type: "deadline",
              title: "Deadline milestone dalam 7 hari",
              message: `"${upcoming[0].title}" jatuh tempo ${upcoming[0].dueDate}.`,
              link: `/contracts/${contract.id}`,
              priority: "medium",
            });
          }
        }
      }

      if (openJobs.length > 0) {
        const topJob = openJobs[0];
        const matched = await MatchingAgent.findBestWorkers(topJob, 1);
        if (matched.length > 0 && matched[0].totalScore >= 50) {
          insights.push({
            type: "match",
            title: "Tenaga ahli cocok ditemukan",
            message: `${matched[0].workerName} cocok untuk "${topJob.title}" (skor ${matched[0].totalScore}/100).`,
            link: `/jobs/${topJob.id}`,
            priority: "low",
          });
        }
      }
    }

    if (user.role === "tukang") {
      const profile = await storage.getProfileByUserId(userId);
      const allJobs = await storage.getJobs({ status: "open" });

      const matchPromises = allJobs.map(async (job) => {
        const results = await MatchingAgent.findBestWorkers(job, 10);
        const myResult = results.find((r) => r.workerId === userId);
        return myResult ? { job, score: myResult.totalScore } : null;
      });
      const matchResults = await Promise.all(matchPromises);
      const matched = matchResults.filter(Boolean) as Array<{ job: Job; score: number }>;

      const topMatch = matched.sort((a, b) => b.score - a.score)[0];
      if (topMatch && topMatch.score >= 50) {
        insights.push({
          type: "match",
          title: "Proyek cocok untuk Anda",
          message: `"${topMatch.job.title}" di ${topMatch.job.location} — kesesuaian ${topMatch.score}/100.`,
          link: `/jobs/${topMatch.job.id}`,
          priority: "high",
        });
      }

      if (profile && !profile.isVerified) {
        insights.push({
          type: "profile",
          title: "Tingkatkan kepercayaan profil",
          message: "Profil terverifikasi mendapat skor 15 poin lebih tinggi di ranking lamaran.",
          link: "/profile/edit",
          priority: "medium",
        });
      }

      if (profile && profile.skills.length < 3) {
        insights.push({
          type: "profile",
          title: "Lengkapi keahlian Anda",
          message: "Tambahkan minimal 3 keahlian untuk meningkatkan skor pencocokan proyek.",
          link: "/profile/edit",
          priority: "low",
        });
      }
    }

    return {
      userId,
      role: user.role,
      insights: insights.sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2 };
        return order[a.priority] - order[b.priority];
      }),
      generatedAt: new Date().toISOString(),
    };
  },
};
