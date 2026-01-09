"use client";

/**
 * Direct PO Dialog Component
 * 
 * Creates a Purchase Order instantly, bypassing the Manager approval workflow.
 * Use for emergency procurements.
 */

import { useState, useEffect, useMemo } from "react";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { AlertCircle, Plus, Search, X, Info } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import { AddressAutocomplete } from "@/components/vendors/address-autocomplete";
import { VendorFormDialog } from "@/components/vendors/vendor-form-dialog";
import { ItemInfoDialog } from "@/components/requests/item-info-dialog";
import { SiteInfoDialog } from "@/components/requests/site-info-dialog";
import { SiteFormDialog } from "@/components/sites/site-form-dialog";
import { cn } from "@/lib/utils";

interface DirectPODialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

// Common units for construction materials
const COMMON_UNITS = [
    "pcs",
    "bags",
    "kg",
    "ton",
    "mm",
    "gm",
    "nos",
    "ltr",
    "sqft",
    "cft",
    "box",
    "bundle",
    "roll",
];

// Common tax rates
const TAX_RATES = [
    { value: "0", label: "0%" },
    { value: "5", label: "5%" },
    { value: "12", label: "12%" },
    { value: "18", label: "18%" },
    { value: "28", label: "28%" },
];

export function DirectPODialog({ open, onOpenChange }: DirectPODialogProps) {
    const createDirectPO = useMutation(api.purchaseOrders.createDirectPO);
    const inventoryItems = useQuery(api.inventory.getAllInventoryItems);
    const vendors = useQuery(api.vendors.getAllVendors);
    const sites = useQuery(api.sites.getAllSites, {});

    const [isLoading, setIsLoading] = useState(false);
    const [showVendorDialog, setShowVendorDialog] = useState(false);
    const [showSiteDialog, setShowSiteDialog] = useState(false);
    const [vendorSearchQuery, setVendorSearchQuery] = useState("");
    const [itemSearchQuery, setItemSearchQuery] = useState("");

    const [showItemSuggestions, setShowItemSuggestions] = useState(false);
    const [showVendorSuggestions, setShowVendorSuggestions] = useState(false);
    const [showUnitSuggestions, setShowUnitSuggestions] = useState(false);
    const [showPerUnitSuggestions, setShowPerUnitSuggestions] = useState(false);

    const [infoItemName, setInfoItemName] = useState<string | null>(null);
    const [infoSiteId, setInfoSiteId] = useState<Id<"sites"> | null>(null);

    const [formData, setFormData] = useState({
        itemDescription: "",
        hsnCode: "",
        quantity: 0,
        unit: "pcs",
        deliverySite: "",
        vendorId: "" as Id<"vendors"> | "",
        vendorName: "",
        vendorEmail: "",
        gstNumber: "",
        vendorAddress: "",
        unitPrice: 0,
        perUnitBasis: 1,
        perUnitBasisUnit: "pcs",
        discountPercent: "0",
        taxRate: "18",
        validTill: "",
        notes: "",
    });

    const filteredInventoryItems = useMemo(() => {
        if (!inventoryItems || !itemSearchQuery.trim()) return [];
        const query = itemSearchQuery.toLowerCase();
        return inventoryItems
            .filter((item) => item.itemName.toLowerCase().includes(query))
            .slice(0, 5);
    }, [inventoryItems, itemSearchQuery]);

    const filteredVendors = useMemo(() => {
        if (!vendors || !vendorSearchQuery.trim()) return [];
        const query = vendorSearchQuery.toLowerCase();
        return vendors
            .filter((vendor) =>
                vendor.companyName.toLowerCase().includes(query)
            )
            .slice(0, 5);
    }, [vendors, vendorSearchQuery]);

    useEffect(() => {
        if (formData.vendorId && vendors) {
            const selectedVendor = vendors.find((v) => v._id === formData.vendorId);
            if (selectedVendor) {
                setFormData((prev) => ({
                    ...prev,
                    vendorName: selectedVendor.companyName,
                    vendorEmail: selectedVendor.email || "",
                    gstNumber: selectedVendor.gstNumber || "",
                    vendorAddress: selectedVendor.address || "",
                }));
                setVendorSearchQuery(selectedVendor.companyName);
            }
        }
    }, [formData.vendorId, vendors]);

    const calculateTotal = () => {
        const basis = formData.perUnitBasis || 1;
        const discount = parseFloat(formData.discountPercent) || 0;
        const quantity = formData.quantity;
        const rate = formData.unitPrice;

        const baseAmount = (quantity / basis) * rate;
        const discountAmount = (baseAmount * discount) / 100;
        const taxable = baseAmount - discountAmount;
        const tax = (taxable * parseFloat(formData.taxRate)) / 100;
        return taxable + tax;
    };

    const handleReset = () => {
        setFormData({
            itemDescription: "",
            hsnCode: "",
            quantity: 0,
            unit: "pcs",
            deliverySite: "",
            vendorId: "",
            vendorName: "",
            vendorEmail: "",
            gstNumber: "",
            vendorAddress: "",
            unitPrice: 0,
            perUnitBasis: 1,
            perUnitBasisUnit: "pcs",
            discountPercent: "0",
            taxRate: "18",
            validTill: "",
            notes: "",
        });
        setVendorSearchQuery("");
        setItemSearchQuery("");
        setInfoItemName(null);
        setInfoSiteId(null);
    };

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            handleReset();
        }
        onOpenChange(newOpen);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            if (!formData.itemDescription.trim()) throw new Error("Item description is required");
            if (formData.quantity <= 0) throw new Error("Quantity must be greater than 0");
            if (!formData.deliverySite) throw new Error("Delivery site is required");
            if (!formData.vendorId) throw new Error("Vendor is required");
            if (formData.unitPrice <= 0) throw new Error("Unit price must be greater than 0");
            if (!formData.validTill) throw new Error("PO expiry date is required");

            await createDirectPO({
                itemDescription: formData.itemDescription,
                hsnSacCode: formData.hsnCode || undefined,
                quantity: formData.quantity,
                unit: formData.unit,
                deliverySiteId: formData.deliverySite as Id<"sites">,
                vendorId: formData.vendorId,
                unitRate: formData.unitPrice,
                gstTaxRate: parseFloat(formData.taxRate),
                validTill: new Date(formData.validTill).getTime(),
                notes: formData.notes || undefined,
                discountPercent: parseFloat(formData.discountPercent) || 0,
                perUnitBasis: formData.perUnitBasis || 1,
                perUnitBasisUnit: formData.perUnitBasisUnit || formData.unit,
            });

            toast.success("Direct PO request generated successfully!", {
                description: "The PO is now pending approval.",
            });

            handleOpenChange(false);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Failed to create Direct PO";
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleItemSelect = (itemName: string, unit?: string) => {
        setFormData((prev) => ({
            ...prev,
            itemDescription: itemName,
            unit: unit || prev.unit, // Auto-fill unit if available
            perUnitBasisUnit: unit || prev.unit, // Auto-fill per unit
        }));
        setItemSearchQuery(itemName);
        setShowItemSuggestions(false);
    };

    const handleUnitSelect = (unit: string) => {
        setFormData(prev => ({ ...prev, unit }));
        setShowUnitSuggestions(false);
    };

    const handlePerUnitSelect = (unit: string) => {
        setFormData(prev => ({ ...prev, perUnitBasisUnit: unit }));
        setShowPerUnitSuggestions(false);
    };

    return (
        <>
            <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-orange-500" />
                            Create Direct PO
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-6 py-2">
                        {/* Order Details Section */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-foreground border-b pb-2">
                                Order Details
                            </h3>

                            {/* Row 1: Item & Unit */}
                            <div className="grid grid-cols-[3fr,1fr,auto] gap-3 items-end">
                                <div className="space-y-1.5 relative">
                                    <Label htmlFor="itemDescription" className="text-sm">Item Name</Label>
                                    <div className="relative">
                                        <Input
                                            id="itemDescription"
                                            placeholder="Item Name (e.g. Cement)"
                                            value={itemSearchQuery}
                                            onChange={(e) => {
                                                setItemSearchQuery(e.target.value);
                                                setFormData(prev => ({ ...prev, itemDescription: e.target.value }));
                                                setShowItemSuggestions(true);
                                            }}
                                            onFocus={() => setShowItemSuggestions(true)}
                                            required
                                            className="h-9"
                                        />
                                        {itemSearchQuery && (
                                            <button onClick={() => { setItemSearchQuery(""); setFormData(p => ({ ...p, itemDescription: "" })); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                                <X className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                    {showItemSuggestions && filteredInventoryItems.length > 0 && (
                                        <div className="absolute z-[100] w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
                                            {filteredInventoryItems.map((item) => (
                                                <button key={item._id} type="button" onClick={() => handleItemSelect(item.itemName, item.unit)} className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex justify-between">
                                                    <span>{item.itemName}</span>
                                                    {item.unit && <span className="text-xs text-muted-foreground">{item.unit}</span>}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-1.5 relative">
                                    <Label htmlFor="unit" className="text-sm">Unit</Label>
                                    <Input
                                        id="unit"
                                        placeholder="Unit"
                                        value={formData.unit}
                                        onChange={(e) => {
                                            setFormData(prev => ({ ...prev, unit: e.target.value }));
                                            setShowUnitSuggestions(true);
                                        }}
                                        onFocus={() => setShowUnitSuggestions(true)}
                                        className="h-9"
                                    />
                                    {showUnitSuggestions && COMMON_UNITS.length > 0 && (
                                        <div className="absolute z-[100] w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
                                            {COMMON_UNITS.filter(u => u.includes(formData.unit.toLowerCase())).map(u => (
                                                <button key={u} type="button" onClick={() => handleUnitSelect(u)} className="w-full px-3 py-2 text-left text-sm hover:bg-accent">
                                                    {u}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <Button type="button" variant="outline" size="icon" className="h-9 w-9 mb-[1px]" onClick={() => itemSearchQuery && setInfoItemName(itemSearchQuery)} disabled={!itemSearchQuery}>
                                    <Info className="h-4 w-4" />
                                </Button>
                            </div>

                            {/* Row 2: Quantity & HSN */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="quantity" className="text-sm">Quantity *</Label>
                                    <Input id="quantity" type="number" min="0" step="0.01" value={formData.quantity || ""} onChange={(e) => setFormData(p => ({ ...p, quantity: parseFloat(e.target.value) || 0 }))} required className="h-9" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="hsnCode" className="text-sm">HSN Code</Label>
                                    <Input id="hsnCode" value={formData.hsnCode} onChange={(e) => setFormData(p => ({ ...p, hsnCode: e.target.value }))} className="h-9" />
                                </div>
                            </div>

                            {/* Row 3: Site */}
                            <div className="grid grid-cols-[1fr,auto] gap-2 items-end">
                                <div className="space-y-1.5">
                                    <Label htmlFor="deliverySite" className="text-sm">Delivery Site *</Label>
                                    <Select value={formData.deliverySite} onValueChange={(v) => setFormData(p => ({ ...p, deliverySite: v }))}>
                                        <SelectTrigger className="h-9"><SelectValue placeholder="Select site" /></SelectTrigger>
                                        <SelectContent>
                                            {sites?.map((site) => <SelectItem key={site._id} value={site._id}>{site.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex gap-1">
                                    <Button type="button" variant="outline" size="icon" className="h-9 w-9 mb-[1px]" onClick={() => formData.deliverySite && setInfoSiteId(formData.deliverySite as Id<"sites">)} disabled={!formData.deliverySite}>
                                        <Info className="h-4 w-4" />
                                    </Button>
                                    <Button type="button" variant="outline" size="icon" className="h-9 w-9 mb-[1px]" onClick={() => setShowSiteDialog(true)}>
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Vendor & Pricing Section */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-foreground border-b pb-2">Vendor & Pricing</h3>

                            {/* Row 1: Vendor Name */}
                            <div className="grid grid-cols-[1fr,auto] gap-3 items-end">
                                <div className="space-y-1.5 relative">
                                    <Label htmlFor="vendorName" className="text-sm">Vendor Name *</Label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="vendorName"
                                            placeholder="Start typing vendor name..."
                                            value={vendorSearchQuery}
                                            onChange={(e) => {
                                                setVendorSearchQuery(e.target.value);
                                                setShowVendorSuggestions(true);
                                                if (formData.vendorId) setFormData(p => ({ ...p, vendorId: "", vendorEmail: "", gstNumber: "", vendorAddress: "" }));
                                            }}
                                            onFocus={() => setShowVendorSuggestions(true)}
                                            className="h-9 pl-9"
                                        />
                                        {showVendorSuggestions && filteredVendors.length > 0 && (
                                            <div className="absolute z-[100] w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
                                                {filteredVendors.map((vendor) => (
                                                    <button key={vendor._id} type="button" onClick={() => { setFormData(p => ({ ...p, vendorId: vendor._id })); setShowVendorSuggestions(false); }} className="w-full px-3 py-2 text-left text-sm hover:bg-accent">
                                                        <div className="font-medium">{vendor.companyName}</div>
                                                        <div className="text-xs text-muted-foreground">{vendor.email}</div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    <Button type="button" variant="outline" size="icon" className="h-9 w-9 mb-[1px]" onClick={() => setShowVendorDialog(true)}>
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            {/* Row 2: Email & GST */}
                            {formData.vendorId && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5"><Label className="text-sm">Vendor Email</Label><Input value={formData.vendorEmail} readOnly className="h-9 bg-muted/50" /></div>
                                    <div className="space-y-1.5"><Label className="text-sm">GST Number</Label><Input value={formData.gstNumber} readOnly className="h-9 bg-muted/50" /></div>
                                </div>
                            )}

                            {/* Row 3: Pricing Unit Row */}
                            <div className="grid grid-cols-[2fr,auto,1fr,1fr] gap-3 items-end">
                                <div className="space-y-1.5">
                                    <Label htmlFor="unitPrice" className="text-sm">Unit Price (₹) *</Label>
                                    <Input id="unitPrice" type="number" min="0" step="0.01" value={formData.unitPrice || ""} onChange={(e) => setFormData(p => ({ ...p, unitPrice: parseFloat(e.target.value) || 0 }))} required className="h-9" />
                                </div>
                                <div className="pb-2 text-muted-foreground font-medium">/</div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="perUnitBasis" className="text-sm">Per</Label>
                                    <Input id="perUnitBasis" type="number" min="1" step="0.01" value={formData.perUnitBasis || ""} onChange={(e) => setFormData(p => ({ ...p, perUnitBasis: parseFloat(e.target.value) || 1 }))} className="h-9" />
                                </div>
                                <div className="space-y-1.5 relative">
                                    <Label htmlFor="perUnitBasisUnit" className="text-sm">Unit</Label>
                                    <Input
                                        id="perUnitBasisUnit"
                                        value={formData.perUnitBasisUnit}
                                        onChange={(e) => { setFormData(p => ({ ...p, perUnitBasisUnit: e.target.value })); setShowPerUnitSuggestions(true); }}
                                        onFocus={() => setShowPerUnitSuggestions(true)}
                                        className="h-9"
                                    />
                                    {showPerUnitSuggestions && COMMON_UNITS.length > 0 && (
                                        <div className="absolute z-[100] w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
                                            {COMMON_UNITS.filter(u => u.includes(formData.perUnitBasisUnit.toLowerCase())).map(u => (
                                                <button key={u} type="button" onClick={() => handlePerUnitSelect(u)} className="w-full px-3 py-2 text-left text-sm hover:bg-accent">
                                                    {u}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Row 4: Discount & Tax */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="discountPercent" className="text-sm">Discount (%)</Label>
                                    <Input id="discountPercent" type="number" min="0" max="100" step="0.1" value={formData.discountPercent} onChange={(e) => setFormData(p => ({ ...p, discountPercent: e.target.value }))} className="h-9" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="taxRate" className="text-sm">Tax Rate (%) *</Label>
                                    <Input id="taxRate" type="number" min="0" max="100" step="0.1" value={formData.taxRate} onChange={(e) => setFormData(p => ({ ...p, taxRate: e.target.value }))} className="h-9" />
                                </div>
                            </div>

                            {/* Row 5: Valid Till */}
                            <div className="space-y-1.5">
                                <Label htmlFor="validTill" className="text-sm">Valid Till (PO Expiry) *</Label>
                                <Input id="validTill" type="date" value={formData.validTill} onChange={(e) => setFormData(p => ({ ...p, validTill: e.target.value }))} required className="h-9" min={new Date().toISOString().split("T")[0]} />
                            </div>

                            {/* Total */}
                            {formData.quantity > 0 && formData.unitPrice > 0 && (
                                <div className="bg-muted/50 rounded-lg p-4 flex justify-between items-center">
                                    <span className="font-semibold">Total Amount:</span>
                                    <span className="text-lg font-bold text-primary">₹{calculateTotal().toFixed(2)}</span>
                                </div>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="notes" className="text-sm">Internal Notes</Label>
                            <Textarea id="notes" placeholder="Internal notes..." value={formData.notes} onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))} className="resize-none" rows={2} />
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isLoading}>Cancel</Button>
                            <Button type="submit" disabled={isLoading}>{isLoading ? "Generate..." : "Generate Direct PO"}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            <VendorFormDialog open={showVendorDialog} onOpenChange={setShowVendorDialog} />
            <SiteFormDialog open={showSiteDialog} onOpenChange={setShowSiteDialog} />

            <ItemInfoDialog open={!!infoItemName} onOpenChange={(open) => !open && setInfoItemName(null)} itemName={infoItemName} />
            <SiteInfoDialog open={!!infoSiteId} onOpenChange={(open) => !open && setInfoSiteId(null)} siteId={infoSiteId} />
        </>
    );
}
