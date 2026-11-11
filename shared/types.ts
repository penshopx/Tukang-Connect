import type { Money } from "./money.js";

export type UserRole = "pelanggan" | "tukang" | "admin";

export interface User {
  id: number;
  username: string;
  email: string;
  password: string;
  role: UserRole;
  fullName: string;
  createdAt: string;
  onboardingCompleted: boolean;
  replitId?: string | null;
}

export interface Profile {
  id: number;
  userId: number;
  bio: string | null;
  location: string | null;
  skills: string[];
  category: string | null;
  hourlyRate: Money | null;
  isVerified: boolean;
  isMandor: boolean;
  certifications: string[];
  avatarUrl: string | null;
  completedProjects: number;
  rating: number;
  ratingCount: number;
  yearsExperience: number | null;
  phone: string | null;
  kkniLevel: string | null;
}

export interface Job {
  id: number;
  title: string;
  description: string;
  category: string;
  budget: Money;
  location: string;
  status: "open" | "in_progress" | "completed" | "cancelled";
  clientId: number;
  workerId: number | null;
  createdAt: string;
  deadline: string | null;
}

export interface JobApplication {
  id: number;
  jobId: number;
  applicantId: number;
  message: string | null;
  proposedBudget: Money | null;
  status: "pending" | "accepted" | "rejected" | "withdrawn";
  createdAt: string;
}

export interface Contract {
  id: number;
  jobId: number;
  clientId: number;
  workerId: number;
  title: string;
  description: string;
  totalValue: Money;
  status: "draft" | "active" | "completed" | "disputed";
  clientSigned: boolean;
  workerSigned: boolean;
  createdAt: string;
  startDate: string | null;
  endDate: string | null;
}

export interface Milestone {
  id: number;
  contractId: number;
  title: string;
  description: string;
  amount: Money;
  status: "pending" | "in_progress" | "submitted" | "approved" | "rejected";
  dueDate: string | null;
  completedAt: string | null;
  notes: string | null;
}

export interface ContractReport {
  id: number;
  contractId: number;
  reporterId: number;
  type: "progress" | "problem" | "completion";
  title: string;
  description: string;
  attachments: string[];
  createdAt: string;
}

export interface Dispute {
  id: number;
  contractId: number;
  raisedById: number;
  reason: string;
  status: "open" | "under_review" | "resolved";
  resolution: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface Review {
  id: number;
  reviewerId: number;
  revieweeId: number;
  jobId: number;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface PortfolioItem {
  id: number;
  userId: number;
  title: string;
  description: string;
  category: string;
  imageUrl: string | null;
  completedAt: string;
  clientName: string | null;
}

export interface Notification {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  isRead: boolean;
  createdAt: string;
  link: string | null;
}

export interface Message {
  id: number;
  jobId: number;
  senderId: number;
  content: string;
  createdAt: string;
}

export const JOB_CATEGORIES = [
  "Renovasi",
  "Konstruksi Baru",
  "Listrik",
  "Plambing",
  "Pengecatan",
  "Lantai",
  "Atap",
  "Pondasi",
  "Interior",
  "Arsitektur",
  "Las",
  "Kayu",
  "Batu & Bata",
  "Beton",
  "Sipil",
  "Lainnya",
];

export const SKILLS_LIST = [
  "Tukang Batu",
  "Tukang Besi Beton",
  "Tukang Kayu",
  "Tukang Kayu Konstruksi",
  "Tukang Cat Bangunan Gedung",
  "Tukang Las Listrik",
  "Tukang Las Konstruksi",
  "Mandor Konstruksi",
  "Mandor Pekerjaan Beton",
  "Mekanik Tower Crane",
  "Mekanik Hidrolik Alat Berat",
  "Instalasi Listrik Gedung/Pabrik",
  "Distribusi & Transmisi Tenaga Listrik",
  "Pembangkitan & Energi Terbarukan",
  "K3 Listrik",
  "Inspeksi & Pengujian Instalasi Listrik",
  "Gardu Induk",
  "Pondasi",
  "Beton",
  "Renovasi Rumah",
  "Konstruksi Gedung",
  "Instalasi Listrik",
  "Plumbing & Pipa",
  "Pengecatan",
  "Pemasangan Keramik",
  "Pemasangan Atap",
  "Pemasangan Dinding",
  "Arsitektur",
  "Sipil",
  "Drainase",
];

export const KKNI_LEVELS = [
  "Level 1 - Operator Pelaksana",
  "Level 2 - Teknisi/Analis",
  "Level 3 - Teknisi/Analis Madya",
  "Level 4 - Supervisor",
  "Level 5 - Kepala Pelaksana",
  "Level 6 - Ahli Muda",
  "Level 7 - Ahli Madya",
  "Level 8 - Ahli Utama",
  "Level 9 - Konsultan",
];
