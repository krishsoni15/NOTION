/**
 * Delete User API (Manager Only)
 * 
 * No-op since we no longer have Clerk.
 * User deletion from Convex is handled by the Convex mutation directly.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/server";

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
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    // User deletion is now handled entirely by Convex mutations
    // This endpoint exists for backwards compatibility
    return NextResponse.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
