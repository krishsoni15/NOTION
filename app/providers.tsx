"use client";

import { ThemeProvider } from "next-themes";
import { ReactNode } from "react";
import { PerformanceErrorSuppressor } from "@/components/performance-error-suppressor";

/**
 * Client-side Providers Wrapper
 * 
 * Wraps all client-side providers to avoid hydration issues
 * and script placement errors.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem={true}
      disableTransitionOnChange
    >
      <PerformanceErrorSuppressor />
      {children}
    </ThemeProvider>
  );
}

