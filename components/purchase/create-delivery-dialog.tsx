"use client";

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
import { Truck, Package, Upload, FileText, CheckCircle, Loader2, Plus, X } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { Id } from "@/convex/_generated/dataModel";
import { DeliveryChallanTemplate, type DCData } from "./delivery-challan-template";

interface CreateDeliveryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    requestId?: Id<"requests"> | null;
    poId?: Id<"purchaseOrders">;
    currentQuantity?: number;
    itemName?: string;
    unit?: string;
    isDirectCreation?: boolean; // Flag for direct DC creation without request
    selectedPOIds?: Id<"purchaseOrders">[]; // From Step 1 PO selection
    manualItems?: Array<{
        itemName: string;
        description: string;
        quantity: number;
        unit: string;
        rate: number;
        discount: number;
    }>; // From Step 1 manual entry
}

export function CreateDeliveryDialog({
    open,
    onOpenChange,
    requestId,
    poId,
    currentQuantity = 0,
    itemName = "",
    unit = "",
    isDirectCreation = false,
    selectedPOIds,
    manualItems,
}: CreateDeliveryDialogProps) {
    const createDelivery = useMutation(api.deliveries.createDelivery);

    // If poId is not provided, try to fetch it from the request
    const purchaseOrders = useQuery(
        requestId && !isDirectCreation ? api.purchaseOrders.getPOsByRequestId : ("skip" as any),
        requestId && !isDirectCreation ? { requestId } : ("skip" as any)
    );

    // Fetch recent POs for quick selection (Path I)
    const recentPOs = useQuery(
        isDirectCreation ? api.purchaseOrders.getRecentPurchaseOrders : ("skip" as any),
        isDirectCreation ? { limit: 3 } : ("skip" as any)
    );

    // Determine the actual PO ID to use
    const actualPoId = poId || (purchaseOrders && purchaseOrders.length > 0 ? purchaseOrders[0]._id : undefined);

    // Form State
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deliveryMode, setDeliveryMode] = useState<"porter" | "private">("porter");
    const [deliveryPersonName, setDeliveryPersonName] = useState("");
    const [vehicleNumber, setVehicleNumber] = useState("");
    const [driverPhone, setDriverPhone] = useState("");
    const [receiverName, setReceiverName] = useState("");
    const [itemNameInput, setItemNameInput] = useState(itemName);
    const [quantityInput, setQuantityInput] = useState(currentQuantity.toString());
    const [unitInput, setUnitInput] = useState(unit);
    const [loadingPhotos, setLoadingPhotos] = useState<FileList | null>(null);
    const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
    const [step, setStep] = useState<1 | 2>(1);

    // Direct DC creation states
    const [dcCreationPath, setDcCreationPath] = useState<"po" | "manual">("po");
    const [dcSelectedPOIds, setDcSelectedPOIds] = useState<Id<"purchaseOrders">[]>(selectedPOIds || []);
    const [dcManualItems, setDcManualItems] = useState<Array<{
        itemName: string;
        description: string;
        quantity: number;
        unit: string;
        rate: number;
        discount: number;
    }>>(manualItems || [{ itemName: "", description: "", quantity: 0, unit: "", rate: 0, discount: 0 }]);
    const [showPOBrowser, setShowPOBrowser] = useState(false);

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
            setStep(1);
            
            // Reset direct DC states
            if (isDirectCreation) {
                setDcCreationPath("po");
                setDcSelectedPOIds([]);
                setDcManualItems([{ itemName: "", description: "", quantity: 0, unit: "", rate: 0, discount: 0 }]);
                setShowPOBrowser(false);
            }
        }
    }, [open, isDirectCreation]);

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

    const handleSubmit = async (isDirectDelivery: boolean) => {
        if (!driverPhone) {
            toast.error("Driver Phone is required");
            return;
        }

        if (!receiverName) {
            toast.error("Receiver Name is required");
            return;
        }

        // For direct creation, validate item details
        if (isDirectCreation) {
            if (!itemNameInput) {
                toast.error("Item Name is required");
                return;
            }
            if (!quantityInput || parseFloat(quantityInput) <= 0) {
                toast.error("Quantity must be greater than 0");
                return;
            }
            if (!unitInput) {
                toast.error("Unit is required");
                return;
            }
        }

        setIsSubmitting(true);
        try {
            // Upload photos to R2
            let loadingPhotoData = null;
            let invoicePhotoData = null;

            // Upload loading photos (first one only for now, can enhance to upload all)
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

            // For direct creation, create without request
            if (isDirectCreation) {
                // Create a direct delivery without request linkage
                await createDelivery({
                    poId: actualPoId,
                    items: [{
                        requestId: requestId || ("temp-direct-dc" as any), // Placeholder for direct DC
                        quantity: parseFloat(quantityInput)
                    }],
                    deliveryType: deliveryMode === "porter" ? "public" : "private",
                    deliveryPerson: deliveryPersonName,
                    deliveryContact: driverPhone,
                    vehicleNumber: vehicleNumber || undefined,
                    receiverName,
                    purchaserName: "",
                    loadingPhoto: loadingPhotoData || undefined,
                    invoicePhoto: invoicePhotoData || undefined
                });
            } else {
                // Original flow with request
                await createDelivery({
                    poId: actualPoId,
                    items: [{
                        requestId: requestId!,
                        quantity: currentQuantity
                    }],
                    deliveryType: deliveryMode === "porter" ? "public" : "private",
                    deliveryPerson: deliveryPersonName,
                    deliveryContact: driverPhone,
                    vehicleNumber: vehicleNumber || undefined,
                    receiverName,
                    purchaserName: "",
                    loadingPhoto: loadingPhotoData || undefined,
                    invoicePhoto: invoicePhotoData || undefined
                });
            }

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
        // For direct creation, validate based on selected path
        if (isDirectCreation) {
            if (dcCreationPath === "po") {
                if (dcSelectedPOIds.length === 0) {
                    toast.error("Please select at least one Purchase Order");
                    return;
                }
            } else if (dcCreationPath === "manual") {
                const validItems = dcManualItems.filter(item => 
                    item.itemName.trim() && 
                    item.description.trim() && 
                    item.quantity > 0 && 
                    item.unit.trim() && 
                    item.rate > 0
                );
                if (validItems.length === 0) {
                    toast.error("Please add at least one valid item with all required fields");
                    return;
                }
            }
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
        po: actualPoId ? { poNumber: "Pending/Linked PO" } : null,
        vendor: null,
        items: [{
            _id: requestId || ("direct-dc" as any),
            itemName: isDirectCreation ? itemNameInput : itemName,
            quantity: isDirectCreation ? parseFloat(quantityInput) || 0 : currentQuantity,
            unit: isDirectCreation ? unitInput : unit,
        }],
    };


    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Truck className="h-5 w-5" />
                        {step === 1 ? (isDirectCreation ? "Create Direct Delivery Challan" : "Create Delivery Challan") : "Confirm Delivery Format"}
                    </DialogTitle>
                    <DialogDescription>
                        {step === 1
                            ? (isDirectCreation ? "Fill in the delivery details for direct dispatch" : `Fill in the delivery details for ${itemName}`)
                            : `Review the generated Delivery Challan format before dispatching.`}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-1 py-4">
                    {isDirectCreation && step === 1 && (
                        <div className="space-y-6">
                            {/* Path Selection */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold">Choose Creation Method</h3>
                                <RadioGroup value={dcCreationPath} onValueChange={(value: "po" | "manual") => setDcCreationPath(value)}>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="po" id="path-po" />
                                        <Label htmlFor="path-po" className="font-medium">Using Purchase Orders</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="manual" id="path-manual" />
                                        <Label htmlFor="path-manual" className="font-medium">Manual Entry</Label>
                                    </div>
                                </RadioGroup>
                            </div>

                            {/* Path I: PO Selection */}
                            {dcCreationPath === "po" && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-medium">Select Purchase Orders</h4>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setShowPOBrowser(true)}
                                            className="gap-2"
                                        >
                                            <Plus className="h-4 w-4" />
                                            Browse All POs
                                        </Button>
                                    </div>

                                    {/* Recent POs Quick Select */}
                                    {recentPOs && recentPOs.length > 0 && (
                                        <div className="space-y-2">
                                            <Label className="text-sm text-muted-foreground">Recent POs (Quick Select)</Label>
                                            <div className="grid grid-cols-1 gap-2">
                                                {recentPOs.slice(0, 3).map((po: any) => (
                                                    <div
                                                        key={po._id}
                                                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                                                            dcSelectedPOIds.includes(po._id)
                                                                ? "border-primary bg-primary/5"
                                                                : "border-border hover:border-primary/50"
                                                        }`}
                                                        onClick={() => {
                                                            if (dcSelectedPOIds.includes(po._id)) {
                                                                setDcSelectedPOIds(prev => prev.filter(id => id !== po._id));
                                                            } else {
                                                                setDcSelectedPOIds(prev => [...prev, po._id]);
                                                            }
                                                        }}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <div className="font-medium">{po.poNumber}</div>
                                                                <div className="text-sm text-muted-foreground">
                                                                    {po.itemDescription} • {po.vendor?.companyName}
                                                                </div>
                                                            </div>
                                                            <div className="text-sm font-medium">₹{po.totalAmount.toLocaleString()}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Selected POs Summary */}
                                    {dcSelectedPOIds.length > 0 && (
                                        <div className="p-3 bg-muted/50 rounded-lg">
                                            <div className="text-sm font-medium mb-2">Selected POs: {dcSelectedPOIds.length}</div>
                                            <div className="text-xs text-muted-foreground">
                                                Items from selected POs will be added to the delivery challan
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Path II: Manual Entry */}
                            {dcCreationPath === "manual" && (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-medium">Manual Item Entry</h4>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setDcManualItems(prev => [...prev, { itemName: "", description: "", quantity: 0, unit: "", rate: 0, discount: 0 }])}
                                            className="gap-2"
                                        >
                                            <Plus className="h-4 w-4" />
                                            Add Item
                                        </Button>
                                    </div>

                                    <div className="space-y-3">
                                        {dcManualItems.map((item, index) => (
                                            <div key={index} className="p-4 border rounded-lg space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <h5 className="font-medium">Item {index + 1}</h5>
                                                    {dcManualItems.length > 1 && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setDcManualItems(prev => prev.filter((_, i) => i !== index))}
                                                            className="text-red-600 hover:text-red-700"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                                
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <Label className="text-sm">Item Name</Label>
                                                        <Input
                                                            value={item.itemName}
                                                            onChange={(e) => {
                                                                const newItems = [...dcManualItems];
                                                                newItems[index].itemName = e.target.value;
                                                                setDcManualItems(newItems);
                                                            }}
                                                            placeholder="Enter item name"
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label className="text-sm">Description</Label>
                                                        <Input
                                                            value={item.description}
                                                            onChange={(e) => {
                                                                const newItems = [...dcManualItems];
                                                                newItems[index].description = e.target.value;
                                                                setDcManualItems(newItems);
                                                            }}
                                                            placeholder="Brief description"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-4 gap-3">
                                                    <div>
                                                        <Label className="text-sm">Quantity</Label>
                                                        <Input
                                                            type="number"
                                                            value={item.quantity || ""}
                                                            onChange={(e) => {
                                                                const newItems = [...dcManualItems];
                                                                newItems[index].quantity = parseFloat(e.target.value) || 0;
                                                                setDcManualItems(newItems);
                                                            }}
                                                            placeholder="0"
                                                            min="0"
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label className="text-sm">Unit</Label>
                                                        <Input
                                                            value={item.unit}
                                                            onChange={(e) => {
                                                                const newItems = [...dcManualItems];
                                                                newItems[index].unit = e.target.value;
                                                                setDcManualItems(newItems);
                                                            }}
                                                            placeholder="kg, pcs, etc."
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label className="text-sm">Rate (₹)</Label>
                                                        <Input
                                                            type="number"
                                                            value={item.rate || ""}
                                                            onChange={(e) => {
                                                                const newItems = [...dcManualItems];
                                                                newItems[index].rate = parseFloat(e.target.value) || 0;
                                                                setDcManualItems(newItems);
                                                            }}
                                                            placeholder="0"
                                                            min="0"
                                                        />
                                                    </div>
                                                    <div>
                                                        <Label className="text-sm">Discount (%)</Label>
                                                        <Input
                                                            type="number"
                                                            value={item.discount || ""}
                                                            onChange={(e) => {
                                                                const newItems = [...dcManualItems];
                                                                newItems[index].discount = parseFloat(e.target.value) || 0;
                                                                setDcManualItems(newItems);
                                                            }}
                                                            placeholder="0"
                                                            min="0"
                                                            max="100"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {(!isDirectCreation || step === 2) && (
                        <div>
                            {step === 1 ? (
                        <div className="space-y-5">
                            {/* Item Details - Only for Direct Creation */}
                            {isDirectCreation && (
                                <div className="space-y-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                                    <h3 className="font-semibold text-sm text-blue-900 dark:text-blue-100">Item Details</h3>
                                    
                                    <div className="space-y-2">
                                        <Label htmlFor="itemName">Item Name</Label>
                                        <Input
                                            id="itemName"
                                            value={itemNameInput}
                                            onChange={(e) => setItemNameInput(e.target.value)}
                                            placeholder="Enter item name"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                            <Label htmlFor="quantity">Quantity</Label>
                                            <Input
                                                id="quantity"
                                                type="number"
                                                value={quantityInput}
                                                onChange={(e) => setQuantityInput(e.target.value)}
                                                placeholder="0"
                                                min="0"
                                                step="0.01"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="unit">Unit</Label>
                                            <Input
                                                id="unit"
                                                value={unitInput}
                                                onChange={(e) => setUnitInput(e.target.value)}
                                                placeholder="kg, pcs, etc"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

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

                            {/* Vehicle Number - Show for both modes */}
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
                                <Label htmlFor="phone">Driver Phone</Label>
                                <Input
                                    id="phone"
                                    type="tel"
                                    value={driverPhone}
                                    onChange={(e) => setDriverPhone(e.target.value)}
                                    placeholder="Enter phone number"
                                />
                            </div>

                            {/* Receiver Name */}
                            <div className="space-y-2">
                                <Label htmlFor="receiver">Receiver Name (Site)</Label>
                                <Input
                                    id="receiver"
                                    value={receiverName}
                                    onChange={(e) => setReceiverName(e.target.value)}
                                    placeholder="Enter receiver name"
                                />
                            </div>

                            {/* Upload Loading Photos - Multiple */}
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
                                disabled={isDirectCreation && ((dcCreationPath === "po" && dcSelectedPOIds.length === 0) || (dcCreationPath === "manual" && dcManualItems.every(item => !item.itemName.trim())))}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 h-10 px-8 gap-2 transition-all active:scale-95"
                            >
                                <FileText className="h-4 w-4" />
                                <span className="font-semibold">
                                    {isDirectCreation ? "Continue" : "Preview DC Format"}
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
        </Dialog>
    );
}
