"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useEffect, useState, use } from "react";
import { Loader2 } from "lucide-react";
import { PurchaseOrderTemplate } from "@/components/purchase/purchase-order-template";

export default function POPrintPage({ params }: { params: Promise<{ poNumber: string }> }) {
    const { poNumber } = use(params);
    const data = useQuery(api.purchaseOrders.getPurchaseOrderDetails, { poNumber });

    // Auto print when data is loaded
    useEffect(() => {
        if (data) {
            document.title = `PO_${poNumber}`;
            // Auto-print enabled
            setTimeout(() => window.print(), 500);
        }
    }, [data, poNumber]);

    if (data === undefined) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (data === null) {
        return (
            <div className="flex items-center justify-center h-screen">
                <p className="text-xl font-semibold text-red-500">Purchase Order not found</p>
            </div>
        );
    }

    return (
        <div className="bg-white min-h-screen p-8 text-black print:p-0 font-sans text-xs">
            {/* Buttons removed as auto-print triggers immediately */}

            {/* PO Content */}
            <div className="max-w-[210mm] mx-auto bg-white print:w-full">
                <PurchaseOrderTemplate data={data} />
            </div>
        </div>
    );
}
