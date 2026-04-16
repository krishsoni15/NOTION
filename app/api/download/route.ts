
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const fileUrl = searchParams.get("url");
    const filename = searchParams.get("filename") || "document.pdf";

    if (!fileUrl) {
        return new NextResponse("Missing file URL", { status: 400 });
    }

    try {
        const response = await fetch(fileUrl);

        if (!response.ok) {
            throw new Error(`Failed to fetch file: ${response.statusText}`);
        }

        // Stream the response directly
        return new NextResponse(response.body, {
            status: 200,
            headers: {
                "Content-Type": response.headers.get("Content-Type") || "application/pdf",
                "Content-Disposition": `attachment; filename="${filename}"`,
            }
        });
    } catch (error) {
        console.error("Download proxy error:", error);
        return new NextResponse("Failed to download file", { status: 500 });
    }
}
