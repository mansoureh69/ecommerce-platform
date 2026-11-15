import { backendProxy } from "@ecommerce/api-client/next";
import type { NextRequest } from "next/server";
import { sessionOptions } from "../../../../lib/session";

type RouteContext = { params: Promise<{ path: string[] }> };

async function proxy(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  return backendProxy(request, path, sessionOptions);
}

export { proxy as DELETE, proxy as GET, proxy as PATCH, proxy as POST, proxy as PUT };
