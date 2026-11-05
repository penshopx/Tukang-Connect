import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, authenticatedRequest } from "@/lib/queryClient";
import { useIsAuthenticated } from "@/hooks/useUser";

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

export function useContracts(enabled = true) {
  const isAuthenticated = useIsAuthenticated();
  return useQuery({
    queryKey: ["/api/contracts"],
    queryFn: async ({ signal }) => {
      const res = await authenticatedRequest("/api/contracts", signal);
      return res.json();
    },
    enabled: isAuthenticated && enabled,
  });
}

export function useContract(id: number) {
  const isAuthenticated = useIsAuthenticated();
  return useQuery({
    queryKey: ["/api/contracts", id],
    queryFn: async ({ signal }) => {
      const res = await authenticatedRequest(`/api/contracts/${id}`, signal);
      return res.json();
    },
    enabled: isAuthenticated && !!id,
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
  const isAuthenticated = useIsAuthenticated();
  return useQuery({
    queryKey: ["/api/disputes"],
    queryFn: async ({ signal }) => {
      const res = await authenticatedRequest("/api/disputes", signal);
      return res.json();
    },
    enabled: isAuthenticated,
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
  const isAuthenticated = useIsAuthenticated();
  return useQuery({
    queryKey: ["/api/portfolio", userId],
    queryFn: async ({ signal }) => {
      const url = userId ? `/api/portfolio/${userId}` : "/api/portfolio";
      const res = userId
        ? await apiRequest("GET", url, undefined, signal)
        : await authenticatedRequest(url, signal);
      return res.json();
    },
    // An expert's published portfolio is public; the current user's is private.
    enabled: !!userId || isAuthenticated,
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

export function useAnalytics(enabled = true) {
  const isAuthenticated = useIsAuthenticated();
  return useQuery({
    queryKey: ["/api/analytics/summary"],
    queryFn: async ({ signal }) => {
      const res = await authenticatedRequest("/api/analytics/summary", signal);
      return res.json();
    },
    enabled: isAuthenticated && enabled,
  });
}

export function useAdminData() {
  const isAuthenticated = useIsAuthenticated();
  return useQuery({
    queryKey: ["/api/admin/status"],
    queryFn: async ({ signal }) => {
      const res = await authenticatedRequest("/api/admin/status", signal);
      return res.json();
    },
    enabled: isAuthenticated,
  });
}

export function useAdminProfiles() {
  const isAuthenticated = useIsAuthenticated();
  return useQuery({
    queryKey: ["/api/admin/profiles"],
    queryFn: async ({ signal }) => {
      const res = await authenticatedRequest("/api/admin/profiles", signal);
      return res.json();
    },
    enabled: isAuthenticated,
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

export function useDashboardMilestones(enabled = true) {
  const isAuthenticated = useIsAuthenticated();
  return useQuery({
    queryKey: ["/api/dashboard/milestones"],
    queryFn: async ({ signal }) => {
      const res = await authenticatedRequest("/api/dashboard/milestones", signal);
      return res.json();
    },
    refetchInterval: 30000,
    enabled: isAuthenticated && enabled,
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
