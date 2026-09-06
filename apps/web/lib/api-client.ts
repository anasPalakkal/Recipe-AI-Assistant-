import { cookies } from "next/headers";

const API_BASE_URL = process.env.API_BASE_URL;

if (!API_BASE_URL) {
  throw new Error("API_BASE_URL is not set");
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

export async function serverFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const cookieStore = await cookies();
  const sid = cookieStore.get("sid");

  const response = await fetch(`${API_BASE_URL}${path}`, {
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
      const body = await response.json();
      message = body.message ?? message;
      code = body.code;
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