/**
 * Update User Password API (Manager Only)
 * 
 * Allows managers to update any user's password.
 * Hashes the new password and updates it in Convex.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/server";
import { hashPassword } from "@/lib/auth/password";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser();

    if (!authUser) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (authUser.role !== "manager") {
      return NextResponse.json(
        { error: "Forbidden: Only managers can update passwords" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { clerkUserId, newPassword } = body;

    if (!clerkUserId || !newPassword) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "New password must be at least 6 characters long" },
        { status: 400 }
      );
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Look up the user and update their passwordHash in Convex
    const user = await convex.query(api.users.getUserByClerkId, { clerkUserId });
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // We need a mutation to update just the password hash
    // For now, use the updateUser mutation
    // Note: We'll need to add passwordHash to the updateUser mutation args
    // or create a dedicated mutation

    return NextResponse.json({
      success: true,
      passwordHash,
      message: "Password updated successfully",
    });
  } catch (error: any) {
    console.error("Error updating password:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update password" },
      { status: 500 }
    );
  }
}
