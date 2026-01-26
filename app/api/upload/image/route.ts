/**
 * Image Upload API Route
 *
 * Handles image uploads to Cloudinary.
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
    const itemId = formData.get("itemId") as string;
    const userIdParam = formData.get("userId") as string;

    // Use either itemId or userId as the identifier
    const identifier = itemId || userIdParam;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!identifier) {
      return NextResponse.json({ error: "No itemId or userId provided" }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "File must be an image" },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size must be less than 10MB" },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate unique public ID
    const publicId = generateImageKey(identifier, file.name);

    // Upload to Cloudinary
    try {
      const { url, key } = await uploadImage(buffer, publicId, {
        folder: 'notion-uploads',
        quality: 'auto',
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
    console.error("Error uploading image:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to upload image";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

