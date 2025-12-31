/**
 * Chat Image Upload API Route
 *
 * Handles image uploads for chat messages to Cloudinary.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { uploadImage, generateImageKey } from "@/lib/cloudinary/client";

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "File must be an image" },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB for chat images)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size must be less than 5MB" },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate unique public ID for chat images
    const publicId = generateImageKey(`chat-${userId}`, file.name);

    // Upload to Cloudinary
    try {
      const { url, key } = await uploadImage(buffer, publicId, {
        folder: 'notion-chat-images',
        quality: 'auto',
        transformation: [
          { width: 800, height: 800, crop: 'limit' }
        ],
      });

      if (!url || !key) {
        throw new Error("Upload succeeded but no URL or key returned");
      }

      return NextResponse.json({
        success: true,
        imageUrl: url,
        imageKey: key,
      });
    } catch (uploadError) {
      console.error("Cloudinary upload error:", uploadError);
      throw uploadError;
    }
  } catch (error) {
    console.error("Error uploading chat image:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to upload image";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
