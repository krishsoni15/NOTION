"use client";

/**
 * Login Form Component
 * 
 * Beautiful split-screen login page with gradient left panel and form on right.
 * Fully responsive for mobile and tablet devices.
 */

import { useState, useEffect } from "react";
import Image from "next/image";
import { useSignIn } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { User, Lock, Eye, EyeOff } from "lucide-react";

interface LoginFormProps {
  disabled?: boolean;
}

export function LoginForm({ disabled = false }: LoginFormProps) {
  const { isLoaded, signIn, setActive } = useSignIn();
  const router = useRouter();
  const searchParams = useSearchParams();
  const syncUser = useMutation(api.syncUser.syncCurrentUser);
  
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Check for error/disabled params in URL
  useEffect(() => {
    const errorParam = searchParams?.get("error");
    const disabledParam = searchParams?.get("disabled");
    
    if (errorParam === "not_found") {
      setError("Your account is not registered in the system. Please contact your administrator to create your account.");
    } else if (errorParam === "auth_error") {
      setError("Authentication error. Please try logging in again.");
    } else if (errorParam === "no_role") {
      setError("Your account exists but has no assigned role. Please contact your administrator.");
    } else if (errorParam === "not_authenticated") {
      setError("You must be logged in to access this page.");
    } else if (disabledParam === "true") {
      setError("Your account has been disabled. Please contact your administrator for assistance.");
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isLoaded) {
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
        // Ensure session is properly activated
        await setActive({ session: result.createdSessionId });

        // Check if user exists in Convex before redirecting
        try {
          const userExists = await syncUser();
          if (!userExists) {
            setError("Your account is not registered in the system. Please contact your administrator to create your account.");
            return;
          }

          // Small delay to ensure session is fully active
          setTimeout(() => {
        router.push("/dashboard");
            router.refresh(); // Force a refresh to ensure proper state
          }, 100);
        } catch (syncError) {
          console.error("User sync error:", syncError);
          setError("Login successful but account verification failed. Please try again.");
        }
      } else {
        setError("Login failed. Please try again.");
      }
    } catch (err) {
      let errorMessage = "Invalid username or password";
      
      if (err && typeof err === 'object') {
        if ('errors' in err && Array.isArray(err.errors) && err.errors.length > 0) {
          errorMessage = err.errors[0].message || errorMessage;
        } else if ('message' in err) {
          errorMessage = err.message as string;
        }
      }
      
      if (errorMessage.toLowerCase().includes("couldn't find")) {
        errorMessage = "Account not found. Please verify your username or contact your administrator.";
      } else if (errorMessage.toLowerCase().includes("password")) {
        errorMessage = "Invalid password. Please try again.";
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex min-h-screen">
      {/* Left Panel - 60% with Full Logo (Desktop only) */}
      <div className="hidden lg:flex lg:w-3/5 relative overflow-hidden bg-gradient-to-br from-primary via-primary/95 to-primary/90 dark:from-primary/90 dark:via-primary/85 dark:to-primary/80">
        {/* Subtle Decorative Elements */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-10 right-10 w-96 h-96 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 left-10 w-80 h-80 bg-accent rounded-full blur-3xl" />
        </div>

        {/* Content - Centered */}
        <div className="relative z-10 flex flex-col justify-center items-center w-full px-8 py-16">
          {/* Full Logo - Larger and More Visible */}
          <div className="w-full max-w-3xl">
            <div className="relative w-full">
              <Image
                src="/images/logos/fulllogo.png"
                alt="Notion"
                width={1000}
                height={250}
                className="object-contain w-full h-auto drop-shadow-2xl"
                priority
                quality={100}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - 40% Login Form */}
      <div className="flex-1 lg:w-2/5 flex items-center justify-center p-4 sm:p-6 lg:p-8 xl:p-12 bg-background">
        <div className="w-full max-w-md mx-auto">
          {/* Mobile Logo (only on mobile/tablet) */}
          <div className="lg:hidden mb-8 text-center">
            <div className="h-24 relative mx-auto mb-6">
              <Image
                src="/images/logos/fulllogo.png"
                alt="Notion"
                width={400}
                height={100}
                className="object-contain h-full mx-auto drop-shadow-lg"
                priority
                quality={100}
              />
            </div>
          </div>

          {/* Login Card */}
          <Card className="border-2 border-border shadow-xl">
            <CardContent className="p-6 sm:p-8">
              {/* Header - Centered */}
              <div className="mb-8 text-center">
                <h2 className="text-3xl font-bold mb-3 text-foreground">Sign In</h2>
                <p className="text-base text-muted-foreground">
                  Enter your credentials to access your account
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Username Field */}
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-sm font-semibold text-foreground">
                    Username
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-primary" />
                    <Input
                      id="username"
                      type="text"
                      placeholder="Enter your username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      autoComplete="username"
                      autoFocus
                      disabled={isLoading}
                      className="pl-10 h-11 text-foreground bg-background border-2"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-semibold text-foreground">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-primary z-10" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      disabled={isLoading}
                      className="pl-10 pr-10 h-11 text-foreground bg-background border-2"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Disabled User Message */}
                {disabled && (
                  <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
                    <span className="text-destructive">⚠</span>
                    <span>Your account has been disabled. Please contact your administrator for assistance.</span>
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
                    <span className="text-destructive">⚠</span>
                    <span>{error}</span>
                  </div>
                )}

                {/* Submit Button */}
                <div className="mt-6">
                  <Button
                    type="submit"
                    className="w-full h-12 text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all"
                    size="lg"
                    disabled={isLoading || !username || !password}
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Signing in...
                      </span>
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                </div>
              </form>

              {/* Footer Text - Centered */}
              <div className="mt-6 pt-6 border-t text-center">
                <p className="text-sm font-medium text-muted-foreground">
                  Contact your administrator for account access
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Footer Copyright - Centered */}
          <div className="mt-6 text-center">
            <p className="text-sm font-medium text-muted-foreground">
              NOTION CRM © {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

