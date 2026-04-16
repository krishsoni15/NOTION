/**
 * Root Page
 * 
 * Redirects to dashboard (which will then redirect based on role).
 */

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth/jwt";

export default async function RootPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (token) {
    const user = await verifyToken(token);
    if (user) {
      redirect("/dashboard");
    }
  }

  redirect("/login");
}
