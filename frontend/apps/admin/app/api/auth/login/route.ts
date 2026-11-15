import { loginHandler } from "@ecommerce/api-client/next";
import type { NextRequest } from "next/server";
import { sessionOptions } from "../../../../lib/session";

export const POST = (request: NextRequest) => loginHandler(request, sessionOptions);
