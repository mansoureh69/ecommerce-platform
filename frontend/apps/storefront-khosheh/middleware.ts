import { NextRequest, NextResponse } from "next/server";
import { isLocale } from "./i18n/config";

export function middleware(request: NextRequest) {
  const segment = request.nextUrl.pathname.split("/")[1];
  if (segment && isLocale(segment)) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = `/en${request.nextUrl.pathname === "/" ? "" : request.nextUrl.pathname}`;
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/((?!api|_next|.*\\..*).*)"] };
