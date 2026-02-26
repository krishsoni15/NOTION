/**
 * Login API Route
 * Verifies credentials and issues JWT token
 */
import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { signToken } from "@/lib/auth/jwt";
import { verifyPassword } from "@/lib/auth/password";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
    try {
        const { username, password } = await request.json();

        if (!username || !password) {
            return NextResponse.json(
                { success: false, error: "Username and password are required" },
                { status: 400 }
            );
        }

        // Query user by username from Convex (public query, no auth needed)
        const user = await convex.query(api.users.getUserByUsernamePublic, {
            username: username.trim(),
        });

        if (!user) {
            return NextResponse.json(
                { success: false, error: "Invalid username or password" },
                { status: 401 }
            );
        }

        // Check if user is active
        if (!user.isActive) {
            return NextResponse.json(
                { success: false, error: "Account is disabled. Contact administrator." },
                { status: 403 }
            );
        }

        // Verify password
        if (!user.passwordHash) {
            return NextResponse.json(
                { success: false, error: "Account not set up. Contact administrator." },
                { status: 403 }
            );
        }

        const isValid = verifyPassword(password, user.passwordHash);
        if (!isValid) {
            return NextResponse.json(
                { success: false, error: "Invalid username or password" },
                { status: 401 }
            );
        }

        // Sign JWT
        const token = await signToken({
            userId: user.clerkUserId,
            username: user.username,
            name: user.fullName,
            role: user.role,
        });

        // Set httpOnly cookie
        const response = NextResponse.json({
            success: true,
            user: {
                userId: user.clerkUserId,
                username: user.username,
                name: user.fullName,
                role: user.role,
            },
        });

        response.cookies.set("auth_token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 7 * 24 * 60 * 60, // 7 days
        });

        return response;
    } catch (error) {
        console.error("Login error:", error);
        return NextResponse.json(
            { success: false, error: "Login failed. Please try again." },
            { status: 500 }
        );
    }
}
