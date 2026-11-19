export class AppError extends Error {
  constructor(
    public code: string,
    message = code,
  ) {
    super(message);
    this.name = "AppError";
  }
}
