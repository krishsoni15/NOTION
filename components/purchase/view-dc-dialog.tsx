"use client";

import { useState } from "react";

/**
 * View DC Dialog
 * 
 * Shows delivery challan details including:
 * - All items in the delivery with quantities
 * - Delivery party information
 * - Documentation (photos)
 * - Payment information
 * - Vendor details
 */

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Truck,
    User,
    Phone,
    MapPin,
    Camera,
    CreditCard,
    Package,
    Building,
    FileText,
    CheckCircle,
    Clock,
    ChevronRight,
    X,
    Eye
} from "lucide-react";
import { PDFPreviewDialog } from "./pdf-preview-dialog";
import { cn } from "@/lib/utils";
import type { Id } from "@/convex/_generated/dataModel";

interface ViewDCDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    deliveryId: Id<"deliveries"> | null;
}

export function ViewDCDialog({ open, onOpenChange, deliveryId }: ViewDCDialogProps) {
    const [showPdfPreview, setShowPdfPreview] = useState(false);
    const deliveryData = useQuery(
        api.deliveries.getDeliveryWithItems,
        deliveryId ? { deliveryId } : "skip"
    );

    if (!deliveryData && open) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[700px]">
                    <DialogHeader>
                        <DialogTitle>Loading...</DialogTitle>
                    </DialogHeader>
                    <div className="p-8 text-center text-muted-foreground">
                        <div className="animate-pulse flex flex-col items-center gap-4">
                            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                                <Truck className="h-8 w-8 text-muted-foreground/50 animate-bounce" />
                            </div>
                            <p>Loading delivery details...</p>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    if (!deliveryData) {
        return null;
    }

    const deliveryTypeLabel = {
        private: "Private Vehicle",
        public: "Public/Porter",
        vendor: "From Vendor (Transport)"
    }[deliveryData.deliveryType] || deliveryData.deliveryType;

    const deliveryTypeIcon = {
        private: "🚗",
        public: "📦",
        vendor: "🚚"
    }[deliveryData.deliveryType] || "🚛";

    const statusConfig = {
        pending: { label: "Out for Delivery", color: "bg-blue-500", textColor: "text-blue-500" },
        delivered: { label: "Delivered", color: "bg-emerald-500", textColor: "text-emerald-500" },
        cancelled: { label: "Cancelled", color: "bg-red-500", textColor: "text-red-500" }
    }[deliveryData.status] || { label: deliveryData.status, color: "bg-gray-500", textColor: "text-gray-500" };

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="sm:max-w-[700px] max-h-[90vh] p-0 overflow-hidden">
                    {/* Header with gradient */}
                    <div className="relative bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 px-6 py-5 text-white">
                        <button
                            onClick={() => onOpenChange(false)}
                            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>

                        <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl backdrop-blur-sm">
                                    {deliveryTypeIcon}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold tracking-tight">Delivery Challan</h2>
                                    <p className="text-white/80 font-mono text-sm">{deliveryData.deliveryId}</p>
                                </div>
                            </div>

                            <Badge
                                className={cn(
                                    "px-3 py-1.5 text-xs font-semibold uppercase tracking-wide",
                                    deliveryData.status === "delivered" && "bg-emerald-500/20 text-emerald-100 border-emerald-400/30",
                                    deliveryData.status === "pending" && "bg-blue-500/20 text-blue-100 border-blue-400/30",
                                    deliveryData.status === "cancelled" && "bg-red-500/20 text-red-100 border-red-400/30"
                                )}
                            >
                                {statusConfig.label}
                            </Badge>
                        </div>

                        {/* Vendor & PO Info */}
                        {(deliveryData.vendor || deliveryData.po) && (
                            <div className="mt-4 flex flex-wrap gap-4 text-sm">
                                {deliveryData.vendor && (
                                    <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                                        <Building className="h-4 w-4" />
                                        <span className="font-medium">{deliveryData.vendor.companyName}</span>
                                    </div>
                                )}
                                {deliveryData.po && (
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                                            <FileText className="h-4 w-4" />
                                            <span className="font-mono">{deliveryData.po.poNumber}</span>
                                        </div>
                                        <button
                                            onClick={() => setShowPdfPreview(true)}
                                            className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg backdrop-blur-sm transition-colors text-sm font-semibold"
                                        >
                                            <Eye className="h-3.5 w-3.5" />
                                            View PDF
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Scrollable content */}
                    <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
                        <div className="p-6 space-y-6">
                            {/* Items Section - Main Focus */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-bold text-base flex items-center gap-2">
                                        <Package className="h-4 w-4 text-primary" />
                                        Delivery Items
                                    </h3>
                                    <Badge variant="outline" className="text-xs">
                                        {deliveryData.items.length} item{deliveryData.items.length !== 1 ? 's' : ''}
                                    </Badge>
                                </div>

                                <div className="space-y-2">
                                    {deliveryData.items.map((item, index) => (
                                        <div
                                            key={item._id}
                                            className={cn(
                                                "group relative p-4 rounded-xl border-2 transition-all duration-200",
                                                "bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-900 dark:to-slate-800/50",
                                                "border-slate-200 dark:border-slate-700",
                                                "hover:border-primary/30 hover:shadow-md"
                                            )}
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                                    <div className="shrink-0 w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-lg">
                                                        {index + 1}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-semibold text-sm text-foreground truncate">
                                                            {item.itemName}
                                                        </h4>
                                                        {item.description && (
                                                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                                                {item.description}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3 shrink-0">
                                                    <div className="text-right">
                                                        <div className="text-lg font-bold text-primary">
                                                            {item.quantity}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground uppercase tracking-wide">
                                                            {item.unit}
                                                        </div>
                                                    </div>

                                                    <Badge
                                                        variant="outline"
                                                        className={cn(
                                                            "text-[10px] px-2",
                                                            item.status === "delivered" && "bg-emerald-50 text-emerald-600 border-emerald-200",
                                                            item.status === "out_for_delivery" && "bg-blue-50 text-blue-600 border-blue-200"
                                                        )}
                                                    >
                                                        {item.status === "delivered" ? (
                                                            <><CheckCircle className="h-3 w-3 mr-1" /> Delivered</>
                                                        ) : (
                                                            <><Truck className="h-3 w-3 mr-1" /> In Transit</>
                                                        )}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {deliveryData.items.length === 0 && (
                                        <div className="py-8 text-center text-muted-foreground bg-muted/30 rounded-lg border-2 border-dashed">
                                            <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                            <p className="text-sm">No items found in this delivery</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Display Delivery Confirmation Photos if available */}
                            {deliveryData.items.some(item => item.deliveryPhotos && item.deliveryPhotos.length > 0) && (
                                <div className="space-y-3">
                                    <h3 className="font-bold text-sm flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                                        <Camera className="h-4 w-4" />
                                        Item Delivery Photos
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {deliveryData.items.map(item =>
                                            item.deliveryPhotos && item.deliveryPhotos.length > 0 && (
                                                <div key={item._id} className="space-y-2">
                                                    <p className="text-xs font-medium truncate">{item.itemName}</p>
                                                    <div className="grid grid-cols-3 gap-2">
                                                        {item.deliveryPhotos.map((photo, idx) => (
                                                            <div
                                                                key={idx}
                                                                className="aspect-square rounded-md overflow-hidden border border-border cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                                                                onClick={() => window.open(photo.imageUrl, '_blank')}
                                                            >
                                                                <img
                                                                    src={photo.imageUrl}
                                                                    alt={`${item.itemName} proof ${idx + 1}`}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Delivery Party Information */}
                            <div className="space-y-3">
                                <h3 className="font-bold text-sm flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                                    <User className="h-4 w-4" />
                                    Delivery Details
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="p-3 bg-muted/40 rounded-lg">
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Type</p>
                                        <p className="font-medium text-sm">{deliveryTypeLabel}</p>
                                    </div>
                                    {deliveryData.deliveryPerson && (
                                        <div className="p-3 bg-muted/40 rounded-lg">
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Person</p>
                                            <p className="font-medium text-sm">{deliveryData.deliveryPerson}</p>
                                        </div>
                                    )}
                                    {deliveryData.deliveryContact && (
                                        <div className="p-3 bg-muted/40 rounded-lg">
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Contact</p>
                                            <p className="font-medium text-sm flex items-center gap-1.5">
                                                <Phone className="h-3 w-3" />
                                                {deliveryData.deliveryContact}
                                            </p>
                                        </div>
                                    )}
                                    {deliveryData.vehicleNumber && (
                                        <div className="p-3 bg-muted/40 rounded-lg">
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Vehicle</p>
                                            <p className="font-medium text-sm font-mono">{deliveryData.vehicleNumber}</p>
                                        </div>
                                    )}
                                    {deliveryData.receiverName && (
                                        <div className="p-3 bg-muted/40 rounded-lg col-span-2">
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Receiver (Site)</p>
                                            <p className="font-medium text-sm flex items-center gap-1.5">
                                                <MapPin className="h-3 w-3" />
                                                {deliveryData.receiverName}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Documentation */}
                            {(deliveryData.loadingPhoto || deliveryData.invoicePhoto || deliveryData.receiptPhoto) && (
                                <div className="space-y-3">
                                    <h3 className="font-bold text-sm flex items-center gap-2 text-muted-foreground uppercase tracking-wider">
                                        <Camera className="h-4 w-4" />
                                        Documentation
                                    </h3>
                                    <div className="grid grid-cols-3 gap-3">
                                        {deliveryData.loadingPhoto && (
                                            <div className="group cursor-pointer" onClick={() => window.open(deliveryData.loadingPhoto!.imageUrl, '_blank')}>
                                                <div className="aspect-square rounded-lg overflow-hidden border-2 border-border group-hover:border-primary transition-colors">
                                                    <img
                                                        src={deliveryData.loadingPhoto.imageUrl}
                                                        alt="Loading"
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                                        onError={(e) => {
                                                            e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E';
                                                        }}
                                                    />
                                                </div>
                                                <p className="text-[10px] text-muted-foreground text-center mt-1.5 uppercase tracking-wide">Loading</p>
                                            </div>
                                        )}
                                        {deliveryData.invoicePhoto && (
                                            <div className="group cursor-pointer" onClick={() => window.open(deliveryData.invoicePhoto!.imageUrl, '_blank')}>
                                                <div className="aspect-square rounded-lg overflow-hidden border-2 border-border group-hover:border-primary transition-colors">
                                                    <img
                                                        src={deliveryData.invoicePhoto.imageUrl}
                                                        alt="Invoice"
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                                        onError={(e) => {
                                                            e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E';
                                                        }}
                                                    />
                                                </div>
                                                <p className="text-[10px] text-muted-foreground text-center mt-1.5 uppercase tracking-wide">Invoice</p>
                                            </div>
                                        )}
                                        {deliveryData.receiptPhoto && (
                                            <div className="group cursor-pointer" onClick={() => window.open(deliveryData.receiptPhoto!.imageUrl, '_blank')}>
                                                <div className="aspect-square rounded-lg overflow-hidden border-2 border-border group-hover:border-primary transition-colors">
                                                    <img
                                                        src={deliveryData.receiptPhoto.imageUrl}
                                                        alt="Receipt"
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                                        onError={(e) => {
                                                            e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E';
                                                        }}
                                                    />
                                                </div>
                                                <p className="text-[10px] text-muted-foreground text-center mt-1.5 uppercase tracking-wide">Receipt</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Payment Information */}
                            {deliveryData.paymentAmount && (
                                <div className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800">
                                    <h3 className="font-bold text-sm flex items-center gap-2 mb-3">
                                        <CreditCard className="h-4 w-4 text-emerald-600" />
                                        Payment Information
                                    </h3>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Amount</p>
                                            <p className="text-2xl font-bold text-emerald-600">₹{deliveryData.paymentAmount.toFixed(2)}</p>
                                        </div>
                                        <Badge
                                            variant="outline"
                                            className={cn(
                                                "px-3 py-1",
                                                deliveryData.paymentStatus === "paid" && "bg-emerald-100 text-emerald-700 border-emerald-200",
                                                deliveryData.paymentStatus === "pending" && "bg-amber-100 text-amber-700 border-amber-200",
                                                deliveryData.paymentStatus === "partial" && "bg-blue-100 text-blue-700 border-blue-200"
                                            )}
                                        >
                                            {deliveryData.paymentStatus === "paid" && <CheckCircle className="h-3 w-3 mr-1" />}
                                            {deliveryData.paymentStatus === "pending" && <Clock className="h-3 w-3 mr-1" />}
                                            {deliveryData.paymentStatus?.charAt(0).toUpperCase()}{deliveryData.paymentStatus?.slice(1)}
                                        </Badge>
                                    </div>
                                </div>
                            )}

                            {/* Footer Info */}
                            <div className="flex items-center justify-between text-xs text-muted-foreground pt-4 border-t">
                                <div className="flex items-center gap-4">
                                    <span>Created: {new Date(deliveryData.createdAt).toLocaleDateString('en-IN', {
                                        day: '2-digit',
                                        month: 'short',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}</span>
                                    {deliveryData.creator && (
                                        <span>By: <span className="font-medium">{deliveryData.creator.fullName}</span></span>
                                    )}
                                </div>
                                {deliveryData.purchaserName && (
                                    <span>Purchaser: <span className="font-medium">{deliveryData.purchaserName}</span></span>
                                )}
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* PDF Preview Dialog */}
            {deliveryData?.po?.poNumber && (
                <PDFPreviewDialog
                    open={showPdfPreview}
                    onOpenChange={setShowPdfPreview}
                    poNumber={deliveryData.po.poNumber}
                />
            )}
        </>
    );
}
