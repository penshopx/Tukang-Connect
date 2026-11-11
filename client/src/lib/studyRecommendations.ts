import type { Material } from "@/types/studyMaterial";

export interface StudyProfile {
  skills?: string[] | null;
  kkniLevel?: string | null;
}

export interface StudyRecommendation {
  material: Material;
  reason: string;
}

const SKILL_GROUPS: { matches: string[]; terms: string[] }[] = [
  {
    matches: ["distribusi", "transmisi", "gardu induk"],
    terms: ["transmisi", "distribusi", "gardu induk"],
  },
  {
    matches: ["pembangkit", "energi terbarukan", "ebt"],
    terms: ["pembangkitan", "energi baru terbarukan", "ebt"],
  },
  {
    matches: ["k3 listrik"],
    terms: ["k3 listrik", "keselamatan listrik", "pengujian listrik"],
  },
  {
    matches: ["listrik", "elektrikal", "kelistrikan"],
    terms: ["listrik", "kelistrikan", "elektrikal", "instalasi pemanfaatan"],
  },
  {
    matches: ["k3"],
    terms: ["k3", "keselamatan", "bahaya", "risiko"],
  },
  {
    matches: ["beton", "besi", "struktur", "pondasi", "sipil"],
    terms: ["beton", "besi", "struktur", "pondasi", "sipil"],
  },
  {
    matches: ["cat", "keramik", "plester", "atap", "finishing", "waterproofing"],
    terms: ["pengecatan", "cat", "keramik", "plester", "atap", "waterproofing"],
  },
  {
    matches: ["pipa", "plambing", "plumbing", "mekanikal", "sanitasi"],
    terms: ["pipa", "plambing", "plumbing", "mekanikal", "sanitasi"],
  },
  {
    matches: ["manajemen", "mandor", "pengawasan", "supervisor"],
    terms: ["manajemen", "pengawasan", "supervisor", "penjadwalan"],
  },
];

function normalize(value: string): string {
  return value.toLocaleLowerCase("id-ID").normalize("NFKD").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function termsForSkill(skill: string): string[] {
  const normalizedSkill = normalize(skill);
  const group = SKILL_GROUPS.find(({ matches }) =>
    matches.some((match) => normalizedSkill.includes(normalize(match))),
  );
  return group?.terms.map(normalize) ?? [normalizedSkill];
}

function materialSearchText(material: Material): string {
  return normalize([
    material.title,
    material.category,
    material.description,
    material.level,
    ...material.topics,
  ].join(" "));
}

function levelPrefix(level?: string | null): string | null {
  return level?.match(/Level\s+\d+/i)?.[0].toLocaleLowerCase("id-ID") ?? null;
}

export function recommendStudyMaterials(
  materials: Material[],
  profile: StudyProfile | null | undefined,
  completedIds: Set<number>,
  limit = 3,
): StudyRecommendation[] {
  const available = materials.filter((material) => !completedIds.has(material.id));
  const profileSkills = [...new Set((profile?.skills ?? []).filter((skill) => skill.trim()))];
  const targetLevel = levelPrefix(profile?.kkniLevel);

  if (profileSkills.length) {
    const skillRecommendations = available
      .map((material) => {
        const corpus = materialSearchText(material);
        const matchingSkill = profileSkills.find((skill) =>
          termsForSkill(skill).some((term) => term && corpus.includes(term)),
        );
        const matchesLevel = !!targetLevel && levelPrefix(material.level) === targetLevel;
        return {
          material,
          score: (matchingSkill ? 100 : 0) + (matchesLevel ? 10 : 0),
          reason: matchingSkill
            ? `Berdasarkan keahlian: ${matchingSkill}`
            : matchesLevel
              ? `Sesuai level profil: ${profile?.kkniLevel}`
              : "",
        };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    if (skillRecommendations.length) {
      return skillRecommendations.slice(0, limit).map(({ material, reason }) => ({ material, reason }));
    }
  }

  if (targetLevel) {
    const levelRecommendations = available
      .filter((material) => levelPrefix(material.level) === targetLevel)
      .slice(0, limit)
      .map((material) => ({
        material,
        reason: `Sesuai level profil: ${profile?.kkniLevel}`,
      }));
    if (levelRecommendations.length) return levelRecommendations;
  }

  return available
    .filter((material) => material.difficulty === "Mudah")
    .slice(0, limit)
    .map((material) => ({ material, reason: "Materi dasar untuk memulai" }));
}
