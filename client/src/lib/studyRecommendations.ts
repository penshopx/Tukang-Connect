import type { Material } from "@/types/studyMaterial";

export interface StudyProfile {
  skills?: string[] | null;
  kkniLevel?: string | null;
}

export interface StudyRecommendation {
  material: Material;
  reason: string;
}

export const STUDY_SKILL_TAGS: Record<string, string[]> = {
  "Tukang Batu": ["plaster", "concrete", "structure"],
  "Tukang Besi Beton": ["concrete", "structure", "steel"],
  "Tukang Kayu": ["roof", "finishing"],
  "Tukang Kayu Konstruksi": ["roof", "structure"],
  "Tukang Cat Bangunan Gedung": ["painting", "finishing"],
  "Tukang Las Listrik": ["steel", "electrical-safety"],
  "Tukang Las Konstruksi": ["steel", "structure"],
  "Mandor Konstruksi": ["management", "safety", "project-control"],
  "Mandor Pekerjaan Beton": ["concrete", "management"],
  "Mekanik Tower Crane": ["mechanical", "safety"],
  "Mekanik Hidrolik Alat Berat": ["mechanical", "safety"],
  "Instalasi Listrik Gedung/Pabrik": ["electrical-installation", "electrical-testing", "electrical-safety", "power-business"],
  "Distribusi & Transmisi Tenaga Listrik": ["power-network", "electrical-safety", "power-business"],
  "Pembangkitan & Energi Terbarukan": ["power-generation", "electrical-safety", "power-business"],
  "K3 Listrik": ["electrical-k3", "electrical-safety", "electrical-testing"],
  "Inspeksi & Pengujian Instalasi Listrik": ["electrical-testing", "electrical-installation", "power-business"],
  "Gardu Induk": ["power-network", "electrical-safety", "power-business"],
  "Pondasi": ["foundation", "structure"],
  "Beton": ["concrete", "structure"],
  "Renovasi Rumah": ["architecture", "finishing", "plumbing", "electrical-installation"],
  "Konstruksi Gedung": ["architecture", "structure", "management", "safety"],
  "Instalasi Listrik": ["electrical-installation", "electrical-testing", "electrical-safety"],
  "Plumbing & Pipa": ["plumbing", "mechanical"],
  "Pengecatan": ["painting", "finishing"],
  "Pemasangan Keramik": ["tile", "finishing"],
  "Pemasangan Atap": ["roof", "structure"],
  "Pemasangan Dinding": ["plaster", "structure"],
  "Arsitektur": ["architecture", "drawing"],
  "Sipil": ["civil", "foundation", "drainage", "structure"],
  "Drainase": ["drainage", "environment"],
  "Tata Lingkungan": ["environment", "landscape", "drainage"],
  "Manajemen Konstruksi": ["management", "project-control", "cost-estimation"],
  "Mekanikal": ["mechanical", "plumbing"],
};

const GENERAL_FALLBACK_TAGS = ["general", "safety", "management", "certification"];
const NORMALIZED_SKILL_TAGS = new Map(
  Object.entries(STUDY_SKILL_TAGS).map(([skill, tags]) => [normalize(skill), tags]),
);

function normalize(value: string): string {
  return value.toLocaleLowerCase("id-ID").normalize("NFKD").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function tagsForSkill(skill: string): string[] {
  const normalizedSkill = normalize(skill);
  const exactTags = NORMALIZED_SKILL_TAGS.get(normalizedSkill);
  if (exactTags) return exactTags;

  if (/listrik|elektrik|kelistrikan/.test(normalizedSkill)) {
    return ["electrical-installation", "electrical-testing", "electrical-safety"];
  }
  if (/transmisi|distribusi|gardu/.test(normalizedSkill)) return ["power-network", "electrical-safety"];
  if (/pembangkit|energi terbarukan|ebt/.test(normalizedSkill)) return ["power-generation", "electrical-safety"];
  if (/mekanik|mekanikal|hvac|plambing|plumbing|pipa/.test(normalizedSkill)) return ["mechanical", "plumbing"];
  if (/arsitektur|desain|gambar/.test(normalizedSkill)) return ["architecture", "drawing", "building-regulation"];
  if (/lingkungan|drainase|lanskap|lansekap/.test(normalizedSkill)) return ["environment", "landscape", "drainage"];
  if (/struktur|beton|besi|pondasi|sipil/.test(normalizedSkill)) return ["structure", "concrete", "foundation", "civil"];
  if (/manajemen|mandor|supervisor|pengawasan/.test(normalizedSkill)) return ["management", "project-control", "safety"];
  if (/cat|keramik|plester|atap|finishing|waterproofing/.test(normalizedSkill)) return ["finishing", "painting", "tile", "plaster", "roof", "waterproofing"];
  if (/k3|keselamatan/.test(normalizedSkill)) return ["safety"];

  return [];
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
    const queues = profileSkills.map((skill) => {
      const tags = tagsForSkill(skill);
      const specific = tags.length
        ? available
            .filter((material) => material.tags.some((tag) => tags.includes(tag)))
            .sort((a, b) =>
              b.tags.filter((tag) => tags.includes(tag)).length -
              a.tags.filter((tag) => tags.includes(tag)).length,
            )
        : [];
      if (specific.length) {
        return {
          candidates: specific,
          reason: `Berdasarkan keahlian: ${skill}`,
        };
      }

      return {
        candidates: available.filter((material) =>
          material.tags.some((tag) => GENERAL_FALLBACK_TAGS.includes(tag)),
        ),
        reason: `Materi dasar untuk bidang Anda: ${skill}`,
      };
    });

    if (targetLevel) {
      queues.push({
        candidates: available.filter((material) => levelPrefix(material.level) === targetLevel),
        reason: `Sesuai level profil: ${profile?.kkniLevel}`,
      });
    }

    const selected = new Map<number, StudyRecommendation>();
    const cursors = queues.map(() => 0);
    let madeProgress = true;
    while (selected.size < limit && madeProgress) {
      madeProgress = false;
      queues.forEach((queue, queueIndex) => {
        while (
          cursors[queueIndex] < queue.candidates.length &&
          selected.has(queue.candidates[cursors[queueIndex]].id)
        ) {
          cursors[queueIndex]++;
        }

        const material = queue.candidates[cursors[queueIndex]];
        if (!material || selected.size >= limit) return;
        selected.set(material.id, { material, reason: queue.reason });
        cursors[queueIndex]++;
        madeProgress = true;
      });
    }

    return [...selected.values()];
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
