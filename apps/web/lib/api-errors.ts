export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function extractErrorMessage(body: unknown): {
  message?: string;
  code?: string;
  details?: Record<string, unknown>;
} {
  if (!body || typeof body !== "object" || !("error" in body)) {
    return {};
  }

  const err = (body as { error: unknown }).error;
  if (!err || typeof err !== "object") {
    return {};
  }

  const message = "message" in err && typeof err.message === "string" ? err.message : undefined;
  const code = "code" in err && typeof err.code === "string" ? err.code : undefined;
  const details =
    "details" in err && err.details && typeof err.details === "object"
      ? (err.details as Record<string, unknown>)
      : undefined;
  return { message, code, details };
}

export function getRetryAfterSeconds(error: ApiError): number | null {
  const value = error.details?.retryAfterSeconds;
  return typeof value === "number" && value > 0 ? value : null;
}

export async function apiErrorFromResponse(response: Response): Promise<ApiError> {
  const body: unknown = await response.json().catch(() => null);
  const { message, code, details } = extractErrorMessage(body);
  return new ApiError(message ?? "Request failed", response.status, code, details);
}