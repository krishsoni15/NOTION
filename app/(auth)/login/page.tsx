/**
 * Login Page
 * 
 * Single login page for the entire application.
 * Username + password authentication only.
 */

import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ disabled?: string; error?: string; mode?: string }>;
}) {
  // Await searchParams as it's now a Promise in Next.js
  const params = await searchParams;

  // If user is already authenticated, redirect to dashboard
  // UNLESS they're adding another account (mode=add-account)
  const { userId } = await auth();

  if (userId && params?.mode !== "add-account") {
    redirect("/dashboard");
  }

  return <LoginForm disabled={params?.disabled === "true"} />;
}

