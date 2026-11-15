import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Shell } from "../../components/shell";
import { isAdmin } from "../../lib/auth";
import { currentSession } from "../../lib/server-session";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await currentSession();
  if (!session.authenticated) redirect("/login?reason=expired");
  if (!isAdmin(session)) redirect("/login?reason=forbidden");
  return <Shell>{children}</Shell>;
}
