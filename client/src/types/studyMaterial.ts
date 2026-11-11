export interface Material {
  id: number;
  title: string;
  level: string;
  category: string;
  duration: string;
  description: string;
  topics: string[];
  content: string;
  difficulty: "Mudah" | "Menengah" | "Sulit";
  isPremium?: boolean;
}
