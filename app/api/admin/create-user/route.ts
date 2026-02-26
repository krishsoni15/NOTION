/**
 * Admin API: Create User
 * 
 * Creates a user with hashed password in our custom auth system.
 * Only accessible by authenticated managers.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/server";
import { hashPassword } from "@/lib/auth/password";

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authUser = await getAuthUser();

    if (!authUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Only managers can create users
    if (authUser.role !== "manager") {
      return NextResponse.json(
        { error: "Forbidden: Only managers can create users" },
        { status: 403 }
      );
    }

    // Get request body
    const body = await request.json();
    const { username, password, role } = body;

    if (!username || !password || !role) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long" },
        { status: 400 }
      );
    }

    // Hash the password
    const passwordHash = await hashPassword(password);

    // Generate a unique auth user ID
    const clerkUserId = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    return NextResponse.json({
      clerkUserId,
      passwordHash,
      success: true,
    });
  } catch (error: any) {
    console.error("Error creating user:", error);

    const errorMessage = error?.message || "Failed to create user";

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
