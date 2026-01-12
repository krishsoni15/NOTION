"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Download, Printer, FileText, X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { PurchaseOrderTemplate } from "./purchase-order-template";
import { toast } from "sonner";

// Use dynamic import for html2pdf to avoid SSR issues
const getHtml2Pdf = async () => {
    // @ts-ignore
    const html2pdf = (await import("html2pdf.js/dist/html2pdf.min.js")).default;
    return html2pdf;
};

interface PDFPreviewDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    poNumber: string | null;
}

export function PDFPreviewDialog({
    open,
    onOpenChange,
    poNumber,
}: PDFPreviewDialogProps) {
    const [isDownloading, setIsDownloading] = useState(false);
    const pdfContentRef = useRef<HTMLDivElement>(null);

    const poData = useQuery(
        api.purchaseOrders.getPurchaseOrderDetails,
        poNumber ? { poNumber } : "skip"
    );

    const [baseScale, setBaseScale] = useState(1);
    const [zoomLevel, setZoomLevel] = useState(1);
    const containerRef = useRef<HTMLDivElement>(null);

    // Reset zoom when dialog opens or PO changes
    useEffect(() => {
        if (open) setZoomLevel(1);
    }, [open, poNumber]);

    useEffect(() => {
        const updateScale = () => {
            if (containerRef.current) {
                const containerWidth = containerRef.current.clientWidth;
                // Padding adjustment (p-4 is 16px, p-8 is 32px)
                const px = window.innerWidth < 640 ? 16 : 32;
                const availableWidth = containerWidth - (px * 2);

                // Create a temporary element to measure 210mm in pixels accurately in the current environment
                const measure = document.createElement('div');
                measure.style.width = '210mm';
                measure.style.visibility = 'hidden';
                measure.style.position = 'absolute';
                document.body.appendChild(measure);
                const paperWidthInPx = measure.getBoundingClientRect().width;
                document.body.removeChild(measure);

                if (paperWidthInPx > 0) {
                    const fitScale = availableWidth / paperWidthInPx;
                    // On large screens, we don't want it to be absurdly large, but we want it to fit nicely
                    // If fitScale > 1, it means the dialog is wider than A4.
                    // We'll cap it at 1.0 or 1.1 to keep it looking like a document, 
                    // unless the user specifically wants it to fill the width.
                    // Given the user complaint "horizontally too small", we'll let it scale up slightly if needed.
                    setBaseScale(Math.min(fitScale, 1.1));
                }
            }
        };

        const observer = new ResizeObserver(updateScale);
        if (containerRef.current) observer.observe(containerRef.current);
        window.addEventListener('resize', updateScale);
        // Also update when poData changes or dialog opens
        setTimeout(updateScale, 100);

        return () => {
            observer.disconnect();
            window.removeEventListener('resize', updateScale);
        };
    }, [open, poData]);

    const handleDownload = async () => {
        if (!pdfContentRef.current || !poNumber) return;

        setIsDownloading(true);
        try {
            const html2pdf = await getHtml2Pdf();

            const element = pdfContentRef.current;
            const opt = {
                margin: 0,
                filename: `PO_${poNumber}.pdf`,
                image: { type: "jpeg", quality: 1.0 },
                html2canvas: {
                    scale: 3, // Higher scale for better quality
                    useCORS: true,
                    logging: false,
                    letterRendering: true,
                    windowWidth: 794, // Approx 210mm in pixels at 96dpi (210/25.4 * 96)
                },
                jsPDF: { unit: "mm", format: "a4", orientation: "portrait", compress: true },
            };

            await html2pdf().set(opt).from(element).save();
            toast.success("PDF downloaded successfully");
        } catch (error) {
            console.error("PDF generation error:", error);
            toast.error("Failed to generate PDF");
        } finally {
            setIsDownloading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="max-w-[1100px] w-[98vw] h-[92vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl bg-background"
                showCloseButton={false}
            >
                <DialogHeader className="p-3 sm:p-4 border-b flex flex-col sm:flex-row items-center justify-between gap-4 bg-muted/20 relative">
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <DialogTitle className="text-base sm:text-lg font-bold tracking-tight">PO Preview</DialogTitle>
                            <p className="text-[10px] text-muted-foreground font-mono">#{poNumber}</p>
                        </div>
                    </div>

                    {/* Central Zoom Controls - Premium appearance */}
                    <div className="flex items-center bg-background/50 backdrop-blur-sm px-2 py-1 rounded-full border shadow-sm touch-manipulation">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full hover:bg-muted"
                            onClick={() => setZoomLevel(prev => Math.max(0.5, prev - 0.1))}
                        >
                            <ZoomOut className="h-4 w-4" />
                        </Button>
                        <div className="flex items-center justify-center min-w-[60px] border-x px-2 mx-1">
                            <span className="text-xs font-bold font-mono">
                                {Math.round(zoomLevel * 100)}%
                            </span>
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full hover:bg-muted"
                            onClick={() => setZoomLevel(prev => Math.min(3, prev + 0.1))}
                        >
                            <ZoomIn className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-full hover:bg-muted ml-1"
                            onClick={() => setZoomLevel(1)}
                            title="Reset"
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handlePrint}
                            disabled={!poData}
                            className="h-9 px-4 hidden md:flex items-center gap-2 font-medium"
                        >
                            <Printer className="h-4 w-4" />
                            Print
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleDownload}
                            disabled={!poData || isDownloading}
                            className="h-9 px-4 flex items-center gap-2 font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
                        >
                            {isDownloading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Download className="h-4 w-4" />
                            )}
                            <span className="hidden xs:inline">Download</span>
                        </Button>

                        <div className="w-[1px] h-6 bg-border mx-1 hidden xs:block" />

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onOpenChange(false)}
                            className="h-9 w-9 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors group"
                            title="Close Preview (Esc)"
                        >
                            <X className="h-5 w-5 group-hover:scale-110 transition-transform" />
                        </Button>
                    </div>
                </DialogHeader>

                <div
                    ref={containerRef}
                    className="flex-1 overflow-auto bg-slate-100 dark:bg-slate-900/50 relative"
                >
                    {!poData ? (
                        <div className="flex flex-col items-center justify-center h-full gap-4">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="text-sm text-muted-foreground">Loading PO details...</p>
                        </div>
                    ) : (
                        <div
                            className="flex flex-col items-center py-4 sm:py-12 px-4 min-h-full w-full"
                        >
                            {/* This wrapper has the EXACT dimensions of the scaled PDF to prevent ghost scrolling */}
                            <div
                                style={{
                                    width: `${210 * baseScale * zoomLevel}mm`,
                                    height: `${297 * baseScale * zoomLevel}mm`,
                                    position: 'relative',
                                    flexShrink: 0
                                }}
                            >
                                <div
                                    className="bg-white shadow-2xl transition-transform duration-200"
                                    style={{
                                        width: "210mm",
                                        height: "297mm",
                                        transform: `scale(${baseScale * zoomLevel})`,
                                        transformOrigin: "top left",
                                    }}
                                >
                                    <div ref={pdfContentRef} style={{ width: "210mm", backgroundColor: 'white' }}>
                                        <PurchaseOrderTemplate data={poData as any} />
                                    </div>
                                </div>
                            </div>
                            {/* Extra spacing at the very bottom */}
                            <div className="h-10 w-full flex-shrink-0" />
                        </div>
                    )}
                </div>

                <DialogFooter className="p-4 border-t sm:hidden">
                    <Button
                        className="w-full"
                        onClick={handleDownload}
                        disabled={!poData || isDownloading}
                    >
                        {isDownloading ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                            <Download className="h-4 w-4 mr-2" />
                        )}
                        Download PDF
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
