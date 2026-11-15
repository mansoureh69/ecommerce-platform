import { sessionHandler } from "@ecommerce/api-client/next";
import type { NextRequest } from "next/server";
import { sessionOptions } from "../../../../lib/session";

export const GET = (request: NextRequest) => sessionHandler(request, sessionOptions);
