"use client";

/**
 * Direct DC Dialog Component
 *
 * Creates a standalone Delivery Challan without any request or PO linkage.
 * Two-step flow:
 *   Step 1 — Fill form (vendor, items, delivery details)
 *   Step 2 — Preview DC and confirm submission
 */

import { useState, useEffect, useMemo, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
    Dialog,
    DialogContent,
    DraggableDialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
    Truck,
    Search,
    X,
    Plus,
    Package,
    FileText,
    Loader2,
    Info,
    Trash2,
} from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { Id } from "@/convex/_generated/dataModel";
import { DeliveryChallanTemplate, type DCData } from "./delivery-challan-template";
import { cn } from "@/lib/utils";

// ── Constants ──────────────────────────────────────────────────────────────

const COMMON_UNITS = [
    "pcs", "nos", "kg", "bags", "ton", "mm", "gm", "ltr",
    "sqft", "cft", "box", "bundle", "roll", "set", "meter",
];

interface DirectDCItemRow {
    id: string;
    itemName: string;
    description: string;
    quantity: number;
    unit: string;
    hsnSacCode: string;
    itemSearchQuery: string;
}

const createEmptyItem = (): DirectDCItemRow => ({
    id: Date.now().toString() + Math.random().toString(36).slice(2),
    itemName: "",
    description: "",
    quantity: 0,
    unit: "pcs",
    hsnSacCode: "",
    itemSearchQuery: "",
});

// ── Component ──────────────────────────────────────────────────────────────

interface DirectDCDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function DirectDCDialog({ open, onOpenChange }: DirectDCDialogProps) {
    const createDirectDC = useMutation(api.deliveries.createDirectDC);
    const inventoryItems = useQuery(api.inventory.getAllInventoryItems);
    const vendors = useQuery(api.vendors.getAllVendors);

    // ── Form State ───────────────────────────────────────────────────────
    const [step, setStep] = useState<1 | 2>(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Vendor
    const [vendorId, setVendorId] = useState<Id<"vendors"> | "">("");
    const [vendorSearch, setVendorSearch] = useState("");
    const [showVendorDropdown, setShowVendorDropdown] = useState(false);
    const [selectedVendorIdx, setSelectedVendorIdx] = useState(0);

    // Items
    const [items, setItems] = useState<DirectDCItemRow[]>([createEmptyItem()]);
    const [activeItemIdx, setActiveItemIdx] = useState<number | null>(null);
    const [showItemDropdown, setShowItemDropdown] = useState(false);
    const [selectedItemSugIdx, setSelectedItemSugIdx] = useState(0);

    // Unit dropdown per item
    const [showUnitDropdown, setShowUnitDropdown] = useState(false);

    // Delivery
    const [deliveryMode, setDeliveryMode] = useState<"public" | "private" | "vendor">("public");
    const [vehicleNumber, setVehicleNumber] = useState("");
    const [driverName, setDriverName] = useState("");
    const [driverPhone, setDriverPhone] = useState("");
    const [receiverName, setReceiverName] = useState("");
    const [dcDate, setDcDate] = useState(new Date().toISOString().split("T")[0]);

    // ── Vendor details (auto-populated) ─────────────────────────────────
    const selectedVendor = useMemo(() => {
        if (!vendorId || !vendors) return null;
        return vendors.find((v) => v._id === vendorId) ?? null;
    }, [vendorId, vendors]);

    // ── Filtered lists ──────────────────────────────────────────────────

    const filteredVendors = useMemo(() => {
        if (!vendors) return [];
        if (!vendorSearch.trim()) return vendors.slice(0, 8);
        const q = vendorSearch.toLowerCase();
        return vendors.filter((v) => v.companyName.toLowerCase().includes(q)).slice(0, 8);
    }, [vendors, vendorSearch]);

    const filteredInventoryItems = useMemo(() => {
        if (activeItemIdx === null || !inventoryItems) return [];
        const q = items[activeItemIdx]?.itemSearchQuery || "";
        if (!q.trim()) return [];
        return inventoryItems
            .filter((inv) => inv.itemName.toLowerCase().includes(q.toLowerCase()))
            .slice(0, 6);
    }, [inventoryItems, items, activeItemIdx]);

    const filteredUnits = useMemo(() => {
        if (activeItemIdx === null) return COMMON_UNITS;
        const current = items[activeItemIdx]?.unit?.toLowerCase() || "";
        if (!current) return COMMON_UNITS;
        return COMMON_UNITS.filter((u) => u.includes(current));
    }, [items, activeItemIdx]);

    // ── Reset on open ───────────────────────────────────────────────────

    useEffect(() => {
        if (open) {
            setStep(1);
            setIsSubmitting(false);
            setVendorId("");
            setVendorSearch("");
            setShowVendorDropdown(false);
            setItems([createEmptyItem()]);
            setActiveItemIdx(null);
            setDeliveryMode("public");
            setVehicleNumber("");
            setDriverName("");
            setDriverPhone("");
            setReceiverName("");
            setDcDate(new Date().toISOString().split("T")[0]);
        }
    }, [open]);

    // ── Handlers ────────────────────────────────────────────────────────

    const handleSelectVendor = (id: Id<"vendors">, name: string) => {
        setVendorId(id);
        setVendorSearch(name);
        setShowVendorDropdown(false);
    };

    const handleItemChange = (index: number, field: keyof DirectDCItemRow, value: any) => {
        setItems((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    };

    const handleSelectInventoryItem = (index: number, invItem: any) => {
        setItems((prev) => {
            const next = [...prev];
            next[index] = {
                ...next[index],
                itemName: invItem.itemName,
                description: invItem.description || "",
                unit: invItem.unit || next[index].unit,
                hsnSacCode: invItem.hsnSacCode || "",
                itemSearchQuery: invItem.itemName,
            };
            return next;
        });
        setShowItemDropdown(false);
    };

    const handleAddItem = () => {
        setItems((prev) => [...prev, createEmptyItem()]);
    };

    const handleRemoveItem = (index: number) => {
        if (items.length <= 1) return;
        setItems((prev) => prev.filter((_, i) => i !== index));
    };

    // ── Validation & Submission ─────────────────────────────────────────

    const validateStep1 = (): boolean => {
        if (!vendorId) { toast.error("Please select a vendor"); return false; }
        if (!receiverName.trim()) { toast.error("Receiver name is required"); return false; }
        if (!driverPhone.trim()) { toast.error("Driver phone is required"); return false; }

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (!item.itemName.trim()) { toast.error(`Item ${i + 1}: Name is required`); return false; }
            if (item.quantity <= 0) { toast.error(`Item ${i + 1}: Quantity must be > 0`); return false; }
            if (!item.unit.trim()) { toast.error(`Item ${i + 1}: Unit is required`); return false; }
        }
        return true;
    };

    const handleNextStep = () => {
        if (validateStep1()) setStep(2);
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const result = await createDirectDC({
                vendorId: vendorId as Id<"vendors">,
                items: items.map((item) => ({
                    itemName: item.itemName.trim(),
                    description: item.description.trim() || undefined,
                    quantity: item.quantity,
                    unit: item.unit,
                    hsnSacCode: item.hsnSacCode || undefined,
                })),
                deliveryType: deliveryMode,
                deliveryPerson: driverName || undefined,
                deliveryContact: driverPhone || undefined,
                vehicleNumber: vehicleNumber || undefined,
                receiverName: receiverName.trim(),
                purchaserName: "",
                dcDate: dcDate ? new Date(dcDate).getTime() : undefined,
            });

            toast.success(`Delivery Challan ${result.dcNumber} created successfully!`);
            onOpenChange(false);
        } catch (error) {
            const msg = error instanceof Error ? error.message : "Failed to create DC";
            toast.error(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    // ── Draft DC data for preview ───────────────────────────────────────

    const draftDCData: DCData = {
        deliveryId: "DRAFT-DC",
        createdAt: dcDate ? new Date(dcDate).getTime() : Date.now(),
        deliveryType: deliveryMode,
        deliveryPerson: driverName,
        deliveryContact: driverPhone,
        vehicleNumber: vehicleNumber,
        receiverName: receiverName,
        po: null,
        vendor: selectedVendor
            ? {
                  companyName: selectedVendor.companyName,
                  contactName: selectedVendor.contactName,
                  address: selectedVendor.address,
                  gstNumber: selectedVendor.gstNumber,
                  phone: selectedVendor.phone,
                  email: selectedVendor.email,
              }
            : null,
        items: items.map((item, i) => ({
            _id: item.id,
            itemName: item.itemName || `Item ${i + 1}`,
            quantity: item.quantity,
            unit: item.unit,
            description: item.description,
            hsnSacCode: item.hsnSacCode,
        })),
    };

    // ── Render ──────────────────────────────────────────────────────────

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DraggableDialogContent className="w-[98vw] sm:w-[1200px] max-w-[100vw] h-[85vh] max-h-[90vh] flex flex-col" onOpenAutoFocus={(e) => e.preventDefault()}>
                <DialogHeader draggable>
                    <DialogTitle className="flex items-center gap-2">
                        <Truck className="h-5 w-5 text-green-600" />
                        {step === 1 ? "Create Direct DC" : "Preview Delivery Challan"}
                    </DialogTitle>
                    <DialogDescription>
                        {step === 1
                            ? "Fill in vendor, items, and delivery details to generate a standalone Delivery Challan."
                            : "Review the DC format before submitting."}
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-1 py-3 space-y-6">
                    {step === 1 ? (
                        <>
                            {/* ── 1. Vendor Section ─────────────────────────── */}
                            <section className="space-y-3">
                                <h3 className="text-sm font-semibold border-b pb-1.5">Vendor / Consignee</h3>

                                <div className="space-y-1.5 relative">
                                    <Label className="text-sm">Vendor Name *</Label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search vendor..."
                                            value={vendorSearch}
                                            onChange={(e) => {
                                                setVendorSearch(e.target.value);
                                                setShowVendorDropdown(true);
                                                setSelectedVendorIdx(0);
                                                if (vendorId) setVendorId("");
                                            }}
                                            onFocus={() => setShowVendorDropdown(true)}
                                            onBlur={() => setTimeout(() => setShowVendorDropdown(false), 200)}
                                            onKeyDown={(e) => {
                                                if (!showVendorDropdown || filteredVendors.length === 0) return;
                                                if (e.key === "ArrowDown") { e.preventDefault(); setSelectedVendorIdx((p) => Math.min(p + 1, filteredVendors.length - 1)); }
                                                if (e.key === "ArrowUp") { e.preventDefault(); setSelectedVendorIdx((p) => Math.max(p - 1, 0)); }
                                                if (e.key === "Enter") {
                                                    e.preventDefault();
                                                    const v = filteredVendors[selectedVendorIdx];
                                                    if (v) handleSelectVendor(v._id, v.companyName);
                                                }
                                            }}
                                            className="h-9 pl-9 pr-8"
                                        />
                                        {vendorSearch && (
                                            <button type="button" onClick={() => { setVendorSearch(""); setVendorId(""); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                                <X className="h-4 w-4" />
                                            </button>
                                        )}
                                        {showVendorDropdown && (filteredVendors.length > 0 || vendorSearch.trim()) && (
                                            <div className="absolute z-[100] w-full mt-1 bg-popover border rounded-md shadow-lg max-h-52 overflow-y-auto">
                                                {filteredVendors.length > 0 ? (
                                                    filteredVendors.map((v, i) => (
                                                        <div
                                                            key={v._id}
                                                            className={cn("px-3 py-2 cursor-pointer hover:bg-accent transition-colors", i === selectedVendorIdx && "bg-accent")}
                                                            onMouseDown={() => handleSelectVendor(v._id, v.companyName)}
                                                        >
                                                            <div className="font-medium truncate text-sm">{v.companyName}</div>
                                                            <div className="text-xs text-muted-foreground truncate">{v.address || v.email}</div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="p-3 text-center text-sm text-muted-foreground">No vendors found.</div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Vendor info chips */}
                                {selectedVendor && (
                                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground bg-muted/40 rounded-md p-2.5">
                                        {selectedVendor.contactName && <div><span className="font-medium text-foreground">Contact:</span> {selectedVendor.contactName}</div>}
                                        {selectedVendor.phone && <div><span className="font-medium text-foreground">Phone:</span> {selectedVendor.phone}</div>}
                                        {selectedVendor.gstNumber && <div><span className="font-medium text-foreground">GST:</span> {selectedVendor.gstNumber}</div>}
                                        {selectedVendor.address && <div className="col-span-2"><span className="font-medium text-foreground">Address:</span> {selectedVendor.address}</div>}
                                    </div>
                                )}
                            </section>

                            {/* ── 2. DC Date ──────────────────────────────── */}
                            <section className="space-y-3">
                                <h3 className="text-sm font-semibold border-b pb-1.5">DC Details</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-sm">DC Date</Label>
                                        <Input type="date" value={dcDate} onChange={(e) => setDcDate(e.target.value)} className="h-9" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-sm text-muted-foreground">DC Number</Label>
                                        <Input value="Auto-generated" disabled className="h-9 bg-muted/50" />
                                    </div>
                                </div>
                            </section>

                            {/* ── 3. Items Section ────────────────────────── */}
                            <section className="space-y-3">
                                <div className="flex items-center justify-between border-b pb-1.5">
                                    <h3 className="text-sm font-semibold">Items</h3>
                                    <Button type="button" variant="ghost" size="sm" onClick={handleAddItem} className="h-7 text-xs gap-1 text-primary">
                                        <Plus className="h-3.5 w-3.5" /> Add Item
                                    </Button>
                                </div>

                                {items.map((item, index) => (
                                    <div key={item.id} className="border rounded-lg p-3 space-y-3 relative bg-card">
                                        {items.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveItem(index)}
                                                className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-destructive transition-colors rounded"
                                                title="Remove item"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        )}

                                        <div className="text-xs font-medium text-muted-foreground">Item {index + 1}</div>

                                        {/* Item Name (with autocomplete) */}
                                        <div className="space-y-1 relative">
                                            <Label className="text-xs">Item Name *</Label>
                                            <div className="relative">
                                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                                <Input
                                                    placeholder="Type to search inventory..."
                                                    value={item.itemSearchQuery}
                                                    onChange={(e) => {
                                                        handleItemChange(index, "itemSearchQuery", e.target.value);
                                                        handleItemChange(index, "itemName", e.target.value);
                                                        setActiveItemIdx(index);
                                                        setShowItemDropdown(true);
                                                        setSelectedItemSugIdx(0);
                                                    }}
                                                    onFocus={() => { setActiveItemIdx(index); setShowItemDropdown(true); }}
                                                    onBlur={() => setTimeout(() => setShowItemDropdown(false), 200)}
                                                    onKeyDown={(e) => {
                                                        if (activeItemIdx !== index || !showItemDropdown || filteredInventoryItems.length === 0) return;
                                                        if (e.key === "ArrowDown") { e.preventDefault(); setSelectedItemSugIdx((p) => Math.min(p + 1, filteredInventoryItems.length - 1)); }
                                                        if (e.key === "ArrowUp") { e.preventDefault(); setSelectedItemSugIdx((p) => Math.max(p - 1, 0)); }
                                                        if (e.key === "Enter") {
                                                            e.preventDefault();
                                                            const inv = filteredInventoryItems[selectedItemSugIdx];
                                                            if (inv) handleSelectInventoryItem(index, inv);
                                                        }
                                                    }}
                                                    className="h-8 pl-8 text-sm"
                                                />
                                                {/* Inventory suggestions dropdown */}
                                                {showItemDropdown && activeItemIdx === index && filteredInventoryItems.length > 0 && (
                                                    <div className="absolute z-[100] w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
                                                        {filteredInventoryItems.map((inv, si) => (
                                                            <div
                                                                key={inv._id}
                                                                className={cn("px-3 py-2 cursor-pointer hover:bg-accent transition-colors", si === selectedItemSugIdx && "bg-accent")}
                                                                onMouseDown={() => handleSelectInventoryItem(index, inv)}
                                                            >
                                                                <div className="font-medium text-sm truncate">{inv.itemName}</div>
                                                                <div className="text-xs text-muted-foreground flex gap-3">
                                                                    {inv.unit && <span>Unit: {inv.unit}</span>}
                                                                    {(inv as any).hsnSacCode && <span>HSN: {(inv as any).hsnSacCode}</span>}
                                                                    {inv.centralStock !== undefined && <span>Stock: {inv.centralStock}</span>}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Description */}
                                        <div className="space-y-1">
                                            <Label className="text-xs">Description</Label>
                                            <Input
                                                placeholder="Item description..."
                                                value={item.description}
                                                onChange={(e) => handleItemChange(index, "description", e.target.value)}
                                                className="h-8 text-sm"
                                            />
                                        </div>

                                        {/* Quantity / Unit / HSN row */}
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="space-y-1">
                                                <Label className="text-xs">Quantity *</Label>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    step="any"
                                                    placeholder="0"
                                                    value={item.quantity || ""}
                                                    onChange={(e) => handleItemChange(index, "quantity", parseFloat(e.target.value) || 0)}
                                                    className="h-8 text-sm"
                                                />
                                            </div>
                                            <div className="space-y-1 relative">
                                                <Label className="text-xs">Unit *</Label>
                                                <Input
                                                    placeholder="pcs"
                                                    value={item.unit}
                                                    onChange={(e) => {
                                                        handleItemChange(index, "unit", e.target.value);
                                                        setActiveItemIdx(index);
                                                        setShowUnitDropdown(true);
                                                    }}
                                                    onFocus={() => { setActiveItemIdx(index); setShowUnitDropdown(true); }}
                                                    onBlur={() => setTimeout(() => setShowUnitDropdown(false), 200)}
                                                    className="h-8 text-sm"
                                                />
                                                {showUnitDropdown && activeItemIdx === index && filteredUnits.length > 0 && (
                                                    <div className="absolute z-[100] w-full mt-1 bg-popover border rounded-md shadow-lg max-h-36 overflow-y-auto">
                                                        {filteredUnits.map((u) => (
                                                            <div
                                                                key={u}
                                                                className="px-3 py-1.5 cursor-pointer hover:bg-accent text-sm transition-colors"
                                                                onMouseDown={() => { handleItemChange(index, "unit", u); setShowUnitDropdown(false); }}
                                                            >
                                                                {u}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">HSN/SAC</Label>
                                                <Input
                                                    placeholder="Optional"
                                                    value={item.hsnSacCode}
                                                    onChange={(e) => handleItemChange(index, "hsnSacCode", e.target.value)}
                                                    className="h-8 text-sm"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </section>

                            {/* ── 4. Delivery Details ─────────────────────── */}
                            <section className="space-y-3">
                                <h3 className="text-sm font-semibold border-b pb-1.5">Delivery Details</h3>

                                {/* Transport Mode */}
                                <div className="space-y-2">
                                    <Label className="text-sm">Transport Mode</Label>
                                    <RadioGroup value={deliveryMode} onValueChange={(v) => setDeliveryMode(v as any)} className="flex gap-2">
                                        {[
                                            { value: "public", label: "Porter", icon: Package },
                                            { value: "private", label: "Private", icon: Truck },
                                            { value: "vendor", label: "Vendor Transport", icon: Truck },
                                        ].map(({ value, label, icon: Icon }) => (
                                            <div key={value} className="flex items-center gap-2 p-2.5 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors flex-1">
                                                <RadioGroupItem value={value} id={`dc-${value}`} />
                                                <Label htmlFor={`dc-${value}`} className="flex items-center gap-1.5 cursor-pointer text-sm flex-1">
                                                    <Icon className="h-3.5 w-3.5" /> {label}
                                                </Label>
                                            </div>
                                        ))}
                                    </RadioGroup>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-sm">Driver Name</Label>
                                        <Input value={driverName} onChange={(e) => setDriverName(e.target.value)} placeholder="Driver name" className="h-9" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-sm">Driver Phone *</Label>
                                        <Input type="tel" value={driverPhone} onChange={(e) => setDriverPhone(e.target.value)} placeholder="Phone number" className="h-9" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-sm">Vehicle Number</Label>
                                        <Input value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} placeholder="GJ-01-XX-1234" className="h-9" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-sm">Receiver Name *</Label>
                                        <Input value={receiverName} onChange={(e) => setReceiverName(e.target.value)} placeholder="Receiver at destination" className="h-9" />
                                    </div>
                                </div>
                            </section>
                        </>
                    ) : (
                        /* ── Step 2: DC Preview ───────────────────────── */
                        <div className="flex justify-center bg-gray-100 dark:bg-gray-900 p-4 border rounded-md">
                            <div className="scale-[0.75] origin-top max-w-full overflow-x-auto shadow-lg bg-white">
                                <DeliveryChallanTemplate data={draftDCData} />
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Footer ──────────────────────────────────────────── */}
                <DialogFooter className="pt-3 border-t mt-1">
                    {step === 1 ? (
                        <div className="flex items-center justify-between w-full">
                            <Button variant="ghost" onClick={() => onOpenChange(false)} className="hover:bg-destructive/10 hover:text-destructive h-10 px-6">
                                Cancel
                            </Button>
                            <Button onClick={handleNextStep} className="bg-primary hover:bg-primary/90 shadow-lg h-10 px-8 gap-2">
                                <FileText className="h-4 w-4" />
                                <span className="font-semibold">Preview DC</span>
                            </Button>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between w-full gap-2">
                            <Button variant="outline" onClick={() => setStep(1)} disabled={isSubmitting} className="h-10 px-4">
                                Back
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg h-10 px-6 gap-2"
                            >
                                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Truck className="h-4 w-4" />}
                                <span className="font-semibold">Create DC</span>
                            </Button>
                        </div>
                    )}
                </DialogFooter>
            </DraggableDialogContent>
        </Dialog>
    );
}
