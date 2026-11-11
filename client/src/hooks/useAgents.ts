import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequestJson, authenticatedRequestJson } from "@/lib/queryClient";
import { useIsAuthenticated } from "@/hooks/useUser";

export interface AgentInsight {
  type: string;
  title: string;
  message: string;
  link?: string;
  priority: "high" | "medium" | "low";
}

export interface AgentInsightsResponse {
  userId: number;
  role: string;
  insights: AgentInsight[];
  generatedAt: string;
}

export interface RankedApplicationResult {
  applicationId: number;
  applicantId: number;
  applicantName: string;
  profile: {
    isVerified?: boolean;
    rating?: number;
    ratingCount?: number;
    completedProjects?: number;
    kkniLevel?: string | null;
  } | null;
  totalScore: number;
  breakdown: {
    rating: number;
    experience: number;
    budgetFit: number;
    kkni: number;
    verified: number;
  };
  badge: "Top Pick" | "Good Match" | "Consider" | null;
  proposedBudget: string | null;
  message: string | null;
  createdAt: string;
}

export interface AgentRankResponse {
  agent: string;
  jobId: number;
  ranked: RankedApplicationResult[];
}

export interface PriceSuggestionResponse {
  agent: string;
  category: string;
  location: string;
  locationMultiplier: number;
  baseMin: string;
  baseMax: string;
  adjustedMin: string;
  adjustedMid: string;
  adjustedMax: string;
  unit: string;
  tips: string[];
}

export interface GeneratedMilestone {
  title: string;
  description: string;
  amount: string;
  percentage: number;
  estimatedDays: number;
  dueDate: string;
}

export interface AgentMilestonesResponse {
  agent: string;
  category: string;
  budget: string;
  milestones: GeneratedMilestone[];
}

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
  return useQuery<AgentRankResponse, Error>({
    queryKey: ["/api/agents/rank-applications", jobId],
    queryFn: ({ signal }) =>
      authenticatedRequestJson<AgentRankResponse>(`/api/agents/rank-applications/${jobId}`, signal),
    enabled: isAuthenticated && enabled && !!jobId,
    staleTime: 30_000,
  });
}

export function useAgentInsights(enabled = true) {
  const isAuthenticated = useIsAuthenticated();
  return useQuery<AgentInsightsResponse, Error>({
    queryKey: ["/api/agents/insights"],
    queryFn: ({ signal }) => authenticatedRequestJson<AgentInsightsResponse>("/api/agents/insights", signal),
    enabled: isAuthenticated && enabled,
    staleTime: 60_000,
    retry: false,
  });
}

export function useAgentPriceSuggest() {
  return useMutation<PriceSuggestionResponse, Error, { category: string; location: string; existingBudget?: string }>({
    mutationFn: (data: { category: string; location: string; existingBudget?: string }) =>
      apiRequestJson<PriceSuggestionResponse>("POST", "/api/agents/price-suggest", data),
  });
}

export function useAgentMilestones() {
  return useMutation<AgentMilestonesResponse, Error, { category: string; budget: string; startDate?: string }>({
    mutationFn: (data: { category: string; budget: string; startDate?: string }) =>
      apiRequestJson<AgentMilestonesResponse>("POST", "/api/agents/milestones", data),
  });
}
