import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export function useUser() {
  return useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: async () => {
      const res = await fetch("/api/auth/user", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    retry: false,
    staleTime: 60000,
  });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const res = await apiRequest("POST", "/api/login", data);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });
}

export function useRegister() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      username: string;
      email: string;
      password: string;
      fullName: string;
      role: string;
    }) => {
      const res = await apiRequest("POST", "/api/register", data);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      qc.clear();
    },
  });
}

export function useProfile() {
  return useQuery({
    queryKey: ["/api/me"],
    queryFn: async () => {
      const res = await fetch("/api/me", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    retry: false,
  });
}

export function useUpdateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (role: string) => {
      const res = await apiRequest("PUT", "/api/users/me/role", { role });
      return res.json();
    },
    onSuccess: (result: { role?: string }) => {
      // Update role-dependent UI immediately. The navbar and profile page use
      // separate cached user queries, so invalidation alone can leave either
      // surface showing the old role until its refetch completes.
      if (result?.role) {
        const updateCachedRole = (current: { role?: string } | null | undefined) =>
          current ? { ...current, role: result.role } : current;

        qc.setQueryData(["/api/auth/user"], updateCachedRole);
        qc.setQueryData(["/api/me"], updateCachedRole);
      }

      // Revalidate both shapes so the optimistic cache update cannot drift
      // from the persisted user record.
      qc.invalidateQueries({ queryKey: ["/api/auth/user"] });
      qc.invalidateQueries({ queryKey: ["/api/me"] });
    },
  });
}

export function useCompleteOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", "/api/users/me/onboarding", { completed: true });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/auth/user"] });
      qc.invalidateQueries({ queryKey: ["/api/me"] });
    },
  });
}

export function useDisconnectReplit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", "/api/auth/replit/link");
      return res.json();
    },
    onSuccess: (result) => {
      const clearReplitId = (current: any) =>
        current ? { ...current, replitId: result?.replitId ?? null } : current;

      // Update both cached user shapes immediately, then revalidate them from
      // the server so the connected-account card cannot remain stale.
      qc.setQueryData(["/api/me"], clearReplitId);
      qc.setQueryData(["/api/auth/user"], clearReplitId);
      qc.invalidateQueries({ queryKey: ["/api/me"] });
      qc.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("PUT", "/api/profiles", data);
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/me"] });
    },
  });
}

export function useNotifications() {
  return useQuery({
    queryKey: ["/api/notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 30000,
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ["/api/notifications/unread-count"],
    queryFn: async () => {
      const res = await fetch("/api/notifications/unread-count", { credentials: "include" });
      if (!res.ok) return { count: 0 };
      return res.json();
    },
    refetchInterval: 30000,
  });
}
