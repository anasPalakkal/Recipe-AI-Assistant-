import { ApiError, apiErrorFromResponse } from "./api-errors";
import { getApiBaseUrl, upstreamHeaders } from "./api-upstream";

export { ApiError };

export async function serverFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(await upstreamHeaders()),
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