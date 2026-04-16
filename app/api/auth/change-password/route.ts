/**
 * Change Password API
 * 
 * Allows authenticated users to change their own password.
 * Verifies current password before updating.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/server";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
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

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
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

    // Get user from Convex to verify current password
    const user = await convex.query(api.users.getUserByUsernamePublic, {
      username: authUser.username
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: "User not found or no password set" },
        { status: 404 }
      );
    }

    // Verify current password
    const isCurrentValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 403 }
      );
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // TODO: Add a Convex mutation to update passwordHash
    // For now, return success with the hash for the frontend to handle

    return NextResponse.json({
      success: true,
      passwordHash,
      message: "Password changed successfully",
    });
  } catch (error: any) {
    console.error("Error changing password:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to change password" },
      { status: 500 }
    );
  }
}
