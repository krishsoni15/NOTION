/**
 * Login Page
 * 
 * Single login page for the entire application.
 * Username + password authentication only.
 */

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth/jwt";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ disabled?: string; error?: string; mode?: string }>;
}) {
  const params = await searchParams;

  // If user is already authenticated, redirect to dashboard
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (token) {
    const user = await verifyToken(token);
    if (user && params?.mode !== "add-account") {
      redirect("/dashboard");
    }
  }

  return <LoginForm disabled={params?.disabled === "true"} />;
}
