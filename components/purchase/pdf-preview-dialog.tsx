"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2, Download, Printer, FileText, X, ZoomIn, ZoomOut, RotateCcw, Send, MessageCircle, Mail, ChevronDown, Move } from "lucide-react";
import { PurchaseOrderTemplate } from "./purchase-order-template";
import { DeliveryChallanTemplate } from "./delivery-challan-template";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * Sanitize a cloned document to remove modern CSS color functions
 * (lab, oklch, oklab, lch, color) that html2canvas cannot parse.
 * This covers: <style> text, CSSStyleSheet rules, and computed styles.
 */
function sanitizeClonedDoc(clonedDoc: Document) {
    const unsupportedColorRegex = /oklch\([^)]*\)|oklab\([^)]*\)|\blch\([^)]*\)|\blab\([^)]*\)|\bcolor\([^)]*\)/gi;

    // 1) Sanitize all <style> element text content
    clonedDoc.querySelectorAll('style').forEach(el => {
        if (el.textContent) {
            el.textContent = el.textContent.replace(unsupportedColorRegex, '#000000');
            unsupportedColorRegex.lastIndex = 0;
        }
    });

    // 2) Sanitize CSSStyleSheet rules (covers Tailwind-injected sheets)
    try {
        for (const sheet of Array.from(clonedDoc.styleSheets)) {
            try {
                const rules = sheet.cssRules || sheet.rules;
                if (!rules) continue;
                for (let r = 0; r < rules.length; r++) {
                    const rule = rules[r];
                    unsupportedColorRegex.lastIndex = 0;
                    if (rule.cssText && unsupportedColorRegex.test(rule.cssText)) {
                        unsupportedColorRegex.lastIndex = 0;
                        const newCssText = rule.cssText.replace(unsupportedColorRegex, '#000000');
                        try {
                            sheet.deleteRule(r);
                            sheet.insertRule(newCssText, r);
                        } catch { /* skip rules that can't be replaced */ }
                    }
                }
            } catch { /* cross-origin or inaccessible sheet, skip */ }
        }
    } catch { /* styleSheets access failed, skip */ }

    // 3) Walk every element – use getComputedStyle to detect unsupported values
    //    and forcibly override with safe inline styles
    const colorProps = [
        'color', 'background-color', 'border-color',
        'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
        'outline-color', 'fill', 'stroke', 'text-decoration-color', 'caret-color', 'column-rule-color'
    ];
    const fallbacks: Record<string, string> = {
        'color': '#000000',
        'background-color': 'transparent',
        'border-color': '#000000',
        'border-top-color': '#000000',
        'border-right-color': '#000000',
        'border-bottom-color': '#000000',
        'border-left-color': '#000000',
        'outline-color': '#000000',
        'fill': '#000000',
        'stroke': '#000000',
        'text-decoration-color': '#000000',
        'caret-color': '#000000',
        'column-rule-color': '#000000',
    };

    const win = clonedDoc.defaultView;
    clonedDoc.querySelectorAll('*').forEach(node => {
        const el = node as HTMLElement;
        if (!el.style) return;
        const computed = win?.getComputedStyle(el);
        if (!computed) return;
        for (const prop of colorProps) {
            try {
                const val = computed.getPropertyValue(prop);
                unsupportedColorRegex.lastIndex = 0;
                if (val && unsupportedColorRegex.test(val)) {
                    el.style.setProperty(prop, fallbacks[prop] || '#000000', 'important');
                }
            } catch { /* skip */ }
        }

        // Also sanitize inline CSS text (covers CSS variables in inline styles)
        unsupportedColorRegex.lastIndex = 0;
        const inlineCss = el.style.cssText || '';
        if (unsupportedColorRegex.test(inlineCss)) {
            unsupportedColorRegex.lastIndex = 0;
            el.style.cssText = inlineCss.replace(unsupportedColorRegex, '#000000');
        }
    });
}

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
        // Fallback through same-origin proxy to bypass CORS restrictions
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
    // Allow auto height; we will split to pages if needed.
    wrapper.style.height = "auto";
    wrapper.style.overflow = "visible";
    wrapper.style.background = "white";
    wrapper.style.boxSizing = "border-box";
    wrapper.style.position = "fixed";
    wrapper.style.left = "0";
    wrapper.style.top = "0";
    wrapper.style.pointerEvents = "none";
    // Make it fully paintable for html2canvas. (Nearly-invisible elements can
    // still capture as blank/white depending on browser/GPU.)
    // This may briefly flash during download, but avoids empty PDFs.
    wrapper.style.opacity = "1";
    wrapper.style.zIndex = "2147483647";
    wrapper.style.userSelect = "none";
    wrapper.style.isolation = "isolate";

    const cloned = source.cloneNode(true) as HTMLElement;
    // Ensure clone doesn't inherit any transforms that could affect layout
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
    // Ensure the DOM has painted before capture
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
        onclone: sanitizeClonedDoc,
    } as any);

    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });

    // Trim trailing whitespace to avoid generating an extra blank page.
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
                // consider transparent as white, and allow small JPEG-like noise
                if (a > 0 && (r < 250 || g < 250 || b < 250)) return false;
            }
            return true;
        };

        let y = height - 1;
        while (y > 0 && isRowWhite(y)) y--;
        // add a small safety margin so borders don't get cut
        return Math.min(height, y + 10);
    };

    const trimmedHeight = trimCanvasBottom(canvas);

    // Split the captured canvas into A4 pages if needed.
    const pageWidthMm = 210;
    const pageHeightMm = 297;
    const pageHeightPx = Math.floor(canvas.width * (pageHeightMm / pageWidthMm));

    let rendered = 0;
    let pageIndex = 0;
    while (rendered < trimmedHeight) {
        const sliceHeight = Math.min(pageHeightPx, trimmedHeight - rendered);
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = canvas.width;
        pageCanvas.height = sliceHeight;
        const ctx = pageCanvas.getContext("2d");
        if (!ctx) break;

        // White background
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);

        ctx.drawImage(
            canvas,
            0,
            rendered,
            canvas.width,
            sliceHeight,
            0,
            0,
            canvas.width,
            sliceHeight
        );

        const imgData = pageCanvas.toDataURL("image/jpeg", 1.0);
        if (pageIndex > 0) pdf.addPage();
        // Preserve aspect ratio (avoid stretching content to full A4 height).
        // If the slice is shorter than a full page, it should occupy only that height.
        const imgHeightMm = (sliceHeight / canvas.width) * pageWidthMm;
        pdf.addImage(
            imgData,
            "JPEG",
            0,
            0,
            pageWidthMm,
            Math.min(pageHeightMm, imgHeightMm),
            undefined,
            "FAST"
        );

        rendered += sliceHeight;
        pageIndex++;
    }

    return pdf;
}

interface PDFPreviewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    poNumber?: string | null;
    requestId?: string | null; // Optional: filter to single item
    requestIds?: string[] | null; // Optional: filter to multiple items
    deliveryId?: string | null; // For DC preview
    type?: "po" | "dc"; // Toggle between PO and DC preview
}

export function PDFPreviewDialog({
    open,
    onOpenChange,
    poNumber,
    requestId,
    requestIds,
    deliveryId,
    type = "po", // Default to PO
}: PDFPreviewDialogProps) {
    const [isDownloading, setIsDownloading] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);
    const [isSendingEmail, setIsSendingEmail] = useState(false);
    const pdfContentRef = useRef<HTMLDivElement>(null);
    const pdfExportRef = useRef<HTMLDivElement>(null);

    const poData = useQuery(
        api.purchaseOrders.getPurchaseOrderDetails,
        poNumber && type === "po" ? {
            poNumber,
            requestId: (requestId || undefined) as Id<"requests"> | undefined,
            requestIds: (requestIds || undefined) as Id<"requests">[] | undefined
        } : "skip"
    );

    const dcData = useQuery(
        api.deliveries.getDeliveryWithItems,
        deliveryId && type === "dc" ? { deliveryId: deliveryId as Id<"deliveries"> } : "skip"
    );

    const isDataLoaded = type === "po" ? !!poData : !!dcData;
    const currentData = type === "po" ? poData : dcData;
    const documentName = type === "po" ? "Purchase Order" : "Delivery Challan";
    const documentId = type === "po" ? poNumber : (dcData as any)?.deliveryId || "DC";

    const [zoomLevel, setZoomLevel] = useState(1);
    const containerRef = useRef<HTMLDivElement>(null);

    // Drag/Pan state
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [scrollStart, setScrollStart] = useState({ x: 0, y: 0 });

    const calculateInitialZoom = () => {
        return 1;
    };

    // Reset zoom when dialog opens or PO changes
    useEffect(() => {
        if (open) setZoomLevel(calculateInitialZoom());
    }, [open, poNumber]);

    // Make preview images reliable (same as PDF export):
    // inline/proxy images inside the visible preview so the user sees
    // exactly what will be exported.
    useEffect(() => {
        if (!open) return;
        if (!isDataLoaded) return;
        if (!pdfContentRef.current) return;
        // Fire-and-forget: if an image can't be fetched we still show the rest.
        inlineImagesForPdf(pdfContentRef.current).catch(() => {});
    }, [open, isDataLoaded, poNumber, type]);

    const handleDownload = async () => {
        const exportElement = pdfExportRef.current || pdfContentRef.current;
        if (!exportElement) return;

        setIsDownloading(true);
        let cleanupExport: (() => void) | null = null;
        try {
            const { wrapper, cloned, cleanup } = buildA4ExportNode(exportElement);
            cleanupExport = cleanup;

            // Inline images (avoids html2canvas CORS issues), then wait for them to settle.
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
            pdf.save(`${documentId}.pdf`);
            toast.success("PDF downloaded successfully");
        } catch (error) {
            console.error("PDF generation error:", error);
            toast.error("Failed to generate PDF");
        } finally {
            cleanupExport?.();
            setIsDownloading(false);
        }
    };

    const handlePrint = () => {
        if (!pdfContentRef.current) return;

        setIsPrinting(true);

        // Create a hidden iframe for printing
        const printFrame = document.createElement('iframe');
        printFrame.style.display = 'none';
        document.body.appendChild(printFrame);

        const frameDoc = printFrame.contentDocument || printFrame.contentWindow?.document;
        if (!frameDoc) {
            setIsPrinting(false);
            return;
        }

        // Clone the document content
        const content = pdfContentRef.current.cloneNode(true) as HTMLElement;

        // Write HTML to iframe
        frameDoc.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>${documentName}</title>
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    body {
                        font-family: Arial, sans-serif;
                        background: white;
                    }
                    @media print {
                        body {
                            margin: 0;
                            padding: 0;
                        }
                        .print-surface {
                            width: 210mm;
                            height: 297mm;
                            margin: 0;
                            padding: 0;
                        }
                    }
                </style>
            </head>
            <body>
                ${content.outerHTML}
            </body>
            </html>
        `);
        frameDoc.close();

        // Wait for content to load, then print
        setTimeout(() => {
            printFrame.contentWindow?.print();
            // Remove iframe after printing
            setTimeout(() => {
                document.body.removeChild(printFrame);
                setIsPrinting(false);
            }, 500);
        }, 250);
    };

    const handleShareWhatsApp = () => {
        if (!poData) return;

        const vendorName = poData.vendor?.companyName || "";
        const vendorPhone = poData.vendor?.phone || "";
        const date = new Date(poData.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

        // Calculate total
        const total = poData.items?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;

        // Items summary
        const itemsCount = poData.items?.length || 1;
        const firstItem = poData.items?.[0]?.itemDescription?.split('\n')[0] || "Items";
        const itemsSummary = itemsCount > 1 ? `${firstItem} + ${itemsCount - 1} more` : firstItem;

        // Professional WhatsApp message - no emojis, simple format
        const message = `*Purchase Order*

PO No: *${poNumber}*
Date: ${date}
${vendorName ? `Vendor: ${vendorName}\n` : ''}
Items: ${itemsSummary}
Amount: *Rs. ${total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}*

Kindly confirm receipt and expected delivery date.

Regards,
Notion Electronica Pvt. Ltd.`;

        // If vendor has phone, open chat with that number
        const whatsappUrl = vendorPhone
            ? `https://wa.me/${vendorPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`
            : `https://wa.me/?text=${encodeURIComponent(message)}`;

        window.open(whatsappUrl, '_blank');
        toast.success("Opening WhatsApp...");
    };

    const handleShareEmail = async () => {
        const exportElement = pdfExportRef.current || pdfContentRef.current;
        if (!poData || !poNumber || !exportElement) return;

        const vendorEmail = poData.vendor?.email;
        if (!vendorEmail) {
            toast.error("Vendor email not found");
            return;
        }

        setIsSendingEmail(true);
        const toastId = toast.loading("Sending email...");

        try {
            // Generate PDF Blob
            const { wrapper, cloned, cleanup } = buildA4ExportNode(exportElement);

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
            const pdfBlob = pdf.output("blob");
            cleanup();

            // Prepare form data
            const formData = new FormData();
            formData.append('file', pdfBlob, `PO_${poNumber}.pdf`);
            formData.append('poNumber', poNumber);
            formData.append('vendorName', poData.vendor?.companyName || "Vendor");
            formData.append('vendorEmail', vendorEmail);
            formData.append('date', new Date(poData.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }));
            formData.append('senderName', poData.creator?.fullName || "Notion Team");
            formData.append('senderRole', poData.creator?.role === "manager" ? "Manager" : "Purchase Officer");

            // Call API
            const response = await fetch('/api/send-po', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Failed to send email");
            }

            toast.success(`Email sent to ${vendorEmail}`, { id: toastId });
        } catch (error) {
            console.error("Email sending error:", error);
            toast.error(error instanceof Error ? error.message : "Failed to send email", { id: toastId });
        } finally {
            setIsSendingEmail(false);
        }
    };

    const handleZoomIn = () => setZoomLevel(prev => Math.min(3, prev + 0.1));
    const handleZoomOut = () => setZoomLevel(prev => Math.max(0.3, prev - 0.1));
    const handleResetZoom = () => setZoomLevel(calculateInitialZoom());

    // Drag handlers for panning
    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (!containerRef.current) return;
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });
        setScrollStart({
            x: containerRef.current.scrollLeft,
            y: containerRef.current.scrollTop
        });
    }, []);

    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        if (!isDragging || !containerRef.current) return;
        const deltaX = dragStart.x - e.clientX;
        const deltaY = dragStart.y - e.clientY;
        containerRef.current.scrollLeft = scrollStart.x + deltaX;
        containerRef.current.scrollTop = scrollStart.y + deltaY;
    }, [isDragging, dragStart, scrollStart]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    // Touch handlers for mobile
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (!containerRef.current || e.touches.length !== 1) return;
        const touch = e.touches[0];
        setIsDragging(true);
        setDragStart({ x: touch.clientX, y: touch.clientY });
        setScrollStart({
            x: containerRef.current.scrollLeft,
            y: containerRef.current.scrollTop
        });
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!isDragging || !containerRef.current || e.touches.length !== 1) return;
        const touch = e.touches[0];
        const deltaX = dragStart.x - touch.clientX;
        const deltaY = dragStart.y - touch.clientY;
        containerRef.current.scrollLeft = scrollStart.x + deltaX;
        containerRef.current.scrollTop = scrollStart.y + deltaY;
    }, [isDragging, dragStart, scrollStart]);

    const handleTouchEnd = useCallback(() => {
        setIsDragging(false);
    }, []);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="max-w-6xl w-full h-[95vh] flex flex-col p-0 overflow-hidden border-0 shadow-2xl bg-slate-900 rounded-xl"
                showCloseButton={false}
            >
                {/* Main PDF side */}
                <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header - Compact, No Overflow */}
                <DialogHeader className="px-2 py-2 border-b border-slate-700/50 bg-slate-800 shrink-0 overflow-hidden">
                    <div className="flex items-center gap-1.5 w-full overflow-hidden">
                        {/* Title - Compact */}
                        <div className="flex items-center gap-1.5 shrink-0">
                            <div className="p-1.5 bg-blue-600 rounded-md">
                                <FileText className="h-3.5 w-3.5 text-white" />
                            </div>
                            <div className="hidden xs:block">
                                <DialogTitle className="text-xs font-bold text-white leading-tight">
                                    {documentName} Preview
                                </DialogTitle>
                                <p className="text-[9px] text-slate-400 font-mono">#{documentId}</p>
                            </div>
                        </div>

                        {/* Zoom Controls - Compact */}
                        <div className="flex items-center bg-slate-700/60 rounded-full ml-1 shrink-0">
                            <button
                                className="h-6 w-6 flex items-center justify-center rounded-full text-slate-300 hover:text-white hover:bg-slate-600"
                                onClick={handleZoomOut}
                            >
                                <ZoomOut className="h-3 w-3" />
                            </button>
                            <button
                                className="min-w-[38px] h-6 text-[10px] font-bold text-white font-mono hover:bg-slate-600/50 rounded"
                                onClick={handleResetZoom}
                            >
                                {Math.round(zoomLevel * 100)}%
                            </button>
                            <button
                                className="h-6 w-6 flex items-center justify-center rounded-full text-slate-300 hover:text-white hover:bg-slate-600"
                                onClick={handleZoomIn}
                            >
                                <ZoomIn className="h-3 w-3" />
                            </button>
                            <button
                                className="h-6 w-6 flex items-center justify-center rounded-full text-slate-300 hover:text-white hover:bg-slate-600"
                                onClick={handleResetZoom}
                            >
                                <RotateCcw className="h-2.5 w-2.5" />
                            </button>
                        </div>

                        {/* Spacer */}
                        <div className="flex-1" />

                        {/* Actions - Icon buttons */}
                        <div className="flex items-center gap-0.5 shrink-0">
                            {/* Print */}
                            <button
                                className="h-7 w-7 flex items-center justify-center rounded-md text-slate-300 hover:text-white hover:bg-slate-700 hidden sm:flex"
                                onClick={handlePrint}
                                disabled={!isDataLoaded || isPrinting}
                                title="Print document only"
                            >
                                {isPrinting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Printer className="h-3.5 w-3.5" />}
                            </button>

                            {/* Download */}
                            <button
                                className="h-7 px-2.5 flex items-center gap-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                                onClick={handleDownload}
                                disabled={!isDataLoaded || isDownloading}
                            >
                                {isDownloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                                <span className="hidden md:inline">Download</span>
                            </button>

                            {/* Close */}
                            <button
                                className="h-7 w-7 flex items-center justify-center rounded-md text-slate-400 hover:text-white hover:bg-red-500/30 ml-0.5"
                                onClick={() => onOpenChange(false)}
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                </DialogHeader>

                {/* PDF Content - Draggable */}
                <div
                    ref={containerRef}
                    className={cn(
                        "flex-1 overflow-auto bg-slate-800/30",
                        isDragging ? "cursor-grabbing" : "cursor-grab"
                    )}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    style={{
                        WebkitOverflowScrolling: 'touch',
                    }}
                >
                    {!isDataLoaded ? (
                        <div className="flex flex-col items-center justify-center h-full gap-3">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
                            <p className="text-sm text-slate-400">Loading {documentName} details...</p>
                        </div>
                    ) : (
                        <div
                            className="p-4 sm:p-8 inline-block min-w-full"
                            style={{ minHeight: '100%' }}
                        >
                            {/* PDF Container */}
                            <div
                                className="mx-auto"
                                style={{
                                    width: `calc(210mm * ${zoomLevel})`,
                                    // Let height grow; we page-split on export if needed.
                                    height: "auto",
                                }}
                            >
                                <div
                                    className="bg-white shadow-2xl origin-top-left"
                                    style={{
                                        width: "210mm",
                                        height: "auto",
                                        transform: `scale(${zoomLevel})`,
                                    }}
                                >
                                    <div ref={pdfContentRef} className="print-surface" style={{ width: "210mm", backgroundColor: 'white' }}>
                                        {type === "po" ? (
                                            <PurchaseOrderTemplate data={poData as any} />
                                        ) : (
                                            <DeliveryChallanTemplate data={dcData as any} />
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Hidden export surface (unscaled, stable layout for html2canvas/html2pdf) */}
                <div
                    aria-hidden
                    style={{
                        position: "fixed",
                        left: "-100000px",
                        top: 0,
                        width: "210mm",
                        background: "white",
                        pointerEvents: "none",
                        opacity: 0,
                    }}
                >
                    <div ref={pdfExportRef} style={{ width: "210mm", background: "white" }}>
                        {isDataLoaded ? (
                            type === "po" ? (
                                <PurchaseOrderTemplate data={poData as any} />
                            ) : (
                                <DeliveryChallanTemplate data={dcData as any} />
                            )
                        ) : null}
                    </div>
                </div>

                {/* Drag hint when zoomed */}
                {zoomLevel > 1.1 && (
                    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-slate-800/90 backdrop-blur-sm text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-2 pointer-events-none animate-pulse">
                        <Move className="h-3.5 w-3.5" />
                        <span>Drag to pan</span>
                    </div>
                )}

                {/* Mobile Footer */}
                <div className="sm:hidden p-2 border-t border-slate-700/50 bg-slate-800/90 flex items-center gap-2 shrink-0">
                    {/* Zoom */}
                    <div className="flex items-center bg-slate-700/50 rounded-lg shrink-0">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300" onClick={handleZoomOut}>
                            <ZoomOut className="h-4 w-4" />
                        </Button>
                        <span className="text-xs font-mono text-white w-10 text-center">{Math.round(zoomLevel * 100)}%</span>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300" onClick={handleZoomIn}>
                            <ZoomIn className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Send */}
                    {type === "po" && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="h-9 flex-1 border-slate-600 text-slate-200 bg-transparent">
                                    <Send className="h-4 w-4 mr-1" />
                                    Send
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="center">
                                <DropdownMenuItem onClick={handleShareWhatsApp}><MessageCircle className="h-4 w-4 mr-2 text-green-500" />WhatsApp</DropdownMenuItem>
                                <DropdownMenuItem onClick={handleShareEmail}><Mail className="h-4 w-4 mr-2 text-blue-500" />Email</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}

                    {/* Download */}
                    <Button onClick={handleDownload} disabled={!isDataLoaded || isDownloading} className="h-9 flex-1 bg-blue-600 text-white font-semibold">
                        {isDownloading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
                        Download
                    </Button>
                </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
