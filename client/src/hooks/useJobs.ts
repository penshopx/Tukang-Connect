import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, authenticatedRequest } from "@/lib/queryClient";
import { useIsAuthenticated } from "@/hooks/useUser";

export function useJobs(filters?: { category?: string; status?: string; search?: string }) {
  const params = new URLSearchParams();
  if (filters?.category) params.set("category", filters.category);
  if (filters?.status) params.set("status", filters.status);
  if (filters?.search) params.set("search", filters.search);

  return useQuery({
    queryKey: ["/api/jobs", filters],
    queryFn: async () => {
      const res = await fetch(`/api/jobs?${params}`, { credentials: "include" });
      if (res.status === 401) return [];
      if (!res.ok) throw new Error("Failed to fetch jobs");
      return res.json();
    },
  });
}

export function useJob(id: number) {
  return useQuery({
    queryKey: ["/api/jobs", id],
    queryFn: async () => {
      const res = await fetch(`/api/jobs/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Job not found");
      return res.json();
    },
    enabled: !!id,
  });
}

export function useMyJobs(clientId?: number) {
  const isAuthenticated = useIsAuthenticated();
  return useQuery({
    queryKey: ["/api/jobs", "mine", clientId],
    queryFn: async ({ signal }) => {
      const res = await authenticatedRequest(`/api/jobs?clientId=${clientId}`, signal);
      return res.json();
    },
    enabled: isAuthenticated && !!clientId,
  });
}

export function useCreateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown> & { budget: string }) => {
      const res = await apiRequest("POST", "/api/jobs", data);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/jobs"] });
    },
  });
}

export function useUpdateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Record<string, unknown>) => {
      const res = await apiRequest("PUT", `/api/jobs/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/jobs"] });
    },
  });
}

export function useJobApplications(jobId: number) {
  const isAuthenticated = useIsAuthenticated();
  return useQuery({
    queryKey: ["/api/jobs/applications", jobId],
    queryFn: async ({ signal }) => {
      const res = await authenticatedRequest(`/api/jobs/${jobId}/applications`, signal);
      return res.json();
    },
    enabled: isAuthenticated && !!jobId,
  });
}

export function useApplyJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      jobId,
      message,
      proposedBudget,
    }: {
      jobId: number;
      message?: string;
      proposedBudget?: string;
    }) => {
      const res = await apiRequest("POST", `/api/jobs/${jobId}/apply`, {
        message,
        proposedBudget,
      });
      return res.json();
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["/api/jobs/applications", vars.jobId] });
    },
  });
}

export function useJobMessages(jobId: number) {
  const isAuthenticated = useIsAuthenticated();
  return useQuery({
    queryKey: ["/api/jobs/messages", jobId],
    queryFn: async ({ signal }) => {
      const res = await authenticatedRequest(`/api/jobs/${jobId}/messages`, signal);
      return res.json();
    },
    refetchInterval: 5000,
    enabled: isAuthenticated && !!jobId,
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ jobId, content }: { jobId: number; content: string }) => {
      const res = await apiRequest("POST", `/api/jobs/${jobId}/messages`, { content });
      return res.json();
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["/api/jobs/messages", vars.jobId] });
    },
  });
}

export function useAcceptApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ jobId, appId }: { jobId: number; appId: number }) => {
      const res = await apiRequest("POST", `/api/jobs/${jobId}/applications/${appId}/accept`, {});
      return res.json();
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["/api/jobs", vars.jobId] });
      qc.invalidateQueries({ queryKey: ["/api/jobs/applications", vars.jobId] });
      qc.invalidateQueries({ queryKey: ["/api/contracts"] });
      qc.invalidateQueries({ queryKey: ["/api/notifications"] });
      qc.invalidateQueries({ queryKey: ["/api/agents/rank-applications", vars.jobId] });
    },
  });
}

export function useWorkerApplications(userId?: number) {
  const isAuthenticated = useIsAuthenticated();
  return useQuery({
    queryKey: ["/api/applications/worker", userId],
    queryFn: async ({ signal }) => {
      const res = await authenticatedRequest(`/api/jobs?applicantId=${userId}`, signal);
      return res.json();
    },
    enabled: isAuthenticated && !!userId,
  });
}
