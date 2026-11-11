import { describe, expect, it } from "vitest";
import { SKILLS_LIST } from "./constants";
import type { Material } from "@/types/studyMaterial";
import { recommendStudyMaterials, STUDY_SKILL_TAGS } from "./studyRecommendations";

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
    tags: ["electrical-safety", "electrical-testing"],
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
    tags: ["concrete", "structure"],
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
    tags: ["general", "painting", "finishing"],
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

  it("uses basic materials as a fallback when a skill has no matching content", () => {
    const results = recommendStudyMaterials(materials, { skills: ["Tata Lingkungan"] }, new Set());

    expect(results.map(({ material, reason }) => ({ id: material.id, reason }))).toEqual([
      { id: 3, reason: "Materi dasar untuk bidang Anda: Tata Lingkungan" },
    ]);
  });

  it("round-robins unfinished recommendations across multiple profile skills", () => {
    const results = recommendStudyMaterials(
      materials,
      { skills: ["K3 Listrik", "Beton"] },
      new Set(),
    );

    expect(results.map(({ material }) => material.id)).toEqual([1, 2]);
    expect(results.map(({ reason }) => reason)).toEqual([
      "Berdasarkan keahlian: K3 Listrik",
      "Berdasarkan keahlian: Beton",
    ]);
  });

  it("falls back to general material when all skill-specific choices are completed", () => {
    const results = recommendStudyMaterials(materials, { skills: ["K3 Listrik"] }, new Set([1]));

    expect(results[0]).toMatchObject({
      material: { id: 3 },
      reason: "Materi dasar untuk bidang Anda: K3 Listrik",
    });
  });

  it("covers every current profile skill in the structured tag map", () => {
    expect(SKILLS_LIST.filter((skill) => !STUDY_SKILL_TAGS[skill])).toEqual([]);
  });

  it("combines architecture, mechanical, and environment recommendations across skills", () => {
    const disciplineMaterials: Material[] = [
      {
        ...materials[0],
        id: 4,
        title: "Pembacaan Gambar Arsitektur",
        tags: ["architecture", "drawing"],
      },
      {
        ...materials[0],
        id: 5,
        title: "Instalasi Mekanikal dan Plambing",
        tags: ["mechanical", "plumbing"],
      },
      {
        ...materials[0],
        id: 6,
        title: "Drainase dan Tata Lingkungan",
        tags: ["drainage", "environment"],
      },
    ];

    const results = recommendStudyMaterials(
      disciplineMaterials,
      { skills: ["Arsitektur", "Mekanik Tower Crane", "Tata Lingkungan"] },
      new Set(),
    );

    expect(results.map(({ material }) => material.id)).toEqual([4, 5, 6]);
    expect(results.map(({ reason }) => reason)).toEqual([
      "Berdasarkan keahlian: Arsitektur",
      "Berdasarkan keahlian: Mekanik Tower Crane",
      "Berdasarkan keahlian: Tata Lingkungan",
    ]);
  });
});
