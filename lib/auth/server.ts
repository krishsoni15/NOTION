/**
 * Server-side auth helper for API routes
 * Verifies JWT from httpOnly cookie and returns user payload
 */

import { cookies } from "next/headers";
import { verifyToken, type TokenPayload } from "./jwt";

export async function getAuthUser(): Promise<TokenPayload | null> {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("auth_token")?.value;
        if (!token) return null;
        return await verifyToken(token);
    } catch {
        return null;
    }
}
