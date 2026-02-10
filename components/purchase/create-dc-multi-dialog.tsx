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
import { Truck, Package, Upload, FileText, X, CheckCircle } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import type { Id } from "@/convex/_generated/dataModel";

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
    const [deliveryMode, setDeliveryMode] = useState<"porter" | "private">("porter");
    const [deliveryPersonName, setDeliveryPersonName] = useState("");
    const [vehicleNumber, setVehicleNumber] = useState("");
    const [driverPhone, setDriverPhone] = useState("");
    const [receiverName, setReceiverName] = useState("");
    const [loadingPhotos, setLoadingPhotos] = useState<FileList | null>(null);
    const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
    const [selectedItems, setSelectedItems] = useState<Set<Id<"requests">>>(new Set());
    const [showPDFViewer, setShowPDFViewer] = useState(false);

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
            // Hide PDF viewer by default - user can click "Show PO PDF" to view
            setShowPDFViewer(false);
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

    const handleSubmit = async () => {
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

        setIsSubmitting(true);
        try {
            // Upload photos to Cloudinary
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
                deliveryType: deliveryMode === "porter" ? "public" : "private",
                deliveryPerson: deliveryPersonName,
                deliveryContact: driverPhone,
                vehicleNumber: vehicleNumber || undefined,
                receiverName,
                purchaserName: "",
                loadingPhoto: loadingPhotoData || undefined,
                invoicePhoto: invoicePhotoData || undefined,
            });

            toast.success(`Delivery Challan created successfully for ${dcItems.length} item(s)`);
            onOpenChange(false);
        } catch (error) {
            toast.error("Failed to create delivery challan");
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
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
                        Create Delivery Challan
                        {poNumber && (
                            <Badge variant="outline" className="ml-2 font-mono">
                                PO: {poNumber}
                            </Badge>
                        )}
                    </DialogTitle>
                    <DialogDescription>
                        Fill in delivery details for {selectedItemsCount} selected item(s)
                    </DialogDescription>
                </DialogHeader>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto px-1">
                    <div className="space-y-5 py-4">
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
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting || selectedItemsCount === 0}
                        className="bg-green-600 hover:bg-green-700 text-white"
                    >
                        {isSubmitting ? "Creating..." : `Create DC (${selectedItemsCount} items)`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog >
    );
}
