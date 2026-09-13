// Gives successful API responses a consistent status, message, and data shape.
export class ApiResponse<T> {
  readonly success: boolean;

  constructor(
    public readonly statusCode: number,
    public readonly data: T,
    public readonly message = "Success",
  ) {
    this.success = statusCode >= 200 && statusCode < 400;
  }
}
