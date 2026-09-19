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

// Backend errors are always shaped as { error: { code, message, details? } }
// (see apps/api/src/lib/errors.ts, formatAppErrorBody). This unwraps that
// envelope — a body without an "error" key just yields {}.
export function extractErrorMessage(body: unknown): { message?: string; code?: string } {
  if (!body || typeof body !== "object" || !("error" in body)) {
    return {};
  }

  const err = (body as { error: unknown }).error;
  if (!err || typeof err !== "object") {
    return {};
  }

  const message = "message" in err && typeof err.message === "string" ? err.message : undefined;
  const code = "code" in err && typeof err.code === "string" ? err.code : undefined;
  return { message, code };
}