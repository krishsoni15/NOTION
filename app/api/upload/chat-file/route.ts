/**
 * Chat File Upload API Route
 *
 * Handles generic file uploads (PDF, DOCX, etc.) for chat messages to Cloudinary.
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

        // Validate file size (max 25MB for documents)
        const maxSize = 25 * 1024 * 1024; // 25MB
        if (file.size > maxSize) {
            return NextResponse.json(
                { error: "File size must be less than 25MB" },
                { status: 400 }
            );
        }

        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Generate unique public ID (using existing helper but for generic files)
        const publicId = generateImageKey(`chat-file-${userId}`, file.name);

        // Determine resource type: 'image' for images, 'raw' for everything else (PDFs, docs)
        // This ensures PDFs are stored as downloadable files, not converted to images
        const isImage = file.type.startsWith("image/");
        const resourceType = isImage ? "image" : "raw";

        // Upload to Cloudinary
        try {
            const { url, key } = await uploadImage(buffer, publicId, {
                folder: 'notion-chat-files',
                resourceType: resourceType,
                // @ts-ignore - access_mode is now supported via spread, ignoring strict typing for now
                access_mode: 'public'
            });

            if (!url || !key) {
                throw new Error("Upload succeeded but no URL or key returned");
            }

            return NextResponse.json({
                success: true,
                fileUrl: url,
                fileKey: key,
                fileName: file.name,
                fileType: file.type,
                fileSize: file.size,
            });
        } catch (uploadError) {
            console.error("Cloudinary upload error:", uploadError);
            throw uploadError;
        }
    } catch (error) {
        console.error("Error uploading chat file:", error);
        const errorMessage = error instanceof Error ? error.message : "Failed to upload file";
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}
