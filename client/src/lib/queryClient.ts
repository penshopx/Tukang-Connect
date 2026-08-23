import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient();

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown
): Promise<Response> {
  const options: RequestInit = {
    method,
    credentials: "include",
    headers: data ? { "Content-Type": "application/json" } : {},
  };
  if (data) {
    options.body = JSON.stringify(data);
  }
  const response = await fetch(url, options);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || "Request failed");
  }
  return response;
}
