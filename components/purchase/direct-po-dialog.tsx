"use client";

/**
 * Direct PO Dialog Component
 * 
 * Creates a Purchase Order instantly, bypassing the Manager approval workflow.
 * Use for emergency procurements.
 */

import { useState, useEffect, useMemo, useRef } from "react";
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
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { AlertCircle, Plus, Search, X, Info, ChevronDown, ChevronUp, Copy } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import { AddressAutocomplete } from "@/components/vendors/address-autocomplete";
import { VendorFormDialog } from "@/components/vendors/vendor-form-dialog";
import { VendorInfoDialog } from "@/components/purchase/vendor-info-dialog";
import { ItemInfoDialog } from "@/components/requests/item-info-dialog";
import { LocationInfoDialog } from "@/components/locations/location-info-dialog";
import { LocationFormDialog } from "@/components/locations/location-form-dialog";
import { cn } from "@/lib/utils";

export interface DirectPOInitialData {
    requestNumber?: string;
    vendorId?: Id<"vendors">;
    deliverySiteId?: Id<"sites">;
    deliverySiteName?: string;
    items?: {
        requestId?: Id<"requests">;
        itemDescription: string;
        description?: string;
        quantity: number;
        unit: string;
        unitPrice: number;
        hsnCode?: string;
    }[];
}

interface DirectPODialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialData?: DirectPOInitialData | null;
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

export function DirectPODialog({ open, onOpenChange, initialData }: DirectPODialogProps) {
    const createDirectPO = useMutation(api.purchaseOrders.createDirectPO);
    const inventoryItems = useQuery(api.inventory.getAllInventoryItems);
    const vendors = useQuery(api.vendors.getAllVendors);
    const sites = useQuery(api.sites.getAllSites, {});

    const [isLoading, setIsLoading] = useState(false);
    const [showVendorDialog, setShowVendorDialog] = useState(false);
    const [showLocationDialog, setShowLocationDialog] = useState(false);
    const [vendorSearchQuery, setVendorSearchQuery] = useState("");
    const [itemSearchQuery, setItemSearchQuery] = useState("");
    const [siteSearchQuery, setSiteSearchQuery] = useState("");

    const [showItemSuggestions, setShowItemSuggestions] = useState(false);
    const [showVendorSuggestions, setShowVendorSuggestions] = useState(false);
    const [showSiteSuggestions, setShowSiteSuggestions] = useState(false);
    const [showUnitSuggestions, setShowUnitSuggestions] = useState(false);
    const [showPerUnitSuggestions, setShowPerUnitSuggestions] = useState(false);
    const [selectedVendorIndex, setSelectedVendorIndex] = useState(0);

    const [infoItemName, setInfoItemName] = useState<string | null>(null);
    const [infoSiteId, setInfoSiteId] = useState<Id<"sites"> | null>(null);
    const [infoVendorId, setInfoVendorId] = useState<Id<"vendors"> | null>(null);

    const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);
    const [selectedItemSuggestionIndex, setSelectedItemSuggestionIndex] = useState<number>(0);
    const [selectedSiteSuggestionIndex, setSelectedSiteSuggestionIndex] = useState<number>(0);

    const [commonData, setCommonData] = useState({
        requestNumber: "",
        vendorId: "" as Id<"vendors"> | "",
        vendorName: "",
        contactName: "",
        vendorEmail: "",
        vendorPhone: "",
        gstNumber: "",
        vendorAddress: "",
        deliverySite: "",
        validTill: "",
        notes: "",
    });

    const [items, setItems] = useState([
        {
            id: Date.now().toString(),
            requestId: undefined as Id<"requests"> | undefined,
            itemDescription: "",
            description: "",
            itemSearchQuery: "",
            hsnCode: "",
            quantity: 0,
            unit: "pcs",
            unitPrice: 0,
            perUnitBasis: 1,
            perUnitBasisUnit: "pcs",
            discountPercent: "0",
            sgst: "0",
            cgst: "0",
        }
    ]);

    // Refs for scrolling to items
    const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

    // Function to scroll to a specific item
    const scrollToItem = (index: number) => {
        itemRefs.current[index]?.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
        });
    };

    const filteredInventoryItems = useMemo(() => {
        if (activeItemIndex === null || !inventoryItems) return [];
        const query = items[activeItemIndex]?.itemSearchQuery || "";
        if (!query.trim()) return [];

        return inventoryItems
            .filter((item) => item.itemName.toLowerCase().includes(query.toLowerCase()))
            .slice(0, 5);
    }, [inventoryItems, items, activeItemIndex]);

    const filteredVendors = useMemo(() => {
        if (!vendors) return [];
        if (!vendorSearchQuery.trim()) return vendors.slice(0, 5);
        const query = vendorSearchQuery.toLowerCase();
        return vendors
            .filter((vendor) =>
                vendor.companyName.toLowerCase().includes(query)
            )
            .slice(0, 5);
    }, [vendors, vendorSearchQuery]);

    const filteredSites = useMemo(() => {
        if (!sites) return [];
        // If no query, return first 5 sites
        if (!siteSearchQuery.trim()) return sites.slice(0, 5);

        const query = siteSearchQuery.toLowerCase();
        return sites
            .filter((site) =>
                site.name.toLowerCase().includes(query)
            )
            .slice(0, 5);
    }, [sites, siteSearchQuery]);

    useEffect(() => {
        if (commonData.vendorId && vendors) {
            const selectedVendor = vendors.find((v) => v._id === commonData.vendorId);
            if (selectedVendor) {
                setCommonData((prev) => ({
                    ...prev,
                    vendorName: selectedVendor.companyName,
                    contactName: selectedVendor.contactName || selectedVendor.companyName,
                    vendorEmail: selectedVendor.email || "",
                    vendorPhone: selectedVendor.phone || "",
                    gstNumber: selectedVendor.gstNumber || "",
                    vendorAddress: selectedVendor.address || "",
                }));
                setVendorSearchQuery(selectedVendor.companyName);
            }
        }
    }, [commonData.vendorId, vendors]);

    const calculateItemTotal = (item: typeof items[0]) => {
        const basis = item.perUnitBasis || 1;
        const discount = parseFloat(item.discountPercent) || 0;
        const quantity = item.quantity;
        const rate = item.unitPrice;

        const baseAmount = (quantity / basis) * rate;
        const discountAmount = (baseAmount * discount) / 100;
        const taxable = baseAmount - discountAmount;
        const totalTaxRate = (parseFloat(item.sgst) || 0) + (parseFloat(item.cgst) || 0);
        const tax = (taxable * totalTaxRate) / 100;
        return taxable + tax;
    };

    const calculateGrandTotal = () => {
        return items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
    };

    useEffect(() => {
        if (open && initialData) {
            // Populate form with initial data
            setCommonData(prev => ({
                ...prev,
                requestNumber: initialData.requestNumber || "",
                vendorId: initialData.vendorId || "",
                deliverySite: initialData.deliverySiteId || "",
            }));

            if (initialData.deliverySiteName) {
                setSiteSearchQuery(initialData.deliverySiteName);
            }

            if (initialData.items && initialData.items.length > 0) {
                setItems(initialData.items.map((item) => {
                    // Try to find matching inventory item for details like HSN
                    const matchingInvItem = inventoryItems?.find(inv =>
                        inv.itemName.toLowerCase() === item.itemDescription.toLowerCase()
                    );

                    return {
                        id: Date.now().toString() + Math.random().toString(),
                        requestId: item.requestId,
                        itemDescription: item.itemDescription,
                        description: item.description || matchingInvItem?.description || "",
                        itemSearchQuery: item.itemDescription,
                        hsnCode: item.hsnCode || (matchingInvItem as any).hsnSacCode || "",
                        quantity: item.quantity,
                        unit: item.unit || matchingInvItem?.unit || "pcs",
                        unitPrice: item.unitPrice,
                        perUnitBasis: 1, // Default to 1
                        perUnitBasisUnit: item.unit || matchingInvItem?.unit || "pcs",
                        discountPercent: "0",
                        sgst: "0",
                        cgst: "0",
                    };
                }));
            }
        }
    }, [open, initialData, inventoryItems]);

    const handleReset = () => {
        // Only reset if we're not using initialData or if we want to fully clear
        // ensuring we don't accidentally clear just populated data
        // For now, standard reset
        setCommonData({
            requestNumber: "",
            vendorId: "",
            vendorName: "",
            contactName: "",
            vendorEmail: "",
            vendorPhone: "",
            gstNumber: "",
            vendorAddress: "",
            deliverySite: "",
            validTill: "",
            notes: "",
        });
        setItems([{
            id: Date.now().toString(),
            requestId: undefined,
            itemDescription: "",
            description: "",
            itemSearchQuery: "",
            hsnCode: "",
            quantity: 0,
            unit: "pcs",
            unitPrice: 0,
            perUnitBasis: 1,
            perUnitBasisUnit: "pcs",
            discountPercent: "0",
            sgst: "0",
            cgst: "0",
        }]);
        setVendorSearchQuery("");
        setItemSearchQuery("");
        setSiteSearchQuery("");
        setInfoItemName(null);
        setInfoSiteId(null);
        setActiveItemIndex(null);
    };

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            handleReset();
        }
        onOpenChange(newOpen);
    };

    const handleAddItem = () => {
        setItems(prev => [
            ...prev,
            {
                id: Date.now().toString(),
                requestId: undefined,
                itemDescription: "",
                description: "",
                itemSearchQuery: "",
                hsnCode: "",
                quantity: 0,
                unit: "pcs",
                unitPrice: 0,
                perUnitBasis: 1,
                perUnitBasisUnit: "pcs",
                discountPercent: "0",
                sgst: "0",
                cgst: "0",
            }
        ]);
    };

    const handleDuplicateItem = (index: number) => {
        const itemToDuplicate = items[index];
        setItems(prev => [
            ...prev,
            {
                ...itemToDuplicate,
                id: Date.now().toString(), // New unique ID
            }
        ]);
        // Scroll to the new duplicated item
        setTimeout(() => scrollToItem(items.length), 100);
    };

    const handleRemoveItem = (index: number) => {
        if (items.length === 1) return; // Prevent removing the last item
        setItems(prev => prev.filter((_, i) => i !== index));
    };

    const handleItemChange = (index: number, field: keyof typeof items[0], value: any) => {
        setItems(prev => {
            const newItems = [...prev];
            newItems[index] = { ...newItems[index], [field]: value };
            return newItems;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            if (!commonData.deliverySite) throw new Error("Delivery site is required");
            if (!commonData.vendorId) throw new Error("Vendor is required");
            if (!commonData.validTill) throw new Error("PO expiry date is required");

            // Validate and format all items
            const formattedItems = items.map(item => {
                if (!item.itemDescription.trim()) throw new Error("Item description is required for all items");
                if (item.quantity <= 0) throw new Error("Quantity must be greater than 0 for all items");
                if (item.unitPrice <= 0) throw new Error("Unit price must be greater than 0 for all items");

                const fullDescription = item.description
                    ? `${item.itemDescription}\n${item.description}`
                    : item.itemDescription;

                return {
                    requestId: item.requestId,
                    itemDescription: fullDescription,
                    hsnSacCode: item.hsnCode || undefined,
                    quantity: item.quantity,
                    unit: item.unit,
                    unitRate: item.unitPrice,
                    gstTaxRate: (parseFloat(item.sgst) || 0) + (parseFloat(item.cgst) || 0),
                    discountPercent: parseFloat(item.discountPercent) || 0,
                    perUnitBasis: item.perUnitBasis || 1,
                    perUnitBasisUnit: item.perUnitBasisUnit || item.unit,
                };
            });

            await createDirectPO({
                existingRequestNumber: commonData.requestNumber || undefined,
                deliverySiteId: commonData.deliverySite as Id<"sites">,
                vendorId: commonData.vendorId as Id<"vendors">,
                validTill: new Date(commonData.validTill).getTime(),
                notes: commonData.notes || undefined,
                items: formattedItems,
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



    return (
        <>
            <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogContent
                    className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto"
                    onOpenAutoFocus={(e) => e.preventDefault()}
                >
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-orange-500" />
                            Create Direct PO
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-6 py-2">
                        {/* 1. Vendor Details Section */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-foreground border-b pb-2">Vendor Details</h3>

                            {/* Row 1: Vendor Name */}
                            <div className="space-y-1.5 relative">
                                <Label htmlFor="vendorName" className="text-sm">Vendor Name *</Label>
                                <div className="relative flex gap-2">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="vendorName"
                                            placeholder="Start typing vendor name..."
                                            value={vendorSearchQuery}
                                            onChange={(e) => {
                                                setVendorSearchQuery(e.target.value);
                                                setShowVendorSuggestions(true);
                                                setSelectedVendorIndex(0);
                                                if (commonData.vendorId) setCommonData(p => ({ ...p, vendorId: "", vendorEmail: "", vendorPhone: "", gstNumber: "", vendorAddress: "" }));
                                            }}
                                            onKeyDown={(e) => {
                                                if (!showVendorSuggestions || filteredVendors.length === 0) return;
                                                if (e.key === "ArrowDown") {
                                                    e.preventDefault();
                                                    setSelectedVendorIndex(prev => (prev + 1) % filteredVendors.length);
                                                } else if (e.key === "ArrowUp") {
                                                    e.preventDefault();
                                                    setSelectedVendorIndex(prev => (prev - 1 + filteredVendors.length) % filteredVendors.length);
                                                } else if (e.key === "Enter") {
                                                    e.preventDefault();
                                                    if (filteredVendors[selectedVendorIndex]) {
                                                        const vendor = filteredVendors[selectedVendorIndex];
                                                        setCommonData(p => ({ ...p, vendorId: vendor._id }));
                                                        setShowVendorSuggestions(false);
                                                    }
                                                }
                                            }}
                                            onFocus={() => setShowVendorSuggestions(true)}
                                            onClick={() => setShowVendorSuggestions(true)}
                                            onBlur={() => setTimeout(() => setShowVendorSuggestions(false), 200)}
                                            className="h-9 pl-9 pr-16"
                                        />
                                        {vendorSearchQuery && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setVendorSearchQuery("");
                                                    setCommonData(p => ({ ...p, vendorId: "", vendorEmail: "", vendorPhone: "", gstNumber: "", vendorAddress: "" }));
                                                }}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        )}
                                        {showVendorSuggestions && (filteredVendors.length > 0 || vendorSearchQuery.trim().length > 0) && (
                                            <div className="absolute z-[100] w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-y-auto flex flex-col">
                                                {filteredVendors.length > 0 ? (
                                                    filteredVendors.map((vendor, index) => (
                                                        <div
                                                            key={vendor._id}
                                                            className={cn("w-full px-3 py-2 flex items-center justify-between hover:bg-accent transition-colors cursor-pointer", index === selectedVendorIndex && "bg-accent")}
                                                            onClick={() => { setCommonData(p => ({ ...p, vendorId: vendor._id })); setShowVendorSuggestions(false); }}
                                                        >
                                                            <div className="flex-1 overflow-hidden">
                                                                <div className="font-medium truncate">{vendor.companyName}</div>
                                                                <div className="text-xs text-muted-foreground truncate">{vendor.email}</div>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                className="p-1 hover:bg-background rounded-full ml-2 text-muted-foreground hover:text-foreground"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setInfoVendorId(vendor._id);
                                                                }}
                                                                title="View Details"
                                                            >
                                                                <Info className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="p-4 text-center text-sm text-muted-foreground">
                                                        No vendors found.
                                                    </div>
                                                )}

                                                <div className="p-1 border-t mt-auto sticky bottom-0 bg-popover">
                                                    <Button
                                                        variant="ghost"
                                                        className="w-full justify-start h-8 text-xs font-medium text-primary"
                                                        onClick={() => { setShowVendorDialog(true); setShowVendorSuggestions(false); }}
                                                    >
                                                        <Plus className="h-3.5 w-3.5 mr-2" />
                                                        Create New Vendor {vendorSearchQuery ? `"${vendorSearchQuery}"` : ""}
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <Button type="button" variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => setShowVendorDialog(true)}>
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            {/* Row 2: Contact Info Grid (Email, Phone, Address, GST) */}
                            {commonData.vendorId && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-sm">Contact Person</Label>
                                        <Input
                                            value={commonData.contactName}
                                            onChange={(e) => setCommonData(p => ({ ...p, contactName: e.target.value }))}
                                            className="h-9"
                                            placeholder="Contact Person Name"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-sm">Vendor Email</Label>
                                        <Input
                                            value={commonData.vendorEmail}
                                            onChange={(e) => setCommonData(p => ({ ...p, vendorEmail: e.target.value }))}
                                            className="h-9"
                                            placeholder="vendor@email.com"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-sm">Vendor Phone</Label>
                                        <Input
                                            value={commonData.vendorPhone}
                                            onChange={(e) => setCommonData(p => ({ ...p, vendorPhone: e.target.value }))}
                                            className="h-9"
                                            placeholder="+91..."
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-sm">GST Number</Label>
                                        <Input
                                            value={commonData.gstNumber}
                                            onChange={(e) => setCommonData(p => ({ ...p, gstNumber: e.target.value }))}
                                            className="h-9"
                                            placeholder="GST Number"
                                        />
                                    </div>
                                    <div className="col-span-1 sm:col-span-2 space-y-1.5">
                                        <AddressAutocomplete
                                            id="vendorAddress"
                                            label="Vendor Address"
                                            value={commonData.vendorAddress}
                                            onChange={(address) => setCommonData(p => ({ ...p, vendorAddress: address }))}
                                            placeholder="Search vendor address..."
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 2. General Info Section */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-foreground border-b pb-2">General Info</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5 relative">
                                    <Label htmlFor="deliverySite" className="text-sm">Delivery Location *</Label>
                                    <div className="relative">
                                        <Input
                                            id="deliverySite"
                                            placeholder="Search location..."
                                            value={siteSearchQuery}
                                            onChange={(e) => {
                                                setSiteSearchQuery(e.target.value);
                                                setShowSiteSuggestions(true);
                                                setSelectedSiteSuggestionIndex(0);
                                            }}
                                            onFocus={() => { setShowSiteSuggestions(true); setSelectedSiteSuggestionIndex(0); }}
                                            onClick={() => setShowSiteSuggestions(true)}
                                            onBlur={() => setTimeout(() => setShowSiteSuggestions(false), 200)}
                                            onKeyDown={(e) => {
                                                if (!showSiteSuggestions) return;

                                                if (e.key === 'ArrowDown') {
                                                    e.preventDefault();
                                                    setSelectedSiteSuggestionIndex(prev =>
                                                        prev < filteredSites.length ? prev + 1 : prev
                                                    );
                                                } else if (e.key === 'ArrowUp') {
                                                    e.preventDefault();
                                                    setSelectedSiteSuggestionIndex(prev => prev > 0 ? prev - 1 : 0);
                                                } else if (e.key === 'Enter' && filteredSites.length > 0) {
                                                    e.preventDefault();
                                                    if (selectedSiteSuggestionIndex < filteredSites.length) {
                                                        const selectedSite = filteredSites[selectedSiteSuggestionIndex];
                                                        setCommonData(p => ({ ...p, deliverySite: selectedSite._id }));
                                                        setSiteSearchQuery(selectedSite.name);
                                                        setShowSiteSuggestions(false);
                                                    } else {
                                                        // "Add New Location" option selected
                                                        setShowLocationDialog(true);
                                                        setShowSiteSuggestions(false);
                                                    }
                                                } else if (e.key === 'Escape') {
                                                    setShowSiteSuggestions(false);
                                                }
                                            }}
                                            className="h-9 pr-9"
                                        />
                                        {commonData.deliverySite ? (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setCommonData(p => ({ ...p, deliverySite: "" }));
                                                    setSiteSearchQuery("");
                                                }}
                                                className="absolute right-0 top-0 h-9 w-9 p-0 hover:bg-transparent"
                                            >
                                                <X className="h-3 w-3 text-muted-foreground" />
                                            </Button>
                                        ) : (
                                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                        )}
                                        {showSiteSuggestions && (filteredSites.length > 0 || siteSearchQuery) && (
                                            <div className="absolute z-[100] w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto flex flex-col">
                                                {filteredSites.length > 0 ? (
                                                    filteredSites.map((site, siteIdx) => (
                                                        <div
                                                            key={site._id}
                                                            className={cn(
                                                                "w-full px-3 py-2 flex items-center justify-between hover:bg-accent transition-colors cursor-pointer",
                                                                siteIdx === selectedSiteSuggestionIndex && "bg-accent"
                                                            )}
                                                            onClick={() => {
                                                                setCommonData(p => ({ ...p, deliverySite: site._id }));
                                                                setSiteSearchQuery(site.name);
                                                                setShowSiteSuggestions(false);
                                                            }}
                                                        >
                                                            <div className="flex-1 overflow-hidden">
                                                                <div className="font-medium truncate">{site.name}</div>
                                                                {site.address && (
                                                                    <div className="text-xs text-muted-foreground truncate">{site.address}</div>
                                                                )}
                                                            </div>
                                                            <button
                                                                type="button"
                                                                className="p-1 hover:bg-background rounded-full ml-2 text-muted-foreground hover:text-foreground"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setInfoSiteId(site._id);
                                                                }}
                                                                title="View Details"
                                                            >
                                                                <Info className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="p-3 text-center text-sm text-muted-foreground">
                                                        No locations found
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="validTill" className="text-sm">PO Expiry Date *</Label>
                                    <Input id="validTill" type="date" value={commonData.validTill} onChange={(e) => setCommonData(p => ({ ...p, validTill: e.target.value }))} required className="h-9" min={new Date().toISOString().split("T")[0]} />
                                </div>
                            </div>
                        </div>


                        {/* 3. Items Section */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between border-b pb-2">
                                <h3 className="text-sm font-semibold text-foreground">Order Items</h3>
                                {items.length > 1 && (
                                    <div className="flex items-center gap-1">
                                        <span className="text-xs text-muted-foreground mr-2">{items.length} items</span>
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="icon"
                                                        className="h-7 w-7"
                                                        onClick={() => scrollToItem(0)}
                                                    >
                                                        <ChevronUp className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Scroll to first item</TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="icon"
                                                        className="h-7 w-7"
                                                        onClick={() => scrollToItem(items.length - 1)}
                                                    >
                                                        <ChevronDown className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Scroll to last item</TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                )}
                            </div>

                            {items.map((item, index) => (
                                <div
                                    key={item.id}
                                    ref={(el) => { itemRefs.current[index] = el; }}
                                    className="relative p-4 border rounded-lg bg-card shadow-sm space-y-4"
                                >
                                    {/* Item Header */}
                                    <div className="flex items-center justify-between pb-3 border-b">
                                        <div className="flex items-center gap-2">
                                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                <span className="text-sm font-bold text-primary">{index + 1}</span>
                                            </div>
                                            <h4 className="font-semibold text-base">Item {index + 1}</h4>
                                        </div>
                                        {items.length > 1 && (
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 px-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                onClick={() => handleRemoveItem(index)}
                                                title="Remove Item"
                                            >
                                                <X className="h-4 w-4 mr-1" />
                                                <span className="text-xs">Remove</span>
                                            </Button>
                                        )}
                                    </div>

                                    {/* Row 1: Item Name */}
                                    <div className="space-y-1.5 relative">
                                        <Label className="text-sm">Item Name *</Label>
                                        <div className="relative">
                                            <Input
                                                placeholder="Item Name (e.g. Cement)"
                                                value={item.itemSearchQuery || item.itemDescription}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    handleItemChange(index, 'itemSearchQuery', val);
                                                    handleItemChange(index, 'itemDescription', val);
                                                    setActiveItemIndex(index);
                                                    setShowItemSuggestions(true);
                                                    setSelectedItemSuggestionIndex(0);
                                                }}
                                                onFocus={() => { setActiveItemIndex(index); setShowItemSuggestions(true); setSelectedItemSuggestionIndex(0); }}
                                                onBlur={() => setTimeout(() => setShowItemSuggestions(false), 200)}
                                                onKeyDown={(e) => {
                                                    if (!showItemSuggestions || activeItemIndex !== index) return;

                                                    if (e.key === 'ArrowDown') {
                                                        e.preventDefault();
                                                        setSelectedItemSuggestionIndex(prev =>
                                                            prev < filteredInventoryItems.length ? prev + 1 : prev
                                                        );
                                                    } else if (e.key === 'ArrowUp') {
                                                        e.preventDefault();
                                                        setSelectedItemSuggestionIndex(prev => prev > 0 ? prev - 1 : 0);
                                                    } else if (e.key === 'Enter' && filteredInventoryItems.length > 0) {
                                                        e.preventDefault();
                                                        if (selectedItemSuggestionIndex < filteredInventoryItems.length) {
                                                            const selectedItem = filteredInventoryItems[selectedItemSuggestionIndex];
                                                            handleItemChange(index, 'itemDescription', selectedItem.itemName);
                                                            handleItemChange(index, 'description', selectedItem.description || "");
                                                            handleItemChange(index, 'itemSearchQuery', selectedItem.itemName);
                                                            handleItemChange(index, 'unit', selectedItem.unit || item.unit);
                                                            handleItemChange(index, 'perUnitBasisUnit', selectedItem.unit || item.unit);
                                                            handleItemChange(index, 'hsnCode', (selectedItem as any).hsnSacCode || "");
                                                            setActiveItemIndex(null);
                                                            setShowItemSuggestions(false);
                                                        } else {
                                                            // "Use as New Item" option selected
                                                            setShowItemSuggestions(false);
                                                            setActiveItemIndex(null);
                                                        }
                                                    } else if (e.key === 'Escape') {
                                                        setShowItemSuggestions(false);
                                                    }
                                                }}
                                                className="h-9 pr-8"
                                            />
                                            {(item.itemSearchQuery || item.itemDescription) && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        handleItemChange(index, 'itemSearchQuery', '');
                                                        handleItemChange(index, 'itemDescription', '');
                                                        handleItemChange(index, 'description', '');
                                                        handleItemChange(index, 'hsnCode', '');
                                                        setShowItemSuggestions(false);
                                                    }}
                                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                                    title="Clear item"
                                                >
                                                    <X className="h-4 w-4" />
                                                </button>
                                            )}
                                            {activeItemIndex === index && showItemSuggestions && (item.itemSearchQuery?.trim() || item.itemDescription?.trim()) && (
                                                <div className="absolute z-[100] w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto flex flex-col">
                                                    {filteredInventoryItems.length > 0 ? (
                                                        filteredInventoryItems.map((invItem, suggestionIdx) => (
                                                            <div
                                                                key={invItem._id}
                                                                onClick={() => {
                                                                    handleItemChange(index, 'itemDescription', invItem.itemName);
                                                                    handleItemChange(index, 'description', invItem.description || "");
                                                                    handleItemChange(index, 'itemSearchQuery', invItem.itemName);
                                                                    handleItemChange(index, 'unit', invItem.unit || item.unit);
                                                                    handleItemChange(index, 'perUnitBasisUnit', invItem.unit || item.unit);
                                                                    handleItemChange(index, 'hsnCode', (invItem as any).hsnSacCode || "");
                                                                    setActiveItemIndex(null);
                                                                    setShowItemSuggestions(false);
                                                                }}
                                                                className={cn(
                                                                    "w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center justify-between cursor-pointer",
                                                                    selectedItemSuggestionIndex === suggestionIdx && "bg-accent"
                                                                )}
                                                            >
                                                                <span>{invItem.itemName}</span>
                                                                <div className="flex items-center gap-2">
                                                                    {invItem.unit && <span className="text-xs text-muted-foreground">{invItem.unit}</span>}
                                                                    <button
                                                                        type="button"
                                                                        className="p-1 hover:bg-background rounded-full text-muted-foreground hover:text-foreground"
                                                                        onClick={(e) => { e.stopPropagation(); setInfoItemName(invItem.itemName); }}
                                                                        title="View Details"
                                                                    >
                                                                        <Info className="h-3.5 w-3.5" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="p-3 text-center text-sm text-muted-foreground">
                                                            No items found in inventory
                                                        </div>
                                                    )}

                                                    <div className="p-1 border-t mt-auto sticky bottom-0 bg-popover">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            className={cn(
                                                                "w-full justify-start h-8 text-xs font-medium text-primary",
                                                                selectedItemSuggestionIndex === filteredInventoryItems.length && "bg-accent"
                                                            )}
                                                            onClick={() => {
                                                                // Keep the current input as the item name
                                                                setShowItemSuggestions(false);
                                                                setActiveItemIndex(null);
                                                            }}
                                                        >
                                                            <Plus className="h-3.5 w-3.5 mr-2" />
                                                            Use "{item.itemSearchQuery || item.itemDescription}" as New Item
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Row 1.5: Description */}
                                    <div className="space-y-1.5">
                                        <Label className="text-sm">Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
                                        <Textarea
                                            placeholder="Additional details, specs, etc."
                                            value={item.description || ""}
                                            onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                            className="min-h-[60px]"
                                        />
                                    </div>

                                    {/* Row 2: Qty, Unit, Price, HSN */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-sm">Quantity *</Label>
                                            <Input type="number" min="0" step="0.01" value={item.quantity || ""} onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)} className="h-9" />
                                        </div>
                                        <div className="space-y-1.5 relative">
                                            <Label className="text-sm">Unit</Label>
                                            <div className="relative">
                                                <Input
                                                    value={item.unit}
                                                    onChange={(e) => {
                                                        handleItemChange(index, 'unit', e.target.value);
                                                        handleItemChange(index, 'perUnitBasisUnit', e.target.value);
                                                        setActiveItemIndex(index);
                                                        setShowUnitSuggestions(true);
                                                    }}
                                                    onFocus={() => { setActiveItemIndex(index); setShowUnitSuggestions(true); }}
                                                    onBlur={() => setTimeout(() => setShowUnitSuggestions(false), 200)}
                                                    className="h-9"
                                                />
                                                {activeItemIndex === index && showUnitSuggestions && (
                                                    (() => {
                                                        const filteredUnits = COMMON_UNITS.filter(u => u.toLowerCase().includes(item.unit.toLowerCase()));
                                                        if (filteredUnits.length === 0) return null;
                                                        return (
                                                            <div className="absolute z-[100] w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
                                                                {filteredUnits.map(u => (
                                                                    <button
                                                                        key={u}
                                                                        type="button"
                                                                        onClick={() => {
                                                                            handleItemChange(index, 'unit', u);
                                                                            handleItemChange(index, 'perUnitBasisUnit', u);
                                                                            setShowUnitSuggestions(false);
                                                                        }}
                                                                        className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                                                                    >
                                                                        {u}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        );
                                                    })()
                                                )}
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-sm">Price (₹) *</Label>
                                            <Input type="number" min="0" step="0.01" value={item.unitPrice || ""} onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)} className="h-9" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-sm">HSN Code</Label>
                                            <Input value={item.hsnCode} onChange={(e) => handleItemChange(index, 'hsnCode', e.target.value)} className="h-9" />
                                        </div>
                                    </div>

                                    {/* Row 3: Taxes */}
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-sm">Discount (%)</Label>
                                            <Input type="number" min="0" max="100" step="0.1" value={item.discountPercent} onChange={(e) => handleItemChange(index, 'discountPercent', e.target.value)} className="h-9" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-sm">SGST (%)</Label>
                                            <Input type="number" min="0" max="100" step="0.1" value={item.sgst} onChange={(e) => handleItemChange(index, 'sgst', e.target.value)} className="h-9" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-sm">CGST (%)</Label>
                                            <Input type="number" min="0" max="100" step="0.1" value={item.cgst} onChange={(e) => handleItemChange(index, 'cgst', e.target.value)} className="h-9" />
                                        </div>
                                    </div>

                                    {/* Item Total */}
                                    <div className="text-right text-xs text-muted-foreground pt-1">
                                        Item Total: <span className="font-bold text-primary">₹{calculateItemTotal(item).toFixed(2)}</span>
                                    </div>
                                </div>
                            ))}

                            <Button type="button" variant="outline" className="w-full border-dashed" onClick={handleAddItem}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add Another Item
                            </Button>

                            <div className="flex justify-end pt-2">
                                <div className="bg-muted/50 p-3 rounded-lg flex gap-4 items-center">
                                    <span className="text-sm font-semibold">Grand Total:</span>
                                    <span className="text-xl font-bold text-primary">₹{calculateGrandTotal().toFixed(2)}</span>
                                </div>
                            </div>
                            {/* Internal Notes */}
                            <div className="space-y-1.5 pt-2">
                                <Label htmlFor="notes" className="text-sm">Internal Notes</Label>
                                <Textarea id="notes" placeholder="Internal notes..." value={commonData.notes} onChange={(e) => setCommonData(p => ({ ...p, notes: e.target.value }))} className="resize-none" rows={2} />
                            </div>
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isLoading}>Cancel</Button>
                            <Button type="submit" disabled={isLoading}>{isLoading ? "Generate..." : "Generate Direct PO"}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog >

            <VendorFormDialog
                open={showVendorDialog}
                onOpenChange={setShowVendorDialog}
                initialData={!commonData.vendorId ? { companyName: vendorSearchQuery, email: "", phone: "", gstNumber: "", address: "" } : undefined}
            />
            <LocationFormDialog
                open={showLocationDialog}
                onOpenChange={setShowLocationDialog}
                initialData={!commonData.deliverySite ? { name: siteSearchQuery } : undefined}
            />

            <ItemInfoDialog
                open={!!infoItemName}
                onOpenChange={(open) => {
                    if (!open) setInfoItemName(null);
                }}
                itemName={infoItemName}
            />

            <LocationInfoDialog
                open={!!infoSiteId}
                onOpenChange={(open) => {
                    if (!open) setInfoSiteId(null);
                }}
                locationId={infoSiteId}
            />

            <VendorInfoDialog
                open={!!infoVendorId}
                onOpenChange={(open) => {
                    if (!open) setInfoVendorId(null);
                }}
                vendorId={infoVendorId}
            />
        </>
    );

}
