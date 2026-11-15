import type { AuthResult, Credentials, Session } from "@ecommerce/api-contracts";
import { NextRequest, NextResponse } from "next/server";

export interface SessionHandlerOptions {
  cookieName: string;
  backendUrl?: string;
}

function backendUrl(options: SessionHandlerOptions, path: string): URL {
  const origin = options.backendUrl ?? process.env.BACKEND_API_URL;
  if (!origin) throw new Error("BACKEND_API_URL is required.");
  return new URL(path, `${origin.replace(/\/$/, "")}/`);
}

function csrfIsValid(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  return origin === null || origin === request.nextUrl.origin;
}

function cookieOptions(expiresAt: string) {
  return {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt),
  };
}

function expiresCookieName(cookieName: string): string {
  return `${cookieName}_expires`;
}

function decodeRoles(token: string): string[] {
  try {
    const encoded = token.split(".")[1];
    if (!encoded) return [];
    const normalized = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(normalized)) as Record<string, unknown>;
    const role = payload.role;
    if (typeof role === "string") return [role];
    if (Array.isArray(role)) return role.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
  return [];
}

async function authenticate(
  request: NextRequest,
  action: "login" | "register",
  options: SessionHandlerOptions,
): Promise<NextResponse> {
  if (!csrfIsValid(request)) {
    return NextResponse.json({ title: "Invalid request origin", status: 403 }, { status: 403 });
  }

  const credentials = (await request.json()) as Credentials;
  const backendResponse = await fetch(backendUrl(options, `/api/auth/${action}`), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(credentials),
    cache: "no-store",
  });

  if (!backendResponse.ok) {
    return new NextResponse(await backendResponse.text(), {
      status: backendResponse.status,
      headers: { "Content-Type": backendResponse.headers.get("content-type") ?? "application/problem+json" },
    });
  }

  const auth = (await backendResponse.json()) as AuthResult;
  if (!auth.success || !auth.token || !auth.expiresAt) {
    return NextResponse.json({ title: auth.error ?? "Authentication failed", status: 401 }, { status: 401 });
  }

  const session: Session = {
    authenticated: true,
    expiresAt: auth.expiresAt,
    roles: decodeRoles(auth.token),
  };
  const response = NextResponse.json(session);
  const settings = cookieOptions(auth.expiresAt);
  response.cookies.set(options.cookieName, auth.token, settings);
  response.cookies.set(expiresCookieName(options.cookieName), auth.expiresAt, settings);
  return response;
}

export function loginHandler(request: NextRequest, options: SessionHandlerOptions) {
  return authenticate(request, "login", options);
}

export function registerHandler(request: NextRequest, options: SessionHandlerOptions) {
  return authenticate(request, "register", options);
}

export function logoutHandler(request: NextRequest, options: SessionHandlerOptions): NextResponse {
  if (!csrfIsValid(request)) {
    return NextResponse.json({ title: "Invalid request origin", status: 403 }, { status: 403 });
  }
  const response = new NextResponse(null, { status: 204 });
  response.cookies.delete(options.cookieName);
  response.cookies.delete(expiresCookieName(options.cookieName));
  return response;
}

// Roles come from the unverified JWT payload: fine for routing UX, never for authorization (the backend decides).
export function readSession(get: (name: string) => string | undefined, cookieName: string): Session {
  const token = get(cookieName);
  const expiresAt = get(expiresCookieName(cookieName)) ?? null;
  const authenticated = Boolean(token && expiresAt && new Date(expiresAt).getTime() > Date.now());
  return {
    authenticated,
    expiresAt: authenticated ? expiresAt : null,
    roles: authenticated && token ? decodeRoles(token) : [],
  };
}

export function sessionHandler(request: NextRequest, options: SessionHandlerOptions): NextResponse {
  return NextResponse.json(readSession((name) => request.cookies.get(name)?.value, options.cookieName));
}

export async function backendProxy(
  request: NextRequest,
  segments: string[],
  options: SessionHandlerOptions,
): Promise<NextResponse> {
  if (!["GET", "HEAD", "OPTIONS"].includes(request.method) && !csrfIsValid(request)) {
    return NextResponse.json({ title: "Invalid request origin", status: 403 }, { status: 403 });
  }

  const path = `/api/${segments.map(encodeURIComponent).join("/")}${request.nextUrl.search}`;
  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("Content-Type", contentType);
  headers.set("Accept", request.headers.get("accept") ?? "application/json");
  const token = request.cookies.get(options.cookieName)?.value;
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const hasBody = !["GET", "HEAD"].includes(request.method);
  const backendResponse = await fetch(backendUrl(options, path), {
    method: request.method,
    headers,
    body: hasBody ? await request.arrayBuffer() : undefined,
    cache: "no-store",
    redirect: "manual",
  });

  const responseHeaders = new Headers();
  const responseContentType = backendResponse.headers.get("content-type");
  if (responseContentType) responseHeaders.set("Content-Type", responseContentType);
  const location = backendResponse.headers.get("location");
  if (location) responseHeaders.set("Location", location);
  return new NextResponse(backendResponse.body, {
    status: backendResponse.status,
    headers: responseHeaders,
  });
}
