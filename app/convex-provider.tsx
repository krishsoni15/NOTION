"use client";

/**
 * Convex Client Provider with Custom JWT Auth
 * Replaces ConvexProviderWithClerk with ConvexProviderWithAuth
 */

import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import { ReactNode, useCallback, useMemo, useState, useEffect } from "react";
import { useAuth } from "./providers/auth-provider";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

const convex = new ConvexReactClient(convexUrl || "https://placeholder.convex.cloud");

function useConvexAuth() {
  const { isLoading, isAuthenticated } = useAuth();
  const [token, setToken] = useState<string | null>(null);

  // Fetch token when auth state changes
  useEffect(() => {
    if (isAuthenticated) {
      fetch("/api/auth/token")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => setToken(data?.token || null))
        .catch(() => setToken(null));
    } else {
      setToken(null);
    }
  }, [isAuthenticated]);

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      if (!isAuthenticated) return null;
      try {
        const res = await fetch("/api/auth/token");
        if (!res.ok) return null;
        const data = await res.json();
        const newToken = data.token || null;
        setToken(newToken);
        return newToken;
      } catch {
        return null;
      }
    },
    [isAuthenticated]
  );

  return useMemo(
    () => ({
      isLoading,
      isAuthenticated: isAuthenticated && !!token,
      fetchAccessToken,
    }),
    [isLoading, isAuthenticated, token, fetchAccessToken]
  );
}

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  if (!convexUrl) {
    console.error("NEXT_PUBLIC_CONVEX_URL is not set!");
  }

  return (
    <ConvexProviderWithAuth client={convex} useAuth={useConvexAuth}>
      {children}
    </ConvexProviderWithAuth>
  );
}
