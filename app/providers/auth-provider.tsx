"use client";

/**
 * Auth Provider - Custom JWT Authentication
 * Manages auth state, login/logout, and provides context to the app
 */

import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from "react";

export interface AuthUser {
    userId: string;
    username: string;
    name: string;
    role: string;
}

interface AuthContextType {
    user: AuthUser | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const refreshUser = useCallback(async () => {
        try {
            const res = await fetch("/api/auth/me");
            if (res.ok) {
                const data = await res.json();
                setUser(data.user || null);
            } else {
                setUser(null);
            }
        } catch {
            setUser(null);
        }
    }, []);

    // Check session on mount
    useEffect(() => {
        refreshUser().finally(() => setIsLoading(false));
    }, [refreshUser]);

    const login = useCallback(async (username: string, password: string) => {
        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, password }),
            });
            const data = await res.json();
            if (data.success && data.user) {
                setUser(data.user);
                return { success: true };
            }
            return { success: false, error: data.error || "Login failed" };
        } catch {
            return { success: false, error: "Network error. Please try again." };
        }
    }, []);

    const logout = useCallback(async () => {
        try {
            await fetch("/api/auth/logout", { method: "POST" });
        } finally {
            setUser(null);
        }
    }, []);

    const value = useMemo(
        () => ({
            user,
            isLoading,
            isAuthenticated: !!user,
            login,
            logout,
            refreshUser,
        }),
        [user, isLoading, login, logout, refreshUser]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
