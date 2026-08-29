import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type MoneyLike = string | number | bigint;
export const PG_BIGINT_MAX = 9_223_372_036_854_775_807n;

/**
 * Converts a canonical integer monetary value without passing string values
 * through JavaScript's floating-point number representation.
 */
export function moneyToBigInt(value: MoneyLike): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "string") {
    if (!/^-?\d+$/.test(value)) {
      throw new Error("Nilai uang harus berupa digit integer");
    }
    return BigInt(value);
  }
  if (!Number.isSafeInteger(value)) {
    throw new Error("Nilai uang numerik harus berupa integer aman");
  }
  return BigInt(value);
}

export function addMoney(...values: MoneyLike[]): bigint {
  return values.reduce((total, value) => total + moneyToBigInt(value), 0n);
}

export function subtractMoney(left: MoneyLike, right: MoneyLike): bigint {
  return moneyToBigInt(left) - moneyToBigInt(right);
}

export function compareMoney(left: MoneyLike, right: MoneyLike): number {
  const difference = subtractMoney(left, right);
  return difference < 0n ? -1 : difference > 0n ? 1 : 0;
}

export function compareNullableMoney(
  left: MoneyLike | null | undefined,
  right: MoneyLike | null | undefined,
  direction: "asc" | "desc",
): number {
  if (left == null && right == null) return 0;
  if (left == null) return 1;
  if (right == null) return -1;
  const comparison = compareMoney(left, right);
  return direction === "asc" ? comparison : -comparison;
}

export function canonicalMoneyInput(value: string): string {
  if (!/^[1-9]\d*$/.test(value)) {
    throw new Error("Nominal harus berupa string desimal positif");
  }
  const amount = BigInt(value);
  if (amount > PG_BIGINT_MAX) {
    throw new Error("Nominal melebihi batas PostgreSQL BIGINT");
  }
  return amount.toString();
}

export function multiplyMoney(value: MoneyLike, multiplier: number): bigint {
  if (!Number.isSafeInteger(multiplier) || multiplier < 0) {
    throw new Error("Pengali nominal harus berupa integer aman non-negatif");
  }
  return moneyToBigInt(value) * BigInt(multiplier);
}

export function dailyRate(hourlyRate: MoneyLike): bigint {
  return multiplyMoney(hourlyRate, 8);
}

export function scaleMoney(value: MoneyLike, numerator: number, denominator: number): bigint {
  if (!Number.isSafeInteger(numerator) || numerator < 0 || !Number.isSafeInteger(denominator) || denominator <= 0) {
    throw new Error("Rasio nominal tidak valid");
  }
  const divisor = BigInt(denominator);
  return (moneyToBigInt(value) * BigInt(numerator) + divisor / 2n) / divisor;
}

export function allocateMoneyPercentage(value: MoneyLike, percentage: number): bigint {
  if (!Number.isInteger(percentage) || percentage < 0 || percentage > 100) {
    throw new Error("Persentase nominal tidak valid");
  }
  return moneyToBigInt(value) * BigInt(percentage) / 100n;
}

export function formatCurrency(amount: MoneyLike): string {
  const exactAmount = moneyToBigInt(amount);
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(exactAmount);
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
