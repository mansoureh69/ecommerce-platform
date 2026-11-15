import { ApiError, responseError } from "./errors";

export interface ApiClientOptions {
  baseUrl: string;
  getAccessToken?: () => string | null | Promise<string | null>;
  fetch?: typeof globalThis.fetch;
}

export interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
}

function urlFor(baseUrl: string, path: string): string {
  return `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

export class HttpClient {
  private readonly fetcher: typeof globalThis.fetch;

  constructor(private readonly options: ApiClientOptions) {
    this.fetcher = options.fetch ?? globalThis.fetch;
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const headers = new Headers(options.headers);
    headers.set("Accept", "application/json");

    const token = await this.options.getAccessToken?.();
    if (token) headers.set("Authorization", `Bearer ${token}`);

    let body: BodyInit | undefined;
    if (options.body instanceof FormData) {
      body = options.body;
    } else if (options.body !== undefined) {
      headers.set("Content-Type", "application/json");
      body = JSON.stringify(options.body);
    }

    let response: Response;
    try {
      response = await this.fetcher(urlFor(this.options.baseUrl, path), {
        ...options,
        headers,
        body,
      });
    } catch (cause) {
      throw new ApiError(
        cause instanceof Error ? cause.message : "Network request failed.",
        0,
        "network",
      );
    }

    if (!response.ok) throw await responseError(response);
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }
}
