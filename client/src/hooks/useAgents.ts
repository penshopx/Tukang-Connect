import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, authenticatedRequest } from "@/lib/queryClient";
import { useIsAuthenticated } from "@/hooks/useUser";

export function useAgentMatchWorkers(jobId: number, enabled = true) {
  return useQuery({
    queryKey: ["/api/agents/match", jobId],
    queryFn: () => fetch(`/api/agents/match/${jobId}`).then((r) => r.json()),
    enabled: enabled && !!jobId,
    staleTime: 60_000,
  });
}

export function useAgentRankApplications(jobId: number, enabled = true) {
  const isAuthenticated = useIsAuthenticated();
  return useQuery({
    queryKey: ["/api/agents/rank-applications", jobId],
    queryFn: ({ signal }) => authenticatedRequest(`/api/agents/rank-applications/${jobId}`, signal),
    enabled: isAuthenticated && enabled && !!jobId,
    staleTime: 30_000,
  });
}

export function useAgentInsights(enabled = true) {
  const isAuthenticated = useIsAuthenticated();
  return useQuery({
    queryKey: ["/api/agents/insights"],
    queryFn: ({ signal }) => authenticatedRequest("/api/agents/insights", signal),
    enabled: isAuthenticated && enabled,
    staleTime: 60_000,
    retry: false,
  });
}

export function useAgentPriceSuggest() {
  return useMutation({
    mutationFn: (data: { category: string; location: string; existingBudget?: string }) =>
      apiRequest("POST", "/api/agents/price-suggest", data),
  });
}

export function useAgentMilestones() {
  return useMutation({
    mutationFn: (data: { category: string; budget: string; startDate?: string }) =>
      apiRequest("POST", "/api/agents/milestones", data),
  });
}
