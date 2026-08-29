import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Baru saja";
  if (diffMins < 60) return `${diffMins} menit lalu`;
  if (diffHours < 24) return `${diffHours} jam lalu`;
  if (diffDays < 7) return `${diffDays} hari lalu`;
  return formatDate(dateString);
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    open: "bg-blue-100 text-blue-700",
    in_progress: "bg-yellow-100 text-yellow-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
    pending: "bg-gray-100 text-gray-700",
    accepted: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
    withdrawn: "bg-amber-100 text-amber-700",
    active: "bg-blue-100 text-blue-700",
    draft: "bg-gray-100 text-gray-700",
    disputed: "bg-orange-100 text-orange-700",
    submitted: "bg-purple-100 text-purple-700",
    approved: "bg-green-100 text-green-700",
    under_review: "bg-yellow-100 text-yellow-700",
    resolved: "bg-green-100 text-green-700",
  };
  return map[status] || "bg-gray-100 text-gray-700";
}

export function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    open: "Terbuka",
    in_progress: "Sedang Berjalan",
    completed: "Selesai",
    cancelled: "Dibatalkan",
    pending: "Menunggu",
    accepted: "Diterima",
    rejected: "Ditolak",
    withdrawn: "Ditarik",
    active: "Aktif",
    draft: "Draft",
    disputed: "Sengketa",
    submitted: "Diajukan",
    approved: "Disetujui",
    under_review: "Sedang Ditinjau",
    resolved: "Terselesaikan",
  };
  return map[status] || status;
}
