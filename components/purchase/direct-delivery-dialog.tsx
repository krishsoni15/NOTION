"use client";

/**
 * Direct Delivery Challan Dialog
 * 
 * "Mirror" Protocol Implementation
 * Replicates the existing request-based DC creation UI for direct (request-free) delivery creation.
 * 
 * Features:
 * - No Step 1 selection UI - goes directly to logistics form
 * - Editable item table with multi-line support
 * - Add Row functionality for multiple items
 * - Auto-calculation: Qty × Rate = Total
 * - Notes field for additional instructions
 * - Draft saving with incomplete data allowed
 * - Validation only on final "Create DC" click
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Truck, Package, Upload, FileText, Loader2, Plus, X, Trash2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import type { Id } from "@/convex/_generated/dataModel";
import { DeliveryChallanTemplate, type DCData } from "./delivery-challan-template";

interface DirectDeliveryItem {
    id: string;
    itemName: string;
    description: string;
    quantity: number;
    rate: number;
    unit: string;
    total: number;
}

// ── Portal-based suggestion dropdown ──────────────────────────────────────────
// Renders into document.body so NO overflow/scroll/stacking context can clip it.
// Close strategy: document mousedown listener — fires BEFORE click, so we can
// distinguish "clicked inside dropdown" (skip) vs "clicked outside" (close).
function InventorySuggestPortal({
    inputRef,
    items,
    query,
    onSelect,
    onClose,
}: {
    inputRef: React.RefObject<HTMLInputElement>;
    items: any[];
    query: string;
    onSelect: (inv: any) => void;
    onClose: () => void;
}) {
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

    const updatePos = useCallback(() => {
        if (inputRef.current) {
            const r = inputRef.current.getBoundingClientRect();
            // Use fixed positioning — viewport-relative, no scroll offset needed
            setPos({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 260) });
        }
    }, [inputRef]);

    useEffect(() => {
        updatePos();
        window.addEventListener("resize", updatePos);
        window.addEventListener("scroll", updatePos, true);
        return () => {
            window.removeEventListener("resize", updatePos);
            window.removeEventListener("scroll", updatePos, true);
        };
    }, [updatePos, query]);

    // Close when mousedown fires OUTSIDE both the input AND the dropdown
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            const target = e.target as Node;
            if (
                inputRef.current?.contains(target) ||
                dropdownRef.current?.contains(target)
            ) return; // inside — do nothing
            onClose();
        };
        document.addEventListener("mousedown", handler, true);
        return () => document.removeEventListener("mousedown", handler, true);
    }, [inputRef, onClose]);

    const matches = items.filter(inv =>
        inv.itemName.toLowerCase().includes(query.toLowerCase())
    );

    if (!pos || matches.length === 0 || !query.trim()) return null;

    return createPortal(
        <div
            ref={dropdownRef}
            style={{
                position: "fixed",
                top: pos.top,
                left: pos.left,
                width: pos.width,
                zIndex: 999999,
            }}
            className="rounded-xl border bg-popover shadow-2xl overflow-hidden"
        >
            <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider bg-muted/60 border-b">
                Inventory — click to fill
            </div>
            <div className="max-h-56 overflow-y-auto">
                {matches.map((inv) => (
                    <button
                        key={inv._id}
                        type="button"
                        className="w-full text-left px-3 py-2.5 hover:bg-muted/70 transition-colors border-b last:border-0 flex items-center gap-2"
                        onMouseDown={(e) => {
                            // Prevent input blur so the chain stays alive
                            e.preventDefault();
                        }}
                        onClick={() => {
                            // onClick fires AFTER mousedown; input is still focused
                            onSelect(inv);
                            onClose();
                        }}
                    >
                        <Package className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                        <div className="flex flex-col min-w-0">
                            <span className="text-sm font-medium leading-tight">{inv.itemName}</span>
                            <span className="text-[10px] text-muted-foreground truncate">
                                {(inv as any).description || (inv as any).specification || "No description"}
                                {inv.unit && ` · ${inv.unit}`}
                                {(inv.centralStock ?? 0) > 0 && (
                                    <span className="text-emerald-500 font-semibold ml-1">
                                        ({inv.centralStock} in stock)
                                    </span>
                                )}
                            </span>
                        </div>
                    </button>
                ))}
            </div>
        </div>,
        document.body
    );
}
// ─────────────────────────────────────────────────────────────────────────────


interface DirectDeliveryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
    editingDeliveryId?: Id<"deliveries"> | null;
    onViewDC?: (deliveryId: Id<"deliveries">) => void;
}


export function DirectDeliveryDialog({
    open,
    onOpenChange,
    onSuccess,
    editingDeliveryId,
    onViewDC,
}: DirectDeliveryDialogProps) {
    const createDelivery = useMutation(api.deliveries.createDelivery);
    const updateDelivery = useMutation(api.deliveries.updateDelivery);

    // Load existing delivery if in edit mode
    const existingDelivery = useQuery(
        api.deliveries.getDeliveryWithItems,
        editingDeliveryId ? { deliveryId: editingDeliveryId } : "skip"
    );

    // Form State - Logistics
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deliveryMode, setDeliveryMode] = useState<"porter" | "private">("porter");
    const [deliveryPersonName, setDeliveryPersonName] = useState("");
    const [vehicleNumber, setVehicleNumber] = useState("");
    const [driverPhone, setDriverPhone] = useState("");
    const [receiverName, setReceiverName] = useState("");
    const [notes, setNotes] = useState("");
    const [loadingPhotos, setLoadingPhotos] = useState<FileList | null>(null);
    const [invoiceFile, setInvoiceFile] = useState<File | null>(null);

    // Form State - Items
    const [items, setItems] = useState<DirectDeliveryItem[]>([
        {
            id: "item-1",
            itemName: "",
            description: "",
            quantity: 0,
            rate: 0,
            unit: "",
            total: 0,
        },
    ]);

    const inventoryItems = useQuery(api.inventory.getAllInventoryItems, {});
    const [activeRowId, setActiveRowId] = useState<string | null>(null);
    // Map of item.id → ref to the name input (for portal positioning)
    const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

    // Preview State
    const [showPreview, setShowPreview] = useState(false);

    // Reset form when dialog opens (only for new creation, not editing)
    useEffect(() => {
        if (open && !editingDeliveryId) {
            // New creation mode - reset everything
            setDeliveryMode("porter");
            setDeliveryPersonName("");
            setVehicleNumber("");
            setDriverPhone("");
            setReceiverName("");
            setNotes("");
            setLoadingPhotos(null);
            setInvoiceFile(null);
            setItems([
                {
                    id: "item-1",
                    itemName: "",
                    description: "",
                    quantity: 0,
                    rate: 0,
                    unit: "",
                    total: 0,
                },
            ]);
            setShowPreview(false);
        } else if (open && editingDeliveryId && existingDelivery) {
            // Edit mode - load existing data
            setDeliveryMode(existingDelivery.deliveryType === "public" ? "porter" : "private");
            setDeliveryPersonName(existingDelivery.deliveryPerson || "");
            setVehicleNumber(existingDelivery.vehicleNumber || "");
            setDriverPhone(existingDelivery.deliveryContact || "");
            setReceiverName(existingDelivery.receiverName || "");
            setNotes("");
            setLoadingPhotos(null);
            setInvoiceFile(null);

            // Load items from existing delivery
            if (existingDelivery.items && existingDelivery.items.length > 0) {
                setItems(
                    existingDelivery.items.map((item: any, idx: number) => ({
                        id: `item-${idx}`,
                        itemName: item.itemName || "",
                        description: item.description || "",
                        quantity: item.quantity || 0,
                        rate: item.rate || 0,
                        unit: item.unit || "",
                        total: (item.quantity || 0) * (item.rate || 0),
                    }))
                );
            } else {
                setItems([
                    {
                        id: "item-1",
                        itemName: "",
                        description: "",
                        quantity: 0,
                        rate: 0,
                        unit: "",
                        total: 0,
                    },
                ]);
            }
            setShowPreview(false);
        }
    }, [open, editingDeliveryId, existingDelivery]);

    // Close suggestions on outside click
    useEffect(() => {
        const handler = () => setActiveRowId(null);
        if (activeRowId) {
            window.addEventListener("click", handler);
            return () => window.removeEventListener("click", handler);
        }
    }, [activeRowId]);

    // Calculate total for an item
    const calculateTotal = (quantity: number, rate: number): number => {
        return quantity * rate;
    };

    // Update item field
    const updateItem = (id: string, field: keyof DirectDeliveryItem, value: any) => {
        setItems(prev =>
            prev.map(item => {
                if (item.id !== id) return item;

                const updated = { ...item, [field]: value };

                // Auto-calculate total if quantity or rate changed
                if (field === "quantity" || field === "rate") {
                    updated.total = calculateTotal(updated.quantity, updated.rate);
                }

                return updated;
            })
        );
    };

    // Add new item row
    const addItemRow = () => {
        const newId = `item-${Date.now()}`;
        setItems(prev => [
            ...prev,
            {
                id: newId,
                itemName: "",
                description: "",
                quantity: 0,
                rate: 0,
                unit: "",
                total: 0,
            },
        ]);
    };

    // Remove item row
    const removeItemRow = (id: string) => {
        if (items.length === 1) {
            toast.error("At least one item is required");
            return;
        }
        setItems(prev => prev.filter(item => item.id !== id));
    };

    // Upload photo helper
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

    // Validate form
    const validateForm = (): boolean => {
        if (!driverPhone.trim()) {
            toast.error("Driver Phone is required");
            return false;
        }

        if (!receiverName.trim()) {
            toast.error("Receiver Name is required");
            return false;
        }

        // Validate at least one item with required fields
        const validItems = items.filter(
            item => item.itemName.trim() && item.quantity > 0 && item.unit.trim()
        );

        if (validItems.length === 0) {
            toast.error("Please add at least one item with Name, Quantity, and Unit");
            return false;
        }

        return true;
    };

    // Handle submit
    const handleSubmit = async () => {
        if (!validateForm()) {
            return;
        }

        // Define isEditing at the top level so it's accessible in catch block
        const isEditing = !!editingDeliveryId;

        setIsSubmitting(true);
        try {
            // Upload photos
            let loadingPhotoData = null;
            let invoicePhotoData = null;

            if (loadingPhotos && loadingPhotos.length > 0) {
                toast.info("Uploading loading photo...");
                loadingPhotoData = await uploadPhoto(loadingPhotos[0]);
                if (!loadingPhotoData) {
                    toast.error("Failed to upload loading photo");
                    setIsSubmitting(false);
                    return;
                }
            }

            if (invoiceFile) {
                toast.info("Uploading invoice...");
                invoicePhotoData = await uploadPhoto(invoiceFile);
                if (!invoicePhotoData) {
                    toast.error("Failed to upload invoice");
                    setIsSubmitting(false);
                    return;
                }
            }

            // Prepare items
            const validItems = items.filter(
                item => item.itemName.trim() && item.quantity > 0 && item.unit.trim()
            );

            let deliveryId: Id<"deliveries">;

            if (isEditing) {
                // UPDATE MODE: Call updateDelivery mutation
                await updateDelivery({
                    deliveryId: editingDeliveryId!,
                    items: validItems.map(item => ({
                        itemName: item.itemName,
                        description: item.description,
                        quantity: item.quantity,
                        rate: item.rate,
                        unit: item.unit,
                    })),
                    deliveryType: deliveryMode === "porter" ? "public" : "private",
                    deliveryPerson: deliveryPersonName || undefined,
                    deliveryContact: driverPhone,
                    vehicleNumber: vehicleNumber || undefined,
                    receiverName,
                    loadingPhoto: loadingPhotoData || undefined,
                    invoicePhoto: invoicePhotoData || undefined,
                    status: "delivered", // Mark as finalized after save
                });

                deliveryId = editingDeliveryId!;
                toast.success("Delivery Challan updated successfully");
            } else {
                // CREATE MODE: Call createDelivery mutation
                const result = await createDelivery({
                    items: validItems.map(item => ({
                        requestId: undefined,
                        itemName: item.itemName,
                        description: item.description,
                        quantity: item.quantity,
                        unit: item.unit,
                        rate: item.rate || 0,
                    })),
                    deliveryType: deliveryMode === "porter" ? "public" : "private",
                    deliveryPerson: deliveryPersonName || undefined,
                    deliveryContact: driverPhone,
                    vehicleNumber: vehicleNumber || undefined,
                    receiverName,
                    purchaserName: "",
                    loadingPhoto: loadingPhotoData || undefined,
                    invoicePhoto: invoicePhotoData || undefined,
                    directDelivery: true,
                    status: "delivered", // Mark as finalized after creation
                });

                deliveryId = result;
                toast.success("Delivery Challan created successfully");
            }

            // TRANSITION PROTOCOL: Close form → Open viewer
            onOpenChange(false);

            // Trigger the view modal with the delivery ID
            if (onViewDC) {
                // Small delay to ensure dialog closes first
                setTimeout(() => {
                    onViewDC(deliveryId);
                }, 300);
            }

            onSuccess?.();
        } catch (error) {
            const isEditingError = isEditing;
            toast.error(isEditingError ? "Failed to update delivery challan" : "Failed to create delivery challan");
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Calculate grand total
    const grandTotal = items.reduce((sum, item) => sum + item.total, 0);

    // Draft preview data
    const draftDCData: DCData = {
        deliveryId: "DRAFT-DC-PREVIEW",
        createdAt: Date.now(),
        deliveryType: deliveryMode === "porter" ? "public" : deliveryMode,
        deliveryPerson: deliveryPersonName,
        deliveryContact: driverPhone,
        vehicleNumber: vehicleNumber,
        receiverName: receiverName,
        po: null,
        vendor: null,
        items: items
            .filter(item => item.itemName.trim())
            .map(item => ({
                _id: item.id as any,
                itemName: item.itemName,
                quantity: item.quantity,
                unit: item.unit,
            })),
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[900px] max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Truck className="h-5 w-5" />
                        {showPreview
                            ? "Preview Delivery Challan"
                            : (editingDeliveryId ? "Edit Delivery Challan" : "Create Direct Delivery Challan")
                        }
                    </DialogTitle>
                    <DialogDescription>
                        {showPreview
                            ? "Review the generated Delivery Challan format before dispatching"
                            : (editingDeliveryId
                                ? "Update delivery details and items"
                                : "Enter delivery details and items for direct dispatch")
                        }
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-1 py-4">
                    {!showPreview ? (
                        <div className="space-y-6">
                            {/* Delivery Mode */}
                            <div className="space-y-3">
                                <Label className="text-base font-semibold">Delivery Mode</Label>
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

                            {/* Logistics Section */}
                            <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
                                <h3 className="font-semibold text-base">Logistics Details</h3>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="personName">Delivery Person Name</Label>
                                        <Input
                                            id="personName"
                                            value={deliveryPersonName}
                                            onChange={(e) => setDeliveryPersonName(e.target.value)}
                                            placeholder="Enter name"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Driver Phone *</Label>
                                        <Input
                                            id="phone"
                                            type="tel"
                                            value={driverPhone}
                                            onChange={(e) => setDriverPhone(e.target.value)}
                                            placeholder="Enter phone number"
                                            className="border-red-200 focus:border-red-500"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="vehicle">Vehicle Number</Label>
                                        <Input
                                            id="vehicle"
                                            value={vehicleNumber}
                                            onChange={(e) => setVehicleNumber(e.target.value)}
                                            placeholder="MH-04-XX-1234"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="receiver">Receiver Name (Site) *</Label>
                                        <Input
                                            id="receiver"
                                            value={receiverName}
                                            onChange={(e) => setReceiverName(e.target.value)}
                                            placeholder="Enter receiver name"
                                            className="border-red-200 focus:border-red-500"
                                        />
                                    </div>
                                </div>

                                {/* Notes Field */}
                                <div className="space-y-2">
                                    <Label htmlFor="notes">Additional Notes</Label>
                                    <Textarea
                                        id="notes"
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Enter any additional instructions or comments..."
                                        className="min-h-[80px]"
                                    />
                                </div>
                            </div>

                            {/* Items Section */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-semibold text-base">Items</h3>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={addItemRow}
                                        className="gap-2"
                                    >
                                        <Plus className="h-4 w-4" />
                                        Add Item
                                    </Button>
                                </div>

                                {/* Items Table */}
                                <div className="border rounded-lg overflow-visible">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/50">
                                                <TableHead className="w-[20%]">Item Name</TableHead>
                                                <TableHead className="w-[25%]">Description</TableHead>
                                                <TableHead className="w-[12%]">Qty</TableHead>
                                                <TableHead className="w-[12%]">Unit</TableHead>
                                                <TableHead className="w-[12%]">Rate (₹)</TableHead>
                                                <TableHead className="w-[12%]">Total (₹)</TableHead>
                                                <TableHead className="w-[7%] text-center">Action</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {items.map((item, index) => (
                                                <TableRow key={item.id} className="hover:bg-muted/30">
                                                    <TableCell>
                                                        <Input
                                                            ref={(el) => { inputRefs.current[item.id] = el; }}
                                                            value={item.itemName}
                                                            onChange={(e) => {
                                                                updateItem(item.id, "itemName", e.target.value);
                                                                setActiveRowId(item.id);
                                                            }}
                                                            onFocus={() => setActiveRowId(item.id)}
                                                            onKeyDown={(e) => { if (e.key === "Escape") setActiveRowId(null); }}
                                                            placeholder="Item name"
                                                            className="h-8 text-sm"
                                                            autoComplete="off"
                                                        />
                                                        {/* Portal-based suggestion dropdown — renders at body level */}
                                                        {activeRowId === item.id && item.itemName.trim().length > 0 && inventoryItems && inputRefs.current[item.id] && (
                                                            <InventorySuggestPortal
                                                                inputRef={{ current: inputRefs.current[item.id]! } as React.RefObject<HTMLInputElement>}
                                                                items={inventoryItems}
                                                                query={item.itemName}
                                                                onSelect={(inv) => {
                                                                    setItems(prev => prev.map(p => p.id === item.id ? {
                                                                        ...p,
                                                                        itemName: inv.itemName,
                                                                        description: (inv as any).description || (inv as any).specification || "",
                                                                        unit: inv.unit || "",
                                                                    } : p));
                                                                }}
                                                                onClose={() => setActiveRowId(null)}
                                                            />
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input
                                                            value={item.description}
                                                            onChange={(e) =>
                                                                updateItem(item.id, "description", e.target.value)
                                                            }
                                                            placeholder="Description"
                                                            className="h-8 text-sm"
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input
                                                            type="number"
                                                            value={item.quantity || ""}
                                                            onChange={(e) =>
                                                                updateItem(
                                                                    item.id,
                                                                    "quantity",
                                                                    parseFloat(e.target.value) || 0
                                                                )
                                                            }
                                                            placeholder="0"
                                                            min="0"
                                                            step="0.01"
                                                            className="h-8 text-sm"
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input
                                                            value={item.unit}
                                                            onChange={(e) =>
                                                                updateItem(item.id, "unit", e.target.value)
                                                            }
                                                            placeholder="Unit"
                                                            className="h-8 text-sm"
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input
                                                            type="number"
                                                            value={item.rate || ""}
                                                            onChange={(e) =>
                                                                updateItem(
                                                                    item.id,
                                                                    "rate",
                                                                    parseFloat(e.target.value) || 0
                                                                )
                                                            }
                                                            placeholder="0"
                                                            min="0"
                                                            step="0.01"
                                                            className="h-8 text-sm"
                                                        />
                                                    </TableCell>
                                                    <TableCell className="font-semibold text-sm">
                                                        ₹{item.total.toFixed(2)}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => removeItemRow(item.id)}
                                                            className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>

                                {/* Grand Total */}
                                <div className="flex justify-end pr-4">
                                    <div className="text-lg font-bold">
                                        Grand Total: ₹{grandTotal.toFixed(2)}
                                    </div>
                                </div>
                            </div>

                            {/* File Uploads */}
                            <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
                                <h3 className="font-semibold text-base">Attachments</h3>

                                <div className="space-y-2">
                                    <Label htmlFor="loadingPhoto">Loading Photos (Optional)</Label>
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
                                            Selected: {loadingPhotos.length} photo{loadingPhotos.length > 1 ? "s" : ""}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="invoice">Invoice (Optional)</Label>
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
                    ) : (
                        <div className="flex justify-center bg-gray-100 p-4 border rounded-md">
                            <div className="scale-[0.80] origin-top max-w-full overflow-x-auto shadow-lg bg-white">
                                <DeliveryChallanTemplate data={draftDCData} />
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="pt-4 border-t mt-2">
                    <div className="flex items-center justify-between w-full gap-2">
                        <Button
                            variant="ghost"
                            onClick={() => {
                                if (showPreview) {
                                    setShowPreview(false);
                                } else {
                                    onOpenChange(false);
                                }
                            }}
                            className="hover:bg-destructive/10 hover:text-destructive transition-colors h-10 px-6"
                        >
                            {showPreview ? "Back" : "Cancel"}
                        </Button>

                        <div className="flex items-center gap-2">
                            {!showPreview && (
                                <Button
                                    onClick={() => setShowPreview(true)}
                                    variant="outline"
                                    className="h-10 px-6 gap-2"
                                >
                                    <FileText className="h-4 w-4" />
                                    Preview
                                </Button>
                            )}

                            <Button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 h-10 px-8 gap-2 transition-all active:scale-95"
                            >
                                {isSubmitting ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Truck className="h-4 w-4" />
                                )}
                                <span className="font-semibold">
                                    {editingDeliveryId ? "Save Changes" : "Create DC"}
                                </span>
                            </Button>
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
