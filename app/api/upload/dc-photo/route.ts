import { NextRequest, NextResponse } from "next/server";
import { uploadImage } from "@/lib/cloudinary/client";

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        // Convert file to buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Upload to Cloudinary using shared client
        // Using "delivery-challans" folder as originally requested
        const { url, key } = await uploadImage(buffer, undefined, {
            folder: "delivery-challans",
            resourceType: "auto",
        });

        return NextResponse.json({
            imageUrl: url,
            imageKey: key,
        });
    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to upload file" },
            { status: 500 }
        );
    }
}
