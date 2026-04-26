"use client";

/**
 * Create DC Multi Dialog
 * 
 * Enhanced DC creation with:
 * - Multi-item selection (merge multiple items into one DC)
 * - PO PDF preview on the side
 * - Similar UI to PO creation flow
 */

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Truck, Package, Upload, FileText, X, CheckCircle, Building, Loader2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import type { Id } from "@/convex/_generated/dataModel";
import { DeliveryChallanTemplate, type DCData } from "./delivery-challan-template";


interface DCItem {
    requestId: Id<"requests">;
    itemName: string;
    quantity: number;
    unit: string;
    poNumber?: string;
}

interface CreateDCMultiDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    items: DCItem[];
    poNumber?: string; // For fetching and displaying PDF
}

export function CreateDCMultiDialog({
    open,
    onOpenChange,
    items,
    poNumber,
}: CreateDCMultiDialogProps) {
    const createDelivery = useMutation(api.deliveries.createDelivery);

    // Get the first PO ID from the first item that has one
    const [poId, setPoId] = useState<Id<"purchaseOrders"> | undefined>();

    // Try to fetch PO from the first request item
    const firstRequestPOs = useQuery(
        api.purchaseOrders.getPOsByRequestId,
        items.length > 0 && !poId ? { requestId: items[0].requestId } : "skip"
    );

    // Try to fetch PO by Number if provided (more reliable for generic linking)
    const poIdFromNumber = useQuery(
        api.purchaseOrders.getPOIdByNumber,
        poNumber ? { poNumber } : "skip"
    );

    useEffect(() => {
        if (!poId) {
            if (poIdFromNumber) {
                setPoId(poIdFromNumber);
            } else if (firstRequestPOs && firstRequestPOs.length > 0) {
                setPoId(firstRequestPOs[0]._id);
            }
        }
    }, [firstRequestPOs, poIdFromNumber, poId]);

    // Form State
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deliveryMode, setDeliveryMode] = useState<"porter" | "private" | "vendor">("porter");
    const [deliveryPersonName, setDeliveryPersonName] = useState("");
    const [vehicleNumber, setVehicleNumber] = useState("");
    const [driverPhone, setDriverPhone] = useState("");
    const [receiverName, setReceiverName] = useState("");
    const [loadingPhotos, setLoadingPhotos] = useState<FileList | null>(null);
    const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
    const [selectedItems, setSelectedItems] = useState<Set<Id<"requests">>>(new Set());
    const [step, setStep] = useState<1 | 2>(1);

    useEffect(() => {
        if (open) {
            // Reset form when dialog opens
            setDeliveryMode("porter");
            setDeliveryPersonName("");
            setVehicleNumber("");
            setDriverPhone("");
            setReceiverName("");
            setLoadingPhotos(null);
            setInvoiceFile(null);
            // Select all items by default
            setSelectedItems(new Set(items.map(item => item.requestId)));
            setStep(1);
        }
    }, [open, items]);

    const uploadPhoto = async (file: File): Promise<{ imageUrl: string; imageKey: string } | null> => {
        try {
            const formData = new FormData();
            formData.append("file", file);

            const response = await fetch("/api/upload/dc-photo", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || "Upload failed");
            }

            return await response.json();
        } catch (error) {
            console.error("Photo upload error:", error);
            return null;
        }
    };

    const toggleItemSelection = (requestId: Id<"requests">) => {
        const newSet = new Set(selectedItems);
        if (newSet.has(requestId)) {
            newSet.delete(requestId);
        } else {
            newSet.add(requestId);
        }
        setSelectedItems(newSet);
    };

    const handleSubmit = async (isDirectDelivery: boolean) => {
        if (selectedItems.size === 0) {
            toast.error("Please select at least one item to create DC");
            return;
        }

        setIsSubmitting(true);
        try {
            // Upload photos to R2
            let loadingPhotoData = null;
            let invoicePhotoData = null;

            // Upload loading photos (first one only for now)
            if (loadingPhotos && loadingPhotos.length > 0) {
                toast.info("Uploading loading photo...");
                loadingPhotoData = await uploadPhoto(loadingPhotos[0]);
                if (!loadingPhotoData) {
                    toast.error("Failed to upload loading photo");
                    setIsSubmitting(false);
                    return;
                }
            }

            // Upload invoice photo
            if (invoiceFile) {
                toast.info("Uploading invoice...");
                invoicePhotoData = await uploadPhoto(invoiceFile);
                if (!invoicePhotoData) {
                    toast.error("Failed to upload invoice");
                    setIsSubmitting(false);
                    return;
                }
            }

            // Prepare items for DC
            const dcItems = items
                .filter(item => selectedItems.has(item.requestId))
                .map(item => ({
                    requestId: item.requestId,
                    quantity: item.quantity
                }));

            await createDelivery({
                poId,
                items: dcItems,
                deliveryType: deliveryMode === "porter" ? "public" : deliveryMode as any,
                deliveryPerson: deliveryPersonName,
                deliveryContact: driverPhone,
                vehicleNumber: vehicleNumber || undefined,
                receiverName,
                purchaserName: "",
                loadingPhoto: loadingPhotoData || undefined,
                invoicePhoto: invoicePhotoData || undefined
            });

            toast.success(`Delivery Challan created successfully.`);
            onOpenChange(false);
        } catch (error) {
            toast.error("Failed to create delivery challan");
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleNextStep = () => {
        if (selectedItems.size === 0) {
            toast.error("Please select at least one item to create DC");
            return;
        }
        if (!driverPhone) {
            toast.error("Driver Phone is required");
            return;
        }
        if (!receiverName) {
            toast.error("Receiver Name is required");
            return;
        }
        setStep(2);
    };

    const draftDCData: DCData = {
        deliveryId: "DRAFT-DC-PREVIEW",
        createdAt: Date.now(),
        deliveryType: deliveryMode === "porter" ? "public" : deliveryMode,
        deliveryPerson: deliveryPersonName,
        deliveryContact: driverPhone,
        vehicleNumber: vehicleNumber,
        receiverName: receiverName,
        po: poNumber ? { poNumber } : null,
        vendor: null, // Vendor details optionally omitted for preview
        items: items.filter(i => selectedItems.has(i.requestId)).map(i => ({
            _id: i.requestId,
            itemName: i.itemName,
            quantity: i.quantity,
            unit: i.unit,
        })),
    };


    const selectedItemsCount = selectedItems.size;
    const allSelected = selectedItems.size === items.length;

    const toggleSelectAll = () => {
        if (allSelected) {
            setSelectedItems(new Set());
        } else {
            setSelectedItems(new Set(items.map(item => item.requestId)));
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Truck className="h-5 w-5" />
                        {step === 1 ? "Create Delivery Challan" : "Confirm Delivery Format"}
                        {poNumber && (
                            <Badge variant="outline" className="ml-2 font-mono">
                                PO: {poNumber}
                            </Badge>
                        )}
                    </DialogTitle>
                    <DialogDescription>
                        {step === 1
                            ? `Fill in delivery details for ${selectedItemsCount} selected item(s)`
                            : `Review the generated Delivery Challan format before dispatching.`}
                    </DialogDescription>
                </DialogHeader>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto px-1 py-4">
                    {step === 1 ? (
                        <div className="space-y-5">
                            {/* Items Selection */}
                            <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
                                <div className="flex items-center justify-between mb-3">
                                    <Label className="font-semibold">Select Items ({selectedItemsCount}/{items.length})</Label>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={toggleSelectAll}
                                        className="h-7 text-xs"
                                    >
                                        {allSelected ? "Unselect All" : "Select All"}
                                    </Button>
                                </div>
                                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                    {items.map((item) => (
                                        <div
                                            key={item.requestId}
                                            className="flex items-center space-x-3 p-3 border rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                                            onClick={() => toggleItemSelection(item.requestId)}
                                        >
                                            <Checkbox
                                                checked={selectedItems.has(item.requestId)}
                                                onCheckedChange={() => toggleItemSelection(item.requestId)}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium truncate">{item.itemName}</span>
                                                    <Badge variant="outline" className="text-xs">
                                                        {item.quantity} {item.unit}
                                                    </Badge>
                                                </div>
                                            </div>
                                            {selectedItems.has(item.requestId) && (
                                                <CheckCircle className="h-4 w-4 text-green-600 shrink-0" />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Delivery Mode */}
                            <div className="space-y-3">
                                <Label>Delivery Mode</Label>
                                <RadioGroup value={deliveryMode} onValueChange={(v) => setDeliveryMode(v as "porter" | "private")}>
                                    <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                                        <RadioGroupItem value="porter" id="porter" />
                                        <Label htmlFor="porter" className="flex items-center gap-2 cursor-pointer flex-1">
                                            <Package className="h-4 w-4" />
                                            <span>Porter</span>
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                                        <RadioGroupItem value="private" id="private" />
                                        <Label htmlFor="private" className="flex items-center gap-2 cursor-pointer flex-1">
                                            <Truck className="h-4 w-4" />
                                            <span>Private Vehicle</span>
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
                                        <RadioGroupItem value="vendor" id="vendor" />
                                        <Label htmlFor="vendor" className="flex items-center gap-2 cursor-pointer flex-1">
                                            <Building className="h-4 w-4" />
                                            <span>Vendor Transport</span>
                                        </Label>
                                    </div>
                                </RadioGroup>
                            </div>

                            {/* Delivery Person Name */}
                            <div className="space-y-2">
                                <Label htmlFor="personName">Delivery Person Name</Label>
                                <Input
                                    id="personName"
                                    value={deliveryPersonName}
                                    onChange={(e) => setDeliveryPersonName(e.target.value)}
                                    placeholder="Enter delivery person name"
                                />
                            </div>

                            {/* Vehicle Number */}
                            <div className="space-y-2">
                                <Label htmlFor="vehicle">Vehicle Number</Label>
                                <Input
                                    id="vehicle"
                                    value={vehicleNumber}
                                    onChange={(e) => setVehicleNumber(e.target.value)}
                                    placeholder="MH-04-XX-1234"
                                />
                            </div>

                            {/* Driver Phone */}
                            <div className="space-y-2">
                                <Label htmlFor="phone">Driver Phone *</Label>
                                <Input
                                    id="phone"
                                    type="tel"
                                    value={driverPhone}
                                    onChange={(e) => setDriverPhone(e.target.value)}
                                    placeholder="Enter phone number"
                                    required
                                />
                            </div>

                            {/* Receiver Name */}
                            <div className="space-y-2">
                                <Label htmlFor="receiver">Receiver Name (Site) *</Label>
                                <Input
                                    id="receiver"
                                    value={receiverName}
                                    onChange={(e) => setReceiverName(e.target.value)}
                                    placeholder="Enter receiver name"
                                    required
                                />
                            </div>

                            {/* Upload Loading Photos */}
                            <div className="space-y-2">
                                <Label htmlFor="loadingPhoto">Upload Loading Photos (Optional - Multiple)</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="loadingPhoto"
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        onChange={(e) => setLoadingPhotos(e.target.files)}
                                        className="cursor-pointer"
                                    />
                                    <Upload className="h-4 w-4 text-muted-foreground" />
                                </div>
                                {loadingPhotos && loadingPhotos.length > 0 && (
                                    <p className="text-sm text-muted-foreground">
                                        Selected: {loadingPhotos.length} photo{loadingPhotos.length > 1 ? 's' : ''}
                                    </p>
                                )}
                            </div>

                            {/* Upload Invoice */}
                            <div className="space-y-2">
                                <Label htmlFor="invoice">Upload Invoice (Optional)</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        id="invoice"
                                        type="file"
                                        accept="image/*,.pdf"
                                        onChange={(e) => setInvoiceFile(e.target.files?.[0] || null)}
                                        className="cursor-pointer"
                                    />
                                    <Upload className="h-4 w-4 text-muted-foreground" />
                                </div>
                                {invoiceFile && (
                                    <p className="text-sm text-muted-foreground">
                                        Selected: {invoiceFile.name}
                                    </p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex justify-center bg-gray-100 p-4 border rounded-md">
                            <div className="scale-[0.80] origin-top max-w-full overflow-x-auto shadow-lg bg-white">
                                <DeliveryChallanTemplate data={draftDCData} />
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="pt-4 border-t mt-2">
                    {step === 1 ? (
                        <div className="flex items-center justify-between w-full">
                            <Button
                                variant="ghost"
                                onClick={() => onOpenChange(false)}
                                className="hover:bg-destructive/10 hover:text-destructive transition-colors h-10 px-6"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleNextStep}
                                disabled={selectedItemsCount === 0}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 h-10 px-8 gap-2 transition-all active:scale-95"
                            >
                                <FileText className="h-4 w-4" />
                                <span className="font-semibold">
                                    Preview DC Format
                                </span>
                            </Button>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between w-full gap-2 overflow-x-auto">
                            <Button
                                variant="outline"
                                onClick={() => setStep(1)}
                                disabled={isSubmitting}
                                className="h-10 px-4 whitespace-nowrap"
                            >
                                Back
                            </Button>

                            <div className="flex items-center gap-2">
                                <Button
                                    onClick={() => handleSubmit(false)}
                                    disabled={isSubmitting}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 h-10 px-4 whitespace-nowrap transition-all active:scale-95"
                                >
                                    {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Truck className="h-4 w-4 mr-2" />}
                                    <span className="font-semibold">Confirm Delivery</span>
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog >
    );
}
