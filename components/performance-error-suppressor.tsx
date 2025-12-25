"use client";

/**
 * Performance Error Suppressor
 * 
 * Suppresses harmless React DevTools performance measurement errors
 * that occur in development mode.
 */

import { useEffect } from "react";

export function PerformanceErrorSuppressor() {
  useEffect(() => {
    // Suppress the specific Performance API error from React DevTools
    const originalError = console.error;
    console.error = (...args: any[]) => {
      // Check if this is the performance measurement error
      const errorMessage = args[0]?.toString() || "";
      if (
        errorMessage.includes("Failed to execute 'measure' on 'Performance'") ||
        errorMessage.includes("cannot have a negative time stamp")
      ) {
        // Suppress this specific error
        return;
      }
      // Log all other errors normally
      originalError.apply(console, args);
    };

    // Also handle unhandled errors
    const handleError = (event: ErrorEvent) => {
      if (
        event.message?.includes("Failed to execute 'measure' on 'Performance'") ||
        event.message?.includes("cannot have a negative time stamp")
      ) {
        event.preventDefault();
        return false;
      }
    };

    window.addEventListener("error", handleError);

    // Cleanup
    return () => {
      console.error = originalError;
      window.removeEventListener("error", handleError);
    };
  }, []);

  return null;
}

