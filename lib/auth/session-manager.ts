/**
 * Multi-Account Session Manager
 * 
 * Manages multiple active Clerk sessions and provides utilities for:
 * - Storing session metadata
 * - Switching between accounts
 * - Session persistence
 * - Remember Me functionality
 */

export interface AccountSession {
    sessionId: string;
    userId: string;
    username: string;
    fullName: string;
    role: string;
    email?: string;
    lastActive: number;
    rememberMe: boolean;
    expiresAt: number | null;
}

export interface SessionStorage {
    accounts: AccountSession[];
    activeSessionId: string | null;
    lastUpdated: number;
}

const STORAGE_KEY = "clerk_multi_sessions";

/**
 * Get all stored sessions from localStorage
 */
export function getStoredSessions(): SessionStorage {
    if (typeof window === "undefined") {
        return { accounts: [], activeSessionId: null, lastUpdated: Date.now() };
    }

    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
            return { accounts: [], activeSessionId: null, lastUpdated: Date.now() };
        }

        const parsed: SessionStorage = JSON.parse(stored);

        // Filter out expired sessions
        const now = Date.now();
        const validAccounts = parsed.accounts.filter(account => {
            if (!account.expiresAt) return true; // No expiry (browser session)
            return account.expiresAt > now;
        });

        return {
            ...parsed,
            accounts: validAccounts,
        };
    } catch (error) {
        console.error("Failed to parse stored sessions:", error);
        return { accounts: [], activeSessionId: null, lastUpdated: Date.now() };
    }
}

/**
 * Save sessions to localStorage
 */
export function saveStoredSessions(storage: SessionStorage): void {
    if (typeof window === "undefined") return;

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            ...storage,
            lastUpdated: Date.now(),
        }));
    } catch (error) {
        console.error("Failed to save sessions:", error);
    }
}

/**
 * Add or update a session
 */
export function addOrUpdateSession(
    sessionId: string,
    userId: string,
    username: string,
    fullName: string,
    role: string,
    email: string | undefined,
    rememberMe: boolean
): void {
    const storage = getStoredSessions();

    // Calculate expiry (30 days if remember me, null otherwise)
    const expiresAt = rememberMe
        ? Date.now() + (30 * 24 * 60 * 60 * 1000) // 30 days
        : null;

    // Check if session already exists
    const existingIndex = storage.accounts.findIndex(
        acc => acc.sessionId === sessionId || acc.userId === userId
    );

    const sessionData: AccountSession = {
        sessionId,
        userId,
        username,
        fullName,
        role,
        email,
        lastActive: Date.now(),
        rememberMe,
        expiresAt,
    };

    if (existingIndex >= 0) {
        // Update existing session
        storage.accounts[existingIndex] = sessionData;
    } else {
        // Add new session
        storage.accounts.push(sessionData);
    }

    // Set as active session
    storage.activeSessionId = sessionId;

    saveStoredSessions(storage);
}

/**
 * Remove a session
 */
export function removeSession(sessionId: string): void {
    const storage = getStoredSessions();

    storage.accounts = storage.accounts.filter(
        acc => acc.sessionId !== sessionId
    );

    // If removed session was active, switch to another or clear
    if (storage.activeSessionId === sessionId) {
        storage.activeSessionId = storage.accounts.length > 0
            ? storage.accounts[0].sessionId
            : null;
    }

    saveStoredSessions(storage);
}

/**
 * Remove all sessions (logout all)
 */
export function clearAllSessions(): void {
    if (typeof window === "undefined") return;

    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
        console.error("Failed to clear sessions:", error);
    }
}

/**
 * Set active session
 */
export function setActiveSession(sessionId: string): void {
    const storage = getStoredSessions();

    const session = storage.accounts.find(acc => acc.sessionId === sessionId);
    if (!session) {
        console.warn("Session not found:", sessionId);
        return;
    }

    storage.activeSessionId = sessionId;

    // Update last active timestamp
    session.lastActive = Date.now();

    saveStoredSessions(storage);
}

/**
 * Get active session
 */
export function getActiveSession(): AccountSession | null {
    const storage = getStoredSessions();

    if (!storage.activeSessionId) return null;

    return storage.accounts.find(
        acc => acc.sessionId === storage.activeSessionId
    ) || null;
}

/**
 * Get all active sessions
 */
export function getAllSessions(): AccountSession[] {
    const storage = getStoredSessions();

    // Sort by last active (most recent first)
    return storage.accounts.sort((a, b) => b.lastActive - a.lastActive);
}

/**
 * Check if user has multiple sessions
 */
export function hasMultipleSessions(): boolean {
    const storage = getStoredSessions();
    return storage.accounts.length > 1;
}

/**
 * Get session by user ID
 */
export function getSessionByUserId(userId: string): AccountSession | null {
    const storage = getStoredSessions();
    return storage.accounts.find(acc => acc.userId === userId) || null;
}

/**
 * Clean up expired sessions
 */
export function cleanupExpiredSessions(): void {
    const storage = getStoredSessions();
    const now = Date.now();

    const validAccounts = storage.accounts.filter(account => {
        if (!account.expiresAt) return true;
        return account.expiresAt > now;
    });

    if (validAccounts.length !== storage.accounts.length) {
        storage.accounts = validAccounts;

        // If active session was removed, switch to another
        const activeStillValid = validAccounts.find(
            acc => acc.sessionId === storage.activeSessionId
        );

        if (!activeStillValid && validAccounts.length > 0) {
            storage.activeSessionId = validAccounts[0].sessionId;
        } else if (validAccounts.length === 0) {
            storage.activeSessionId = null;
        }

        saveStoredSessions(storage);
    }
}
