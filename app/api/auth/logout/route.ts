/**
 * Logout API Route - Clears auth cookie
 */
import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { verifyToken } from "@/lib/auth/jwt";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
    const response = NextResponse.json({ success: true });

    try {
        const token = request.cookies.get("auth_token")?.value;
        if (token) {
            const payload = await verifyToken(token);
            if (payload && payload.userId) {
                await convex.mutation(api.notes.recordSystemLog, {
                    clerkUserId: payload.userId,
                    action: "logout",
                });
            }
        }
    } catch (logError) {
        console.error("Failed to record logout system log:", logError);
    }

    response.cookies.set("auth_token", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
    });
    return response;
}
