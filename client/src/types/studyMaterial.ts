export interface Material {
  id: number;
  title: string;
  level: string;
  category: string;
  duration: string;
  description: string;
  topics: string[];
  tags: string[];
  content: string;
  difficulty: "Mudah" | "Menengah" | "Sulit";
  isPremium?: boolean;
}
