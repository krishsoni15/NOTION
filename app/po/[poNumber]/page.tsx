"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { use, useState, useRef } from "react";
import { Loader2, Download, Printer, FileText, ArrowLeft } from "lucide-react";
import { PurchaseOrderTemplate } from "@/components/purchase/purchase-order-template";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Link from "next/link";

// Dynamic import for html2pdf
const getHtml2Pdf = async () => {
    // @ts-ignore
    const html2pdf = (await import("html2pdf.js/dist/html2pdf.min.js")).default;
    return html2pdf;
};

export default function PublicPOViewPage({ params }: { params: Promise<{ poNumber: string }> }) {
    const { poNumber } = use(params);
    const data = useQuery(api.purchaseOrders.getPublicPODetails, { poNumber });
    const [isDownloading, setIsDownloading] = useState(false);
    const pdfRef = useRef<HTMLDivElement>(null);

    const handleDownload = async () => {
        if (!pdfRef.current) return;

        setIsDownloading(true);
        try {
            const html2pdf = await getHtml2Pdf();
            const opt = {
                margin: 0,
                filename: `PO_${poNumber}.pdf`,
                image: { type: "jpeg", quality: 1.0 },
                html2canvas: {
                    scale: 3,
                    useCORS: true,
                    logging: false,
                    windowWidth: 794,
                },
                jsPDF: { unit: "mm", format: "a4", orientation: "portrait", compress: true },
            };

            await html2pdf().set(opt).from(pdfRef.current).save();
            toast.success("PDF downloaded!");
        } catch (error) {
            toast.error("Failed to download PDF");
        } finally {
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
