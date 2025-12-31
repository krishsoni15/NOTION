/**
 * Image Delete API Route
 *
 * Handles image deletion from Cloudinary.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { deleteImage } from "@/lib/cloudinary/client";

export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
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

    // Delete from Cloudinary
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

