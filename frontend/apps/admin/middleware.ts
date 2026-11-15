import { readSession } from "@ecommerce/api-client/next";
import { NextResponse, type NextRequest } from "next/server";
import { sessionOptions } from "./lib/session";

// Routing convenience only; every backend call is still authorized by the API.
export function middleware(request: NextRequest) {
  const session = readSession((name) => request.cookies.get(name)?.value, sessionOptions.cookieName);
  if (session.authenticated) return NextResponse.next();
  const login = new URL("/login", request.url);
  if (request.nextUrl.pathname !== "/") login.searchParams.set("reason", "expired");
  return NextResponse.redirect(login);
}

export const config = { matcher: ["/((?!login|api|_next/static|_next/image|favicon.ico).*)"] };
