import { NextRequest, NextResponse } from "next/server";
import { uploadImage } from "@/lib/r2/client";

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        // Validate PDF type
        if (file.type !== "application/pdf") {
            return NextResponse.json({ error: "Only PDF files are allowed" }, { status: 400 });
        }

        // Convert file to buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Upload to R2 under project-pdfs folder
        const { url, key } = await uploadImage(buffer, undefined, {
            folder: "project-pdfs",
            contentType: file.type,
        });

        return NextResponse.json({
            pdfUrl: url,
            pdfKey: key,
            pdfFileName: file.name,
        });
    } catch (error) {
        console.error("Project PDF upload error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to upload PDF" },
            { status: 500 }
        );
    }
}
