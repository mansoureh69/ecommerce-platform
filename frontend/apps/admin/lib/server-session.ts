import { readSession } from "@ecommerce/api-client/next";
import { cookies } from "next/headers";
import { sessionOptions } from "./session";

export async function currentSession() {
  const store = await cookies();
  return readSession((name) => store.get(name)?.value, sessionOptions.cookieName);
}
