import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export function useExperts(filters?: { search?: string; category?: string; verified?: boolean }) {
  const params = new URLSearchParams();
  if (filters?.search) params.set("search", filters.search);
  if (filters?.category) params.set("category", filters.category);
  if (filters?.verified) params.set("verified", "true");

  return useQuery({
    queryKey: ["/api/experts", filters],
    queryFn: async () => {
      const res = await fetch(`/api/experts?${params}`, { credentials: "include" });
      if (res.status === 401) return [];
      if (!res.ok) throw new Error("Failed to fetch experts");
      return res.json();
    },
  });
}

export function useExpert(userId: number) {
  return useQuery({
    queryKey: ["/api/experts", userId],
    queryFn: async () => {
      const res = await fetch(`/api/experts/${userId}`, { credentials: "include" });
      if (!res.ok) throw new Error("Expert not found");
      return res.json();
    },
    enabled: !!userId,
  });
}

export function useContracts() {
  return useQuery({
    queryKey: ["/api/contracts"],
    queryFn: async () => {
      const res = await fetch("/api/contracts", { credentials: "include" });
      if (res.status === 401) return [];
      if (!res.ok) throw new Error("Failed to fetch contracts");
      return res.json();
    },
  });
}

export function useContract(id: number) {
  return useQuery({
    queryKey: ["/api/contracts", id],
    queryFn: async () => {
      const res = await fetch(`/api/contracts/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Contract not found");
      return res.json();
    },
    enabled: !!id,
  });
}

export function useCreateContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("POST", "/api/contracts", data);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/contracts"] });
    },
  });
}

export function useUpdateContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Record<string, unknown>) => {
      const res = await apiRequest("PUT", `/api/contracts/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/contracts"] });
    },
  });
}

export function useSignContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/contracts/${id}/sign`, {});
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/contracts"] });
    },
  });
}

export function useDisputes() {
  return useQuery({
    queryKey: ["/api/disputes"],
    queryFn: async () => {
      const res = await fetch("/api/disputes", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });
}

export function useCreateDispute() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("POST", "/api/disputes", data);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/disputes"] });
    },
  });
}

export function usePortfolio(userId?: number) {
  return useQuery({
    queryKey: ["/api/portfolio", userId],
    queryFn: async () => {
      const url = userId ? `/api/portfolio/${userId}` : "/api/portfolio";
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });
}

export function useCreatePortfolioItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("POST", "/api/portfolio", data);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/portfolio"] });
    },
  });
}

export function useReviews(userId: number) {
  return useQuery({
    queryKey: ["/api/reviews", userId],
    queryFn: async () => {
      const res = await fetch(`/api/reviews/${userId}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!userId,
  });
}

export function useAnalytics() {
  return useQuery({
    queryKey: ["/api/analytics/summary"],
    queryFn: async () => {
      const res = await fetch("/api/analytics/summary", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
  });
}

export function useAdminData() {
  return useQuery({
    queryKey: ["/api/admin/status"],
    queryFn: async () => {
      const res = await fetch("/api/admin/status", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
  });
}

export function useAdminProfiles() {
  return useQuery({
    queryKey: ["/api/admin/profiles"],
    queryFn: async () => {
      const res = await fetch("/api/admin/profiles", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });
}

export function useCompleteContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (contractId: number) => {
      const res = await apiRequest("POST", `/api/contracts/${contractId}/complete`, {});
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/contracts"] });
      qc.invalidateQueries({ queryKey: ["/api/jobs"] });
      qc.invalidateQueries({ queryKey: ["/api/notifications"] });
      qc.invalidateQueries({ queryKey: ["/api/dashboard/milestones"] });
    },
  });
}

export function useCreateReview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ workerId, rating, comment, jobId }: { workerId: number; rating: number; comment: string; jobId: number }) => {
      const res = await apiRequest("POST", `/api/reviews/${workerId}`, { rating, comment, jobId });
      return res.json();
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["/api/reviews", vars.workerId] });
      qc.invalidateQueries({ queryKey: ["/api/experts", vars.workerId] });
    },
  });
}

export function useDashboardMilestones() {
  return useQuery({
    queryKey: ["/api/dashboard/milestones"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/milestones", { credentials: "include" });
      if (res.status === 401) return [];
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 30000,
  });
}

export function useDeletePortfolioItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/portfolio/${id}`, undefined);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/portfolio"] });
    },
  });
}
