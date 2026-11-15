import type { ProblemDetails } from "@ecommerce/api-contracts";

export type ApiErrorKind =
  | "validation"
  | "unauthorized"
  | "forbidden"
  | "not-found"
  | "conflict"
  | "domain"
  | "network"
  | "server";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly kind: ApiErrorKind,
    public readonly problem?: ProblemDetails,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function kindForStatus(status: number): ApiErrorKind {
  if (status === 400) return "validation";
  if (status === 401) return "unauthorized";
  if (status === 403) return "forbidden";
  if (status === 404) return "not-found";
  if (status === 409) return "conflict";
  if (status === 422) return "domain";
  return "server";
}

function isProblemDetails(value: unknown): value is ProblemDetails {
  return typeof value === "object" && value !== null;
}

export async function responseError(response: Response): Promise<ApiError> {
  let problem: ProblemDetails | undefined;
  try {
    const value: unknown = await response.json();
    if (isProblemDetails(value)) problem = value;
  } catch {
    problem = undefined;
  }

  const message =
    problem?.detail ?? problem?.title ?? `Request failed with status ${response.status}.`;
  return new ApiError(message, response.status, kindForStatus(response.status), problem);
}
