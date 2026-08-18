export class HttpError extends Error {
  statusCode: number;
  detail: unknown;

  constructor(statusCode: number, detail: unknown) {
    super(typeof detail === "string" ? detail : (detail as any)?.message || "Request failed");
    this.statusCode = statusCode;
    this.detail = detail;
  }
}
