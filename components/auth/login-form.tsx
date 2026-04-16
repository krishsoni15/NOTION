"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/app/providers/auth-provider";
import { User, Lock, ArrowRight, Loader2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";

interface LoginFormProps {
  disabled?: boolean;
}

export function LoginForm({ disabled = false }: LoginFormProps) {
  const { login, isAuthenticated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, router]);

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

      const timeout = setTimeout(() => {
        setError("");
        router.replace("/login", { scroll: false });
      }, 3000);

      return () => clearTimeout(timeout);
    }
  }, [searchParams, router]);

  useEffect(() => {
    if (username || password) setError("");
  }, [username, password]);

  useEffect(() => {
    if (lockoutUntil && Date.now() >= lockoutUntil) {
      setLockoutUntil(null);
      setFailedAttempts(0);
    }
  }, [lockoutUntil]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (lockoutUntil && Date.now() < lockoutUntil) {
      const remainingSeconds = Math.ceil((lockoutUntil - Date.now()) / 1000);
      setError(`Too many failed attempts. Please try again in ${remainingSeconds} seconds.`);
      return;
    }

    setError("");
    setIsLoading(true);

    try {
      const result = await login(username.trim(), password);

      if (result.success) {
        setIsSuccess(true);
        setFailedAttempts(0);
        setLockoutUntil(null);

        // Delay for animation
        await new Promise((resolve) => setTimeout(resolve, 800));
        router.push(`/dashboard?t=${Date.now()}`);
      } else {
        const newFailedAttempts = failedAttempts + 1;
        setFailedAttempts(newFailedAttempts);

        if (newFailedAttempts >= 3) {
          const lockoutSeconds = Math.pow(2, newFailedAttempts - 3) * 30;
          const lockoutTime = Date.now() + lockoutSeconds * 1000;
          setLockoutUntil(lockoutTime);
          setError(`Too many failed attempts. Account locked for ${lockoutSeconds} seconds.`);
        } else {
          setError(result.error || "Invalid credentials");
        }
      }
    } catch (err: any) {
      setError("Login failed. Please try again.");
      console.error("Login error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen w-full bg-slate-50 dark:bg-slate-950 flex flex-col lg:flex-row relative font-sans transition-colors duration-700 selection:bg-primary/30 overflow-hidden ${isSuccess ? 'pointer-events-none' : ''}`}>

      {/* Slide Transition Overlay (Success) */}
      <div className={`fixed inset-0 bg-primary z-[9999] transform transition-transform duration-1000 ease-[cubic-bezier(0.76,0,0.24,1)] ${isSuccess ? 'translate-y-0' : 'translate-y-full'} pointer-events-none`}>
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent opacity-30" />
        <div className="flex flex-col items-center justify-center h-full text-white space-y-8 relative z-10">
          <div className="relative">
            <div className="absolute inset-0 bg-white/20 rounded-full blur-xl animate-pulse" />
            <Loader2 className="w-16 h-16 animate-spin text-white relative z-10" />
          </div>
          <div className="text-center space-y-3 p-4">
            <h2 className="text-4xl md:text-5xl font-bold animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-200 text-white tracking-tight">
              Welcome Back
            </h2>
            <p className="text-white/80 font-medium text-lg md:text-xl animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
              Entering secure dashboard...
            </p>
          </div>
        </div>
      </div>

      {/* Theme Toggle */}
      <div className="absolute top-4 right-4 lg:top-6 lg:right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-1000 delay-300">
        <AnimatedThemeToggler />
      </div>

      {/* LEFT PANEL - Brand */}
      <div className="relative min-h-[30vh] lg:absolute lg:inset-0 lg:w-full bg-primary flex flex-col justify-center items-center lg:items-start text-primary-foreground px-6 py-8 lg:p-16 lg:pl-[8%] overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-white/10 rounded-full blur-[80px] animate-pulse duration-[4000ms]" />
          <div className="absolute bottom-[-10%] right-[30%] w-[300px] h-[300px] bg-black/5 rounded-full blur-[60px]" />
        </div>

        <div className="relative z-10 flex flex-col items-center lg:items-start max-w-xl w-full space-y-4 lg:space-y-10 animate-in fade-in slide-in-from-left-8 duration-1000 ease-out">
          <div className="transition-all duration-500 hover:scale-105 hover:drop-shadow-2xl">
            <Image
              src="/images/logos/fulllogo.png"
              alt="Notion CRM"
              width={800}
              height={200}
              className="w-40 sm:w-56 lg:w-80 h-auto drop-shadow-xl"
              style={{ filter: "var(--logo-filter)" }}
              priority
              quality={100}
            />
          </div>

          <div className="space-y-2 lg:space-y-4 text-center lg:text-left">
            <h1 className="text-3xl sm:text-4xl lg:text-7xl font-extrabold leading-[1.1] tracking-tight drop-shadow-sm">
              Welcome <br className="hidden lg:block" />
              <span className="text-primary-foreground/90">Back</span>
            </h1>
            <p className="hidden sm:block text-primary-foreground/80 text-sm sm:text-base lg:text-2xl font-medium max-w-[280px] sm:max-w-md leading-relaxed tracking-wide">
              Sign in to access your enterprise logistics dashboard.
            </p>
          </div>
        </div>

        <div className="hidden lg:block absolute right-0 top-0 bottom-0 w-px overflow-visible pointer-events-none z-0">
          <div className="h-full w-px bg-white/10"></div>
        </div>
        <div className="lg:hidden absolute bottom-0 left-0 right-0 h-px overflow-visible pointer-events-none z-0">
          <div className="w-full h-px bg-white/10"></div>
        </div>
      </div>

      {/* RIGHT PANEL - Form */}
      <div
        className={`flex-1 lg:absolute lg:right-0 lg:top-0 lg:bottom-0 lg:w-[60%] flex items-center justify-center p-6 sm:p-8 lg:p-12 bg-white dark:bg-slate-900 relative z-10 -mt-10 lg:mt-0 rounded-t-[2.5rem] lg:rounded-tl-[2.5rem] lg:rounded-tr-none lg:rounded-br-none lg:rounded-bl-[2.5rem] border-2 lg:border-l-[6px] lg:border-r-0 lg:border-t-0 lg:border-b-0 border-primary/30 shadow-[0_-20px_40px_-15px_rgba(0,0,0,0.3)] lg:shadow-[-20px_0_40px_-10px_rgba(0,0,0,0.2)] transition-transform duration-700 ease-[cubic-bezier(0.76,0,0.24,1)] ${isSuccess ? 'translate-x-[105%] opacity-90' : 'translate-x-0'} overflow-hidden`}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-primary/5 rounded-full blur-[100px] animate-pulse duration-[8000ms]" />
          <div className="absolute top-1/2 right-10 w-24 h-24 bg-blue-400/10 rounded-full blur-[40px]" />
          <div className="absolute bottom-20 left-10 w-32 h-32 bg-purple-400/5 rounded-full blur-[50px]" />
        </div>

        <div className="w-full max-w-[480px] animate-in fade-in zoom-in-95 duration-700 delay-100 relative z-10">
          <div className="space-y-3 text-center lg:text-left mb-10">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white tracking-tighter">
              Sign In
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-base sm:text-lg">
              Enter your credentials to continue
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username */}
            <div className="space-y-2 group">
              <label htmlFor="username" className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1 transition-colors group-focus-within:text-primary">
                Username
              </label>
              <div className="relative transform transition-all duration-300 group-focus-within:scale-[1.01]">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-primary pointer-events-none">
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
                  autoComplete="username"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 focus:border-primary focus:bg-white dark:focus:bg-slate-800 focus:ring-4 focus:ring-primary/10 rounded-2xl transition-all duration-300 outline-none text-base font-medium text-slate-900 dark:text-white placeholder:text-slate-400 disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2 group">
              <label htmlFor="password" className="text-sm font-semibold text-slate-700 dark:text-slate-300 ml-1 transition-colors group-focus-within:text-primary">
                Password
              </label>
              <div className="relative transform transition-all duration-300 group-focus-within:scale-[1.01]">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-primary pointer-events-none">
                  <Lock size={20} strokeWidth={2} />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className="w-full pl-12 pr-12 py-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 focus:border-primary focus:bg-white dark:focus:bg-slate-800 focus:ring-4 focus:ring-primary/10 rounded-2xl transition-all duration-300 outline-none text-base font-medium text-slate-900 dark:text-white placeholder:text-slate-400 disabled:opacity-60 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {(error || disabled) && (
              <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
                <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
                <p className="text-sm font-medium text-red-600 dark:text-red-400">
                  {disabled ? "Account disabled" : error}
                </p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 px-6 bg-primary hover:bg-primary/90 active:scale-[0.98] text-white font-bold text-lg rounded-2xl shadow-xl shadow-primary/30 hover:shadow-2xl hover:shadow-primary/40 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100 group mt-4 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer" />
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={22} />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={22} strokeWidth={2.5} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

            {/* Footer */}
            <div className="pt-6 text-center">
              <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">
                &copy; {new Date().getFullYear()} Notion CRM <span className="mx-1">•</span> Enterprise Platform
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
