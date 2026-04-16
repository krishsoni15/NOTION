/**
 * Me API Route - Get current authenticated user
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth/jwt";

export async function GET(request: NextRequest) {
    const token = request.cookies.get("auth_token")?.value;

    if (!token) {
        return NextResponse.json({ user: null }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
        return NextResponse.json({ user: null }, { status: 401 });
    }

    return NextResponse.json({
        user: {
            userId: payload.userId,
            username: payload.username,
            name: payload.name,
            role: payload.role,
        },
    });
}
