"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { use, useState, useRef } from "react";
import { Loader2, Download, Printer, FileText, ArrowLeft } from "lucide-react";
import { PurchaseOrderTemplate } from "@/components/purchase/purchase-order-template";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Link from "next/link";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

async function blobToDataUrl(blob: Blob): Promise<string> {
    return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Failed to read image blob"));
        reader.readAsDataURL(blob);
    });
}

async function fetchImageAsDataUrl(src: string): Promise<string | null> {
    const tryFetch = async (url: string) => {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
        const blob = await res.blob();
        return await blobToDataUrl(blob);
    };

    try {
        return await tryFetch(src);
    } catch {
        try {
            const proxyUrl = `/api/download?url=${encodeURIComponent(src)}&filename=image`;
            return await tryFetch(proxyUrl);
        } catch {
            return null;
        }
    }
}

async function inlineImagesForPdf(root: HTMLElement) {
    const images = Array.from(root.querySelectorAll("img")) as HTMLImageElement[];
    await Promise.all(images.map(async (img) => {
        const src = img.getAttribute("src") || "";
        if (!src || src.startsWith("data:")) return;
        const dataUrl = await fetchImageAsDataUrl(src);
        if (!dataUrl) return;
        img.setAttribute("src", dataUrl);
    }));
}

async function nextPaint(frames: number = 2) {
    for (let i = 0; i < frames; i++) {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
}

function buildA4ExportNode(source: HTMLElement) {
    const wrapper = document.createElement("div");
    wrapper.style.width = "210mm";
    wrapper.style.height = "auto";
    wrapper.style.overflow = "visible";
    wrapper.style.background = "white";
    wrapper.style.boxSizing = "border-box";
    wrapper.style.position = "fixed";
    wrapper.style.left = "0";
    wrapper.style.top = "0";
    wrapper.style.pointerEvents = "none";
    wrapper.style.opacity = "1";
    wrapper.style.zIndex = "2147483647";
    wrapper.style.userSelect = "none";
    wrapper.style.isolation = "isolate";

    const cloned = source.cloneNode(true) as HTMLElement;
    cloned.style.transform = "none";
    cloned.style.width = "210mm";
    cloned.style.background = "white";

    wrapper.appendChild(cloned);
    document.body.appendChild(wrapper);

    return {
        wrapper,
        cloned,
        cleanup: () => {
            try {
                document.body.removeChild(wrapper);
            } catch { /* noop */ }
        }
    };
}

async function renderA4PdfFromWrapper(wrapper: HTMLElement) {
    await nextPaint(2);
    const canvas = await html2canvas(wrapper, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        logging: false,
        backgroundColor: "#ffffff",
        scrollX: 0,
        scrollY: 0,
        windowWidth: 794,
    } as any);

    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
    const pageWidthMm = 210;
    const pageHeightMm = 297;
    const pageHeightPx = Math.floor(canvas.width * (pageHeightMm / pageWidthMm));

    const trimCanvasBottom = (src: HTMLCanvasElement) => {
        const ctx = src.getContext("2d");
        if (!ctx) return src.height;
        const { width, height } = src;
        const img = ctx.getImageData(0, 0, width, height).data;
        const isRowWhite = (y: number) => {
            const start = y * width * 4;
            for (let x = 0; x < width; x++) {
                const i = start + x * 4;
                const r = img[i];
                const g = img[i + 1];
                const b = img[i + 2];
                const a = img[i + 3];
                if (a > 0 && (r < 250 || g < 250 || b < 250)) return false;
            }
            return true;
        };
        let y = height - 1;
        while (y > 0 && isRowWhite(y)) y--;
        return Math.min(height, y + 10);
    };

    const trimmedHeight = trimCanvasBottom(canvas);

    let rendered = 0;
    let pageIndex = 0;
    while (rendered < trimmedHeight) {
        const sliceHeight = Math.min(pageHeightPx, trimmedHeight - rendered);
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceHeight;
        const ctx = pageCanvas.getContext("2d");
        if (!ctx) break;

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        ctx.drawImage(canvas, 0, rendered, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);

        const imgData = pageCanvas.toDataURL("image/jpeg", 1.0);
        if (pageIndex > 0) pdf.addPage();
        const imgHeightMm = (sliceHeight / canvas.width) * pageWidthMm;
        pdf.addImage(imgData, "JPEG", 0, 0, pageWidthMm, Math.min(pageHeightMm, imgHeightMm), undefined, "FAST");

        rendered += sliceHeight;
        pageIndex++;
    }

    return pdf;
}

export default function PublicPOViewPage({ params }: { params: Promise<{ poNumber: string }> }) {
    const { poNumber } = use(params);
    const data = useQuery(api.purchaseOrders.getPublicPODetails, { poNumber });
    const [isDownloading, setIsDownloading] = useState(false);
    const pdfRef = useRef<HTMLDivElement>(null);

    const handleDownload = async () => {
        if (!pdfRef.current) return;

        setIsDownloading(true);
        let cleanupExport: (() => void) | null = null;
        try {
            const { wrapper, cloned, cleanup } = buildA4ExportNode(pdfRef.current);
            cleanupExport = cleanup;
            await inlineImagesForPdf(cloned);
            await Promise.all(Array.from(cloned.getElementsByTagName("img")).map(img => {
                if (img.complete) return Promise.resolve();
                return new Promise((resolve) => {
                    img.onload = resolve;
                    img.onerror = resolve;
                });
            }));
            await nextPaint(2);
            const pdf = await renderA4PdfFromWrapper(wrapper);
            pdf.save(`PO_${poNumber}.pdf`);
            toast.success("PDF downloaded!");
        } catch (error) {
            toast.error("Failed to download PDF");
        } finally {
            cleanupExport?.();
            setIsDownloading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    if (data === undefined) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-10 w-10 animate-spin text-blue-400 mx-auto mb-4" />
                    <p className="text-slate-300">Loading Purchase Order...</p>
                </div>
            </div>
        );
    }

    if (data === null) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
                <div className="text-center max-w-md mx-auto px-4">
                    <div className="p-4 bg-red-500/20 rounded-full w-fit mx-auto mb-4">
                        <FileText className="h-10 w-10 text-red-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">PO Not Found</h1>
                    <p className="text-slate-400 mb-6">
                        The purchase order #{poNumber} could not be found or may have been removed.
                    </p>
                    <Link href="/">
                        <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Go Home
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 print:bg-white">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700 print:hidden">
                <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600 rounded-lg">
                            <FileText className="h-5 w-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-white">Purchase Order</h1>
                            <p className="text-xs text-slate-400 font-mono">#{poNumber}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handlePrint}
                            className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
                        >
                            <Printer className="h-4 w-4 mr-2" />
                            Print
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleDownload}
                            disabled={isDownloading}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {isDownloading ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Download className="h-4 w-4 mr-2" />
                            )}
                            Download PDF
                        </Button>
                    </div>
                </div>
            </header>

            {/* PO Content */}
            <main className="max-w-5xl mx-auto px-4 py-8 print:p-0 print:max-w-none">
                <div
                    ref={pdfRef}
                    className="bg-white shadow-2xl mx-auto print:shadow-none"
                    style={{ width: "210mm", minHeight: "297mm" }}
                >
                    <PurchaseOrderTemplate data={data as any} />
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-slate-700 py-6 print:hidden">
                <div className="max-w-5xl mx-auto px-4 text-center">
                    <p className="text-sm text-slate-400">
                        This is an official Purchase Order from <span className="text-white font-medium">Notion Electronica Pvt. Ltd.</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                        For queries, contact: sales@notionelectronics.com | +91 98258 79970
                    </p>
                </div>
            </footer>
        </div>
    );
}
