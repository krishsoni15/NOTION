/**
 * Token API Route
 * Returns the JWT from httpOnly cookie for the Convex client
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth/jwt";

export async function GET(request: NextRequest) {
    const token = request.cookies.get("auth_token")?.value;

    if (!token) {
        return NextResponse.json({ token: null }, { status: 401 });
    }

    // Verify token is still valid
    const payload = await verifyToken(token);
    if (!payload) {
        const response = NextResponse.json({ token: null }, { status: 401 });
        response.cookies.set("auth_token", "", { maxAge: 0, path: "/" });
        return response;
    }

    // Return the raw JWT for Convex to use
    return NextResponse.json({ token });
}
