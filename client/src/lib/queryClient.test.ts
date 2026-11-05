import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { apiRequest, authenticatedRequest, ApiRequestError, clearAuthenticatedSession, queryClient } from "./queryClient";

afterEach(() => {
  queryClient.clear();
  vi.unstubAllGlobals();
});

describe("expired session cleanup", () => {
  it.each([undefined, null])("blocks private network I/O without a confirmed user (%s)", async (user) => {
    if (user === null) queryClient.setQueryData(["/api/auth/user"], null);
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await expect(authenticatedRequest("/api/disputes", new AbortController().signal))
      .rejects.toMatchObject({ silent: true });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("blocks a polling callback that fires after session cleanup but before observers rerender", async () => {
    queryClient.setQueryData(["/api/auth/user"], { id: 42 });
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    clearAuthenticatedSession();
    await expect(authenticatedRequest("/api/notifications/unread-count", new AbortController().signal))
      .rejects.toMatchObject({ silent: true });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("forwards cancellation for a confirmed session and never sends an already-aborted request", async () => {
    queryClient.setQueryData(["/api/auth/user"], { id: 42 });
    const fetch = vi.fn().mockResolvedValue(new Response("[]"));
    vi.stubGlobal("fetch", fetch);
    const controller = new AbortController();
    await authenticatedRequest("/api/disputes", controller.signal);
    expect(fetch).toHaveBeenCalledWith("/api/disputes", expect.objectContaining({
      credentials: "include", signal: controller.signal,
    }));
    controller.abort();
    await expect(authenticatedRequest("/api/disputes", controller.signal))
      .rejects.toMatchObject({ silent: true });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("clears cached private data and aborts pending requests without cancelling session verification", async () => {
    const client = new QueryClient();
    client.setQueryData(["/api/auth/user"], { id: 42 });
    client.setQueryData(["/api/disputes"], [{ id: 1 }]);
    let privateSignal: AbortSignal | undefined;
    let authSignal: AbortSignal | undefined;
    let finishAuth!: (user: null) => void;
    const authCheck = client.fetchQuery({
      queryKey: ["/api/auth/user"],
      queryFn: ({ signal }) => {
        authSignal = signal;
        return new Promise<null>((resolve) => { finishAuth = resolve; });
      },
    });
    const privateRequest = client.fetchQuery({
      queryKey: ["/api/contracts"],
      queryFn: ({ signal }) => {
        privateSignal = signal;
        return new Promise(() => {});
      },
    }).catch(() => null);

    clearAuthenticatedSession(client, true);

    expect(privateSignal?.aborted).toBe(true);
    expect(authSignal?.aborted).toBe(false);
    expect(client.getQueryData(["/api/auth/user"])).toBeNull();
    expect(client.getQueryCache().getAll().map((query) => query.queryKey))
      .toEqual([["/api/auth/user"]]);
    finishAuth(null);
    await authCheck;
    await privateRequest;
    client.clear();
  });

  it("ends the session on a private 401 and preserves the error status", async () => {
    queryClient.setQueryData(["/api/auth/user"], { id: 42 });
    queryClient.setQueryData(["/api/me"], { fullName: "Previous user" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ error: "Unauthorized" }), { status: 401 },
    )));

    await expect(apiRequest("GET", "/api/me")).rejects.toMatchObject({
      status: 401,
      name: "ApiRequestError",
    });
    expect(queryClient.getQueryData(["/api/auth/user"])).toBeNull();
    expect(queryClient.getQueryData(["/api/me"])).toBeUndefined();
  });

  it("does not let an older session check restore a user after logout or a private 401", async () => {
    queryClient.setQueryData(["/api/auth/user"], { id: 42 });
    let finishAuth!: (user: { id: number }) => void;
    let authSignal: AbortSignal | undefined;
    const authCheck = queryClient.fetchQuery({
      queryKey: ["/api/auth/user"],
      staleTime: 0,
      queryFn: ({ signal }) => {
        authSignal = signal;
        return new Promise<{ id: number }>((resolve) => { finishAuth = resolve; });
      },
    }).catch(() => null);

    clearAuthenticatedSession();
    expect(authSignal?.aborted).toBe(true);
    finishAuth({ id: 42 });
    await authCheck;
    expect(queryClient.getQueryData(["/api/auth/user"])).toBeNull();
  });

  it.each([["/api/login", 401], ["/api/me", 503], ["/api/admin/status", 403]])(
    "does not confuse %s status %s with an expired session",
    async (url, status) => {
      queryClient.setQueryData(["/api/auth/user"], { id: 42 });
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
        JSON.stringify({ error: "Request rejected" }), { status },
      )));

      await expect(apiRequest("GET", url)).rejects.toBeInstanceOf(ApiRequestError);
      expect(queryClient.getQueryData(["/api/auth/user"])).toEqual({ id: 42 });
    },
  );
});
