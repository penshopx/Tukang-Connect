import { CancelledError, QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
});

// Use the same cleanup for logout, a failed private request, and an expired
// session discovered by the session check. Only that check may preserve itself;
// logout and private 401s must also abort an older check that could restore user.
export function clearAuthenticatedSession(client = queryClient, preserveSessionCheck = false) {
  const privateQueries = {
    predicate: (query: { queryKey: readonly unknown[] }) =>
      query.queryKey[0] !== "/api/auth/user",
  };
  void client.cancelQueries(preserveSessionCheck ? privateQueries : undefined);
  client.setQueryData(["/api/auth/user"], null);
  client.removeQueries(privateQueries);
}

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
  }
}

export function authenticatedRequest(url: string, signal: AbortSignal): Promise<Response> {
  const session = queryClient.getQueryState(["/api/auth/user"]);
  // Observer "enabled" updates happen on React's next render. A polling timer
  // can fire before then, so check the current cache again at the network edge.
  if (signal.aborted || !session?.data || session.status !== "success") {
    return Promise.reject(new CancelledError({ silent: true }));
  }
  return apiRequest("GET", url, undefined, signal);
}

export async function authenticatedRequestJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await authenticatedRequest(url, signal);
  return response.json() as Promise<T>;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown,
  signal?: AbortSignal
): Promise<Response> {
  const options: RequestInit = {
    method,
    credentials: "include",
    headers: data ? { "Content-Type": "application/json" } : {},
    signal,
  };
  if (data) {
    options.body = JSON.stringify(data);
  }
  const response = await fetch(url, options);
  if (!response.ok) {
    // Invalid credentials are not an expired session.
    if (response.status === 401 && url !== "/api/login" && url !== "/api/register") {
      clearAuthenticatedSession();
    }
    const error = await response.json().catch(() => ({ error: "Request failed" }));
    throw new ApiRequestError(
      error.error || "Request failed",
      response.status,
      error.code
    );
  }
  return response;
}

export async function apiRequestJson<T>(
  method: string,
  url: string,
  data?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const response = await apiRequest(method, url, data, signal);
  return response.json() as Promise<T>;
}
