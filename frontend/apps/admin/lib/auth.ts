import type { Session } from "@ecommerce/api-contracts";

export const ADMIN_ROLE = "Admin";

export function isAdmin(session: Pick<Session, "authenticated" | "roles">): boolean {
  return session.authenticated && session.roles.includes(ADMIN_ROLE);
}
