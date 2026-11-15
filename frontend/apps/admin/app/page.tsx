import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function Home() {
  const cookieStore = await cookies();
  redirect(cookieStore.has("ecommerce_admin_session") ? "/dashboard" : "/login");
}
