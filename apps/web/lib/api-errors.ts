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