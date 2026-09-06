import { cookies } from "next/headers";

function getApiBaseUrl(): string {
  const url = process.env.API_BASE_URL;
  if (!url) {
    throw new Error("API_BASE_URL is not set");
  }
  return url;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function extractErrorMessage(body: unknown): { message?: string; code?: string } {
  if (body && typeof body === "object") {
    const message =
      "message" in body && typeof body.message === "string" ? body.message : undefined;
    const code = "code" in body && typeof body.code === "string" ? body.code : undefined;
    return { message, code };
  }
  return {};
}

export async function serverFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const apiBaseUrl = getApiBaseUrl();
  const cookieStore = await cookies();
  const sid = cookieStore.get("sid");

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(sid && { cookie: `sid=${sid.value}` }),
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let message = "Request failed";
    let code: string | undefined;
    try {
      const body: unknown = await response.json();
      const parsed = extractErrorMessage(body);
      message = parsed.message ?? message;
      code = parsed.code;
    } catch {
      // response wasn't JSON, keep the default message
    }
    throw new ApiError(message, response.status, code);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}