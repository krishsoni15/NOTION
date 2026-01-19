"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useSignIn, useUser, useClerk } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { User, Lock, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { addOrUpdateSession, setActiveSession } from "@/lib/auth/session-manager";

interface LoginFormProps {
  disabled?: boolean;
}

export function LoginForm({ disabled = false }: LoginFormProps) {
  const { isLoaded, signIn, setActive } = useSignIn();
  const clerk = useClerk();
  const router = useRouter();
  const searchParams = useSearchParams();
  // FIX: Use the auto-create version from users.ts
  const syncUser = useMutation(api.users.syncCurrentUser);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Remember Me state
  const [rememberMe, setRememberMe] = useState(true); // Default checked

  // Security: Rate limiting state
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);



  useEffect(() => {
    const errorParam = searchParams?.get("error");
    const disabledParam = searchParams?.get("disabled");

    if (errorParam || disabledParam) {
      let msg = "An error occurred.";
      if (errorParam === "not_found") msg = "Account not found.";
      if (errorParam === "auth_error") msg = "Authentication failed.";
      if (errorParam === "no_role") msg = "Account not properly configured. Contact administrator.";
      if (disabledParam === "true") msg = "Account disabled.";
      setError(msg);
      setTimeout(() => router.replace("/login", { scroll: false }), 2000);
    }
  }, [searchParams, router]);

  // Security: Clear lockout timer
  useEffect(() => {
    if (lockoutUntil && Date.now() >= lockoutUntil) {
      setLockoutUntil(null);
      setFailedAttempts(0);
    }
  }, [lockoutUntil]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;

    // Security: Check account lockout
    if (lockoutUntil && Date.now() < lockoutUntil) {
      const remainingSeconds = Math.ceil((lockoutUntil - Date.now()) / 1000);
      setError(`Too many failed attempts. Please try again in ${remainingSeconds} seconds.`);
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      const result = await signIn.create({
        identifier: username.trim(),
        password,
        strategy: "password",
      });

      if (result.status === "complete") {
        // IMPORTANT: Set the new session as active in Clerk
        await setActive({ session: result.createdSessionId });

        try {
          // FIX: syncUser returns userId (truthy) or null, not a boolean
          const userId = await syncUser();

          if (!userId) {
            // User exists in Clerk but not in Convex database
            setError("Account not found in system. Please contact your administrator.");
            console.error("User sync failed: User authenticated in Clerk but not found in Convex database");
            return;
          }

          // Get the user data from Clerk  to store in session
          // Access the user from the sign-in result
          const clerkClient = (signIn as any).client;
          const currentSession = clerkClient?.sessions?.find((s: any) => s.id === result.createdSessionId);
          const clerkUser = currentSession?.user;

          // Store session with remember me preference
          if (clerkUser && result.createdSessionId) {
            const userRole = (clerkUser.publicMetadata as any)?.role || "site_engineer";
            const userEmail = clerkUser.primaryEmailAddress?.emailAddress || undefined;
            const userFullName = clerkUser.fullName || clerkUser.username || "User";
            const userUsername = clerkUser.username || clerkUser.id;

            // Save to session manager and SET AS ACTIVE
            addOrUpdateSession(
              result.createdSessionId,
              clerkUser.id,
              userUsername,
              userFullName,
              userRole,
              userEmail,
              rememberMe // Remember me preference
            );

            // IMPORTANT: Mark this as the active session
            setActiveSession(result.createdSessionId);
          }

          // Success! Reset failed attempts
          setFailedAttempts(0);
          setLockoutUntil(null);

          // IMPORTANT: Force a full page reload to load the NEW account's data
          // Add timestamp to bust cache and force fresh redirect to role-specific dashboard
          window.location.href = `/dashboard?t=${Date.now()}`;

        } catch (syncError: any) {
          console.error("User sync error:", syncError);

          // Better error handling
          if (syncError?.message?.includes("Not authenticated")) {
            setError("Authentication session expired. Please try again.");
          } else if (syncError?.message?.includes("disabled")) {
            setError("Your account has been disabled. Please contact support.");
          } else {
            setError("Failed to verify account. Please try again.");
          }
        }
      }
    } catch (err: any) {
      console.log("Login error:", err);

      // Check if this is a "session already exists" error
      const errorMessage = err?.errors?.[0]?.message || err?.message || "";
      const isSessionExists = errorMessage.toLowerCase().includes("session") &&
        errorMessage.toLowerCase().includes("already");

      if (isSessionExists) {
        // Session already exists for this user - try to switch to it!
        try {
          // Get user from clerk to find their session
          const { client } = signIn as any;

          if (client?.sessions) {
            // Find a session for this username
            const existingSession = client.sessions.find((s: any) => {
              const sessionUser = s.user;
              return sessionUser?.username === username.trim() ||
                sessionUser?.primaryEmailAddress?.emailAddress === username.trim();
            });

            if (existingSession) {
              // Found existing session - switch to it SILENTLY!
              await setActive({ session: existingSession.id });

              // Success! Reset failed attempts (this is NOT a failure!)
              setFailedAttempts(0);
              setLockoutUntil(null);

              // Redirect to dashboard silently - no error message
              window.location.href = `/dashboard?t=${Date.now()}`;
              return; // Exit early - success!
            }
          }
        } catch (switchError) {
          console.error("Failed to switch to existing session:", switchError);
        }

        // If we reach here, session exists error but couldn't switch
        // This means invalid credentials - treat as failed login
        // DON'T auto-login! Fall through to error handling below
      }

      // Security: Track failed login attempts (only for real failures, not session exists)
      const newFailedAttempts = failedAttempts + 1;
      setFailedAttempts(newFailedAttempts);

      // Security: Implement exponential backoff after 3 failed attempts
      if (newFailedAttempts >= 3) {
        // Lockout duration increases exponentially: 30s, 60s, 120s, 240s, etc.
        const lockoutSeconds = Math.pow(2, newFailedAttempts - 3) * 30;
        const lockoutTime = Date.now() + (lockoutSeconds * 1000);
        setLockoutUntil(lockoutTime);
        setError(`Too many failed attempts. Account locked for ${lockoutSeconds} seconds.`);
        return;
      }

      // Improved error messages
      let msg = "Invalid credentials";
      if (err?.errors?.[0]?.message) {
        msg = err.errors[0].message;
      }
      if (msg.toLowerCase().includes("find") || msg.toLowerCase().includes("not found")) {
        msg = "Account not found";
      }
      if (msg.toLowerCase().includes("password") || msg.toLowerCase().includes("incorrect")) {
        msg = "Incorrect username or password";
      }

      setError(msg);

      // Log failed attempt for security monitoring
      console.warn(`Failed login attempt for user: ${username.trim()}`);

    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen w-full overflow-hidden bg-background">

      {/* LEFT PANEL - Brand (Theme-Aware) */}
      <div className="lg:w-1/2 w-full bg-primary relative flex flex-col justify-center items-center text-primary-foreground p-8 lg:p-16 min-h-[250px] lg:h-full overflow-hidden">

        <div className="relative z-10 flex flex-col items-center lg:items-start max-w-xl w-full space-y-8">

          {/* Logo */}
          <div className="transition-transform hover:scale-105 duration-300">
            <Image
              src="/images/logos/fulllogo.png"
              alt="Notion CRM"
              width={800}
              height={200}
              className="w-56 lg:w-72 h-auto brightness-0 invert drop-shadow-2xl"
              priority
              quality={100}
            />
          </div>

          {/* Headline */}
          <div className="space-y-4">
            <h1 className="text-4xl lg:text-6xl font-extrabold leading-tight tracking-tight">
              Welcome Back
            </h1>
            <p className="text-primary-foreground/90 text-lg lg:text-xl font-medium max-w-md">
              Sign in to access your enterprise logistics dashboard.
            </p>
          </div>

          {/* Trust Badge */}
          <div className="hidden lg:flex items-center gap-3 opacity-90">
            <div className="flex -space-x-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-10 h-10 rounded-full bg-primary-foreground/20 border-2 border-primary-foreground/40 backdrop-blur-sm" />
              ))}
            </div>
            <span className="text-sm font-semibold text-primary-foreground/80">
              Trusted by 500+ Companies
            </span>
          </div>
        </div>

        {/* Wave SVG - Desktop */}
        <div className="hidden lg:block absolute right-[-2px] top-0 bottom-0 w-[140px] overflow-hidden pointer-events-none z-20">
          <svg viewBox="0 0 100 800" preserveAspectRatio="none" className="h-full w-full fill-background" style={{ filter: 'drop-shadow(-6px 0 10px rgba(0,0,0,0.08))' }}>
            <path d="M100,0 L100,800 L35,800 C35,800 70,700 35,600 C0,500 70,400 30,300 C-5,220 65,100 35,0 Z" />
          </svg>
        </div>

        {/* Wave SVG - Mobile */}
        <div className="lg:hidden absolute bottom-[-2px] left-0 right-0 h-[60px] overflow-hidden pointer-events-none z-20">
          <svg viewBox="0 0 500 100" preserveAspectRatio="none" className="w-full h-full fill-background" style={{ filter: 'drop-shadow(0 -4px 8px rgba(0,0,0,0.08))' }}>
            <path d="M0,100 L500,100 L500,35 C450,70 350,50 250,60 C150,70 50,40 0,35 Z" />
          </svg>
        </div>

        {/* Decorative elements */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-primary-foreground/10 rounded-full blur-3xl" />
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-primary-foreground/5 rounded-full blur-3xl" />
      </div>

      {/* RIGHT PANEL - Form */}
      <div className="lg:w-1/2 w-full flex items-center justify-center p-6 lg:p-12 bg-background">

        <div className="w-full max-w-md space-y-8">

          {/* Header */}
          <div className="space-y-2 text-center lg:text-left">
            <h2 className="text-3xl font-bold text-foreground tracking-tight">
              Sign In
            </h2>
            <p className="text-muted-foreground">
              Enter your credentials to continue
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Username Input */}
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-semibold text-foreground">
                Username
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                  <User size={20} strokeWidth={2} />
                </div>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={isLoading}
                  placeholder="Enter your username"
                  className="w-full pl-11 pr-4 py-3.5 bg-secondary/60 hover:bg-secondary border-2 border-transparent focus:border-primary focus:bg-background focus:ring-4 focus:ring-primary/10 rounded-2xl transition-all outline-none text-base font-medium placeholder:text-muted-foreground/60 disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-semibold text-foreground">
                Password
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                  <Lock size={20} strokeWidth={2} />
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  placeholder="Enter your password"
                  className="w-full pl-11 pr-4 py-3.5 bg-secondary/60 hover:bg-secondary border-2 border-transparent focus:border-primary focus:bg-background focus:ring-4 focus:ring-primary/10 rounded-2xl transition-all outline-none text-base font-medium placeholder:text-muted-foreground/60 disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-start gap-3 p-4 bg-secondary/30 rounded-xl border border-border/50">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                disabled={isLoading}
                className="mt-0.5 w-4 h-4 rounded border-2 border-primary/30 text-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-60 cursor-pointer"
              />
              <label htmlFor="rememberMe" className="flex-1 cursor-pointer">
                <div className="text-sm font-semibold text-foreground">
                  Remember me for 30 days
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  Stay logged in across browser sessions. Uncheck to end session when browser closes.
                </div>
              </label>
            </div>

            {/* Error Message */}
            {(error || disabled) && (
              <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-2xl">
                <AlertCircle className="text-destructive flex-shrink-0" size={20} />
                <p className="text-sm font-semibold text-destructive">
                  {disabled ? "Account disabled" : error}
                </p>
              </div>
            )}

            {/* Submit Button (Theme-Aware) */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 px-6 bg-primary hover:bg-primary/90 active:bg-primary/80 text-primary-foreground font-bold text-base rounded-2xl shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-lg group"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

            {/* Footer */}
            <div className="pt-4 text-center">
              <p className="text-xs text-muted-foreground">
                &copy; {new Date().getFullYear()} Notion CRM - Enterprise Logistics Platform
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
