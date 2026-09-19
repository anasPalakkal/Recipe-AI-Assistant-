export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, 401, "UNAUTHORIZED");
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden", code = "FORBIDDEN") {
    super(message, 403, code);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflict", code = "CONFLICT") {
    super(message, 409, code);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found") {
    super(message, 404, "NOT_FOUND");
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Bad request", code = "BAD_REQUEST", details?: unknown) {
    super(message, 400, code, details);
  }
}

export class GoneError extends AppError {
  constructor(message = "Gone", code = "GONE") {
    super(message, 410, code);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(
    message = "Too many requests",
    code = "TOO_MANY_REQUESTS",
    public readonly retryAfterSeconds?: number,
  ) {
    super(message, 429, code, retryAfterSeconds !== undefined ? { retryAfterSeconds } : undefined);
  }
}

export class UpstreamServiceError extends AppError {
  constructor(message = "Upstream service error") {
    super(message, 502, "UPSTREAM_SERVICE_ERROR");
  }
}

export function formatAppErrorBody(error: AppError) {
  return {
    error: {
      code: error.code,
      message: error.message,
      ...(error.details !== undefined ? { details: error.details } : {}),
    },
  };
}

export class UnprocessableEntityError extends AppError {
  constructor(message = "Unprocessable entity", code = "UNPROCESSABLE_ENTITY", details?: unknown) {
    super(message, 422, code, details);
  }
}