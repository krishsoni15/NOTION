"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
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
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
    requestId?: string | null; // Optional: filter to single item
    requestIds?: string[] | null; // Optional: filter to multiple items
}

export function PDFPreviewDialog({
    open,
    onOpenChange,
    poNumber,
    requestId,
    requestIds,
}: PDFPreviewDialogProps) {
    const [isDownloading, setIsDownloading] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);
    const [isSendingEmail, setIsSendingEmail] = useState(false);
    const pdfContentRef = useRef<HTMLDivElement>(null);

    const poData = useQuery(
        api.purchaseOrders.getPurchaseOrderDetails,
        poNumber ? { poNumber, requestId: requestId as any, requestIds: requestIds as any } : "skip"
    );

    const [zoomLevel, setZoomLevel] = useState(1);
    const containerRef = useRef<HTMLDivElement>(null);

    // Drag/Pan state
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [scrollStart, setScrollStart] = useState({ x: 0, y: 0 });

    // Reset zoom when dialog opens or PO changes
    useEffect(() => {
        if (open) setZoomLevel(1);
    }, [open, poNumber]);

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
                    scale: 3,
                    useCORS: true,
                    logging: false,
                    letterRendering: true,
                    windowWidth: 794,
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
        setIsPrinting(true);
        setTimeout(() => {
            window.print();
            setIsPrinting(false);
        }, 100);
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
        if (!poData || !poNumber || !pdfContentRef.current) return;

        const vendorEmail = poData.vendor?.email;
        if (!vendorEmail) {
            toast.error("Vendor email not found");
            return;
        }

        setIsSendingEmail(true);
        const toastId = toast.loading("Sending email...");

        try {
            // Generate PDF Blob
            const html2pdf = await getHtml2Pdf();
            const element = pdfContentRef.current;
            const opt = {
                margin: 0,
                filename: `PO_${poNumber}.pdf`,
                image: { type: "jpeg", quality: 1.0 },
                html2canvas: {
                    scale: 3,
                    useCORS: true,
                    logging: false,
                    letterRendering: true,
                    windowWidth: 794,
                },
                jsPDF: { unit: "mm", format: "a4", orientation: "portrait", compress: true },
            };

            const pdfBlob = await html2pdf().set(opt).from(element).output('blob');

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

    const handleZoomIn = () => setZoomLevel(prev => Math.min(3, prev + 0.2));
    const handleZoomOut = () => setZoomLevel(prev => Math.max(0.5, prev - 0.2));
    const handleResetZoom = () => setZoomLevel(1);

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
                className="max-w-[1200px] w-[98vw] h-[95vh] flex flex-col p-0 overflow-hidden border-0 shadow-2xl bg-slate-900 rounded-xl"
                showCloseButton={false}
            >
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
                                    PO Preview
                                </DialogTitle>
                                <p className="text-[9px] text-slate-400 font-mono">#{poNumber}</p>
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
                            {/* Send Dropdown */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button
                                        className="h-7 w-7 flex items-center justify-center rounded-md text-slate-300 hover:text-white hover:bg-slate-700"
                                        disabled={!poData}
                                    >
                                        <Send className="h-3.5 w-3.5" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-40">
                                    <DropdownMenuItem onClick={handleShareWhatsApp} className="gap-2 cursor-pointer text-sm">
                                        <MessageCircle className="h-4 w-4 text-green-500" />
                                        WhatsApp
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleShareEmail} className="gap-2 cursor-pointer text-sm">
                                        <Mail className="h-4 w-4 text-blue-500" />
                                        Email
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {/* Print */}
                            <button
                                className="h-7 w-7 flex items-center justify-center rounded-md text-slate-300 hover:text-white hover:bg-slate-700 hidden sm:flex"
                                onClick={handlePrint}
                                disabled={!poData || isPrinting}
                            >
                                {isPrinting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Printer className="h-3.5 w-3.5" />}
                            </button>

                            {/* Download */}
                            <button
                                className="h-7 px-2.5 flex items-center gap-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                                onClick={handleDownload}
                                disabled={!poData || isDownloading}
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
                    {!poData ? (
                        <div className="flex flex-col items-center justify-center h-full gap-3">
                            <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
                            <p className="text-sm text-slate-400">Loading PO details...</p>
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
                                    height: `calc(297mm * ${zoomLevel})`,
                                }}
                            >
                                <div
                                    className="bg-white shadow-2xl origin-top-left"
                                    style={{
                                        width: "210mm",
                                        height: "297mm",
                                        transform: `scale(${zoomLevel})`,
                                    }}
                                >
                                    <div ref={pdfContentRef} style={{ width: "210mm", backgroundColor: 'white' }}>
                                        <PurchaseOrderTemplate data={poData as any} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
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

                    {/* Download */}
                    <Button onClick={handleDownload} disabled={!poData || isDownloading} className="h-9 flex-1 bg-blue-600 text-white font-semibold">
                        {isDownloading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
                        Download
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
