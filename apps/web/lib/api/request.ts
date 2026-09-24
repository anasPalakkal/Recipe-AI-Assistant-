import { apiErrorFromResponse } from "@/lib/api-errors";
// Calls a same-origin Next.js Route Handler (e.g. /api/auth/login), never
// the backend directly — the browser can't reach Fastify itself, and
// doesn't need to: same-origin fetch sends the httpOnly session cookie
// automatically, with no manual cookie handling on this side.
async function request<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...init.headers },
  });

 if (!response.ok) {
  throw await apiErrorFromResponse(response);
}

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>(path, { method: "GET" });
}

export function apiPost<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: "POST", body: JSON.stringify(body) });
}

export function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: "PATCH", body: JSON.stringify(body) });
}

export function apiDelete<T>(path: string): Promise<T> {
  return request<T>(path, { method: "DELETE" });
}