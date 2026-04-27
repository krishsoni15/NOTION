
import { NextRequest, NextResponse } from "next/server";

function guessContentTypeFromUrl(url: string): string | null {
    const clean = url.split("?")[0].split("#")[0];
    const ext = clean.split(".").pop()?.toLowerCase();
    if (!ext) return null;
    const map: Record<string, string> = {
        png: "image/png",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        webp: "image/webp",
        gif: "image/gif",
        svg: "image/svg+xml",
        pdf: "application/pdf",
    };
    return map[ext] || null;
}

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams;
    const fileUrl = searchParams.get("url");
    const filename = searchParams.get("filename") || "document.pdf";

    if (!fileUrl) {
        return new NextResponse("Missing file URL", { status: 400 });
    }

    try {
        const response = await fetch(fileUrl, { cache: "no-store" });

        if (!response.ok) {
            throw new Error(`Failed to fetch file: ${response.statusText}`);
        }

        const upstreamType = response.headers.get("Content-Type");
        const guessedType = guessContentTypeFromUrl(fileUrl);
        const contentType = upstreamType || guessedType || "application/octet-stream";

        // Stream the response directly
        return new NextResponse(response.body, {
            status: 200,
            headers: {
                "Content-Type": contentType,
                "Content-Disposition": `attachment; filename="${filename}"`,
            }
        });
    } catch (error) {
        console.error("Download proxy error:", error);
        return new NextResponse("Failed to download file", { status: 500 });
    }
}
