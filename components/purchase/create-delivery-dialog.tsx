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
import { Truck, Package, Upload } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { Id } from "@/convex/_generated/dataModel";

interface CreateDeliveryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    requestId: Id<"requests">;
    poId?: Id<"purchaseOrders">;
    currentQuantity: number;
    itemName: string;
    unit: string;
}

export function CreateDeliveryDialog({
    open,
    onOpenChange,
    requestId,
    poId,
    currentQuantity,
    itemName,
    unit,
}: CreateDeliveryDialogProps) {
    const createDelivery = useMutation(api.deliveries.createDelivery);

    // If poId is not provided, try to fetch it from the request
    const purchaseOrders = useQuery(
        api.purchaseOrders.getPOsByRequestId,
        poId ? "skip" : { requestId }
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
    const [loadingPhotos, setLoadingPhotos] = useState<FileList | null>(null);
    const [invoiceFile, setInvoiceFile] = useState<File | null>(null);

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
        }
    }, [open]);

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

    const handleSubmit = async () => {
        if (!actualPoId) {
            toast.error("Cannot create DC: No Purchase Order found for this request. Please create a PO first.");
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

            await createDelivery({
                poId: actualPoId,
                items: [{
                    requestId: requestId,
                    quantity: currentQuantity
                }],
                deliveryType: deliveryMode === "porter" ? "public" : "private",
                deliveryPerson: deliveryPersonName,
                deliveryContact: driverPhone,
                vehicleNumber: vehicleNumber || undefined,
                receiverName,
                purchaserName: "",
                loadingPhoto: loadingPhotoData || undefined,
                invoicePhoto: invoicePhotoData || undefined,
            });

            toast.success("Delivery Challan created successfully");
            onOpenChange(false);
        } catch (error) {
            toast.error("Failed to create delivery challan");
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Create Delivery Challan</DialogTitle>
                    <DialogDescription>
                        Fill in the delivery details for {itemName}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 py-4">
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

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="bg-green-600 hover:bg-green-700 text-white"
                    >
                        {isSubmitting ? "Creating..." : "Create DC"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
