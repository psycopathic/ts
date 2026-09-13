// Represents an HTTP error with a status code and optional validation details.
export class ApiError extends Error {
  readonly success = false;

  constructor(
    public readonly statusCode: number,
    message = "Something went wrong",
    public readonly errors: unknown[] = [],
  ) {
    super(message);
    this.name = "ApiError";
    Error.captureStackTrace(this, this.constructor);
  }
}
