/**
 * Chat File Upload API Route
 *
 * Handles generic file uploads (PDF, DOCX, etc.) for chat messages to Cloudflare R2.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { uploadImage, generateImageKey } from "@/lib/r2/client";

// Allow longer execution time for large file uploads (PDFs, etc.)
export const maxDuration = 60; // 60 seconds

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

        // Upload to R2
        try {
            const { url, key } = await uploadImage(buffer, publicId, {
                folder: 'notion-chat-files',
                contentType: file.type,
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
            console.error("R2 upload error:", uploadError);
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
