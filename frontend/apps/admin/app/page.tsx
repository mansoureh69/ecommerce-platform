import { redirect } from "next/navigation";
import { isAdmin } from "../lib/auth";
import { currentSession } from "../lib/server-session";

export default async function Home() {
  redirect(isAdmin(await currentSession()) ? "/dashboard" : "/login");
}
