"use client";

import { useState, useRef } from "react";
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
import { Loader2, Download, Printer, FileText, X } from "lucide-react";
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

    const handleDownload = async () => {
        if (!pdfContentRef.current || !poNumber) return;

        setIsDownloading(true);
        try {
            const html2pdf = await getHtml2Pdf();

            const element = pdfContentRef.current;
            const opt = {
                margin: [0, 0, 0, 0],
                filename: `PO_${poNumber}.pdf`,
                image: { type: "jpeg", quality: 0.98 },
                html2canvas: {
                    scale: 2,
                    useCORS: true,
                    letterRendering: true,
                    scrollX: 0,
                    scrollY: 0
                },
                jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
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
            <DialogContent className="max-w-[900px] w-[95vw] h-[90vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-4 border-b flex flex-row items-center justify-between space-y-0">
                    <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        <DialogTitle>Purchase Order Preview - {poNumber}</DialogTitle>
                    </div>
                    <div className="flex items-center gap-2 pr-8">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handlePrint}
                            disabled={!poData}
                            className="hidden sm:flex"
                        >
                            <Printer className="h-4 w-4 mr-2" />
                            Print
                        </Button>
                        <Button
                            size="sm"
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
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-auto bg-muted/30 p-4 sm:p-8 flex justify-center">
                    {!poData ? (
                        <div className="flex flex-col items-center justify-center h-full gap-4">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="text-sm text-muted-foreground">Loading PO details...</p>
                        </div>
                    ) : (
                        <div
                            className="bg-white shadow-2xl origin-top transition-transform duration-300"
                            style={{ width: "210mm", minHeight: "297mm" }}
                        >
                            <div ref={pdfContentRef}>
                                <PurchaseOrderTemplate data={poData as any} />
                            </div>
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
