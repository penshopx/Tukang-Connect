import { describe, expect, it } from "vitest";
import type { Material } from "@/types/studyMaterial";
import { recommendStudyMaterials } from "./studyRecommendations";

const materials: Material[] = [
  {
    id: 1,
    title: "Instalasi Pemanfaatan, K3 & Pengujian Listrik",
    level: "Materi Pengantar",
    category: "Ketenagalistrikan",
    duration: "30 menit",
    difficulty: "Menengah",
    description: "Materi keselamatan listrik",
    topics: ["K3 Listrik", "Instalasi Pemanfaatan"],
    content: "",
  },
  {
    id: 2,
    title: "Teknik Pembesian & Pengecoran Beton",
    level: "Level 4 - Supervisor",
    category: "Struktur",
    duration: "35 menit",
    difficulty: "Menengah",
    description: "Materi struktur beton",
    topics: ["Beton"],
    content: "",
  },
  {
    id: 3,
    title: "Pengenalan Konstruksi",
    level: "Materi Pengantar",
    category: "Umum",
    duration: "15 menit",
    difficulty: "Mudah",
    description: "Materi dasar",
    topics: ["Dasar"],
    content: "",
  },
];

describe("recommendStudyMaterials", () => {
  it("matches profile skills and explains the reason for each recommendation", () => {
    const results = recommendStudyMaterials(
      materials,
      { skills: ["K3 Listrik"], kkniLevel: "Level 4 - Supervisor" },
      new Set(),
    );

    expect(results[0]).toMatchObject({
      material: { id: 1 },
      reason: "Berdasarkan keahlian: K3 Listrik",
    });
    expect(results[1]).toMatchObject({
      material: { id: 2 },
      reason: "Sesuai level profil: Level 4 - Supervisor",
    });
  });

  it("uses beginner materials when profile data is unavailable and skips completed materials", () => {
    const results = recommendStudyMaterials(materials, null, new Set([3]));

    expect(results).toEqual([]);
  });

  it("uses basic materials as a fallback when the profile has no matching skill or level", () => {
    const results = recommendStudyMaterials(materials, { skills: ["Tukang Kayu"] }, new Set());

    expect(results.map(({ material, reason }) => ({ id: material.id, reason }))).toEqual([
      { id: 3, reason: "Materi dasar untuk memulai" },
    ]);
  });
});
