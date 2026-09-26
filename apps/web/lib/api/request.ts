import { apiErrorFromResponse } from "@/lib/api-errors";

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

// Separate from request(): FormData must NOT get a manual content-type
// header. The browser sets multipart/form-data with the correct boundary
// itself - overriding it, even to the same-looking value, breaks parsing
// on the receiving end.
async function requestForm<T>(path: string, formData: FormData): Promise<T> {
  const response = await fetch(path, { method: "POST", body: formData });

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

export function apiPostForm<T>(path: string, formData: FormData): Promise<T> {
  return requestForm<T>(path, formData);
}

export function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return request<T>(path, { method: "PATCH", body: JSON.stringify(body) });
}

export function apiDelete<T>(path: string): Promise<T> {
  return request<T>(path, { method: "DELETE" });
}