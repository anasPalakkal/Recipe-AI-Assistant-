import { cookies } from "next/headers";
import { ApiError,apiErrorFromResponse } from "./api-errors";

export { ApiError };

function getApiBaseUrl(): string {
  const url = process.env.API_BASE_URL;
  if (!url) {
    throw new Error("API_BASE_URL is not set");
  }
  return url;
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
  throw await apiErrorFromResponse(response);
}

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}