import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export function useAgentMatchWorkers(jobId: number, enabled = true) {
  return useQuery({
    queryKey: ["/api/agents/match", jobId],
    queryFn: () => fetch(`/api/agents/match/${jobId}`).then((r) => r.json()),
    enabled: enabled && !!jobId,
    staleTime: 60_000,
  });
}

export function useAgentRankApplications(jobId: number, enabled = true) {
  return useQuery({
    queryKey: ["/api/agents/rank-applications", jobId],
    queryFn: () => apiRequest("GET", `/api/agents/rank-applications/${jobId}`),
    enabled: enabled && !!jobId,
    staleTime: 30_000,
  });
}

export function useAgentInsights(enabled = true) {
  return useQuery({
    queryKey: ["/api/agents/insights"],
    queryFn: ({ signal }) => apiRequest("GET", "/api/agents/insights", undefined, signal),
    enabled,
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
