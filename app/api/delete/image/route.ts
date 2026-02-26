/**
 * Image Delete API Route
 *
 * Handles image deletion from Cloudflare R2.
 */

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/server";
import { deleteImage } from "@/lib/r2/client";

export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const imageKey = searchParams.get("key");

    if (!imageKey) {
      return NextResponse.json(
        { error: "No image key provided" },
        { status: 400 }
      );
    }

    // Delete from R2
    await deleteImage(imageKey);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting image:", error);
    return NextResponse.json(
      { error: "Failed to delete image" },
      { status: 500 }
    );
  }
}

