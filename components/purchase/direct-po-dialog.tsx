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
import { Card } from "@/components/ui/card";
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
import { AlertCircle, Plus, Search, X, Info, ChevronDown, ChevronUp, Copy, Camera, Upload, ImageIcon, MapPin, Building2, FileText, Package } from "lucide-react";
import { CameraDialog } from "@/components/inventory/camera-dialog";
import type { Id } from "@/convex/_generated/dataModel";
import { AddressAutocomplete } from "@/components/vendors/address-autocomplete";
import { VendorFormDialog } from "@/components/vendors/vendor-form-dialog";
import { VendorInfoDialog } from "@/components/purchase/vendor-info-dialog";
import { ItemInfoDialog } from "@/components/requests/item-info-dialog";
import { LocationInfoDialog } from "@/components/locations/location-info-dialog";
import { LocationFormDialog } from "@/components/locations/location-form-dialog";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

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
        originalQuantity?: number; // Add originalQuantity
        unit: string;
        unitPrice: number;
        discountPercent?: number; // Add discountPercent
        sgst?: number;            // Add SGST
        cgst?: number;            // Add CGST
        hsnCode?: string;
        imageUrl?: string;
    }[];
    vendorDetails?: {
        name: string;
        email?: string;
        phone?: string;
        contactName?: string;
        gstNumber?: string;
        address?: string;
    };
    notes?: string;
    validTill?: string;
}

interface DirectPODialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialData?: DirectPOInitialData | null;
    mode?: "standard" | "direct";
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

export function DirectPODialog({ open, onOpenChange, initialData, mode = "standard" }: DirectPODialogProps) {
    const createDirectPO = useMutation(api.purchaseOrders.createDirectPO);
    const inventoryItems = useQuery(api.inventory.getAllInventoryItems);
    const vendors = useQuery(api.vendors.getAllVendors);
    const sites = useQuery(api.sites.getAllSites, {});
    const projects = useQuery(api.projects.getAllProjects, {});

    const [isLoading, setIsLoading] = useState(false);
    const [showVendorDialog, setShowVendorDialog] = useState(false);
    const [showLocationDialog, setShowLocationDialog] = useState(false);
    const [vendorSearchQuery, setVendorSearchQuery] = useState("");
    const [itemSearchQuery, setItemSearchQuery] = useState("");
    const [siteSearchQuery, setSiteSearchQuery] = useState("");
    const [projectSearchQuery, setProjectSearchQuery] = useState("");

    const [showItemSuggestions, setShowItemSuggestions] = useState(false);
    const [showVendorSuggestions, setShowVendorSuggestions] = useState(false);
    const [showSiteSuggestions, setShowSiteSuggestions] = useState(false);
    const [showProjectSuggestions, setShowProjectSuggestions] = useState(false);
    const [projectDropdownOpenIndex, setProjectDropdownOpenIndex] = useState<number | null>(null);
    const [projectDropdownSearch, setProjectDropdownSearch] = useState("");
    const [showUnitSuggestions, setShowUnitSuggestions] = useState(false);
    const [showPerUnitSuggestions, setShowPerUnitSuggestions] = useState(false);
    const [selectedVendorIndex, setSelectedVendorIndex] = useState(0);
    const [selectedProjectIndex, setSelectedProjectIndex] = useState(0);

    const [infoItemName, setInfoItemName] = useState<string | null>(null);
    const [infoSiteId, setInfoSiteId] = useState<Id<"sites"> | null>(null);
    const [infoVendorId, setInfoVendorId] = useState<Id<"vendors"> | null>(null);

    const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);
    const [selectedItemSuggestionIndex, setSelectedItemSuggestionIndex] = useState<number>(0);
    // Inventory picker state (for "Select from Inventory" button)
    const [inventoryPickerIndex, setInventoryPickerIndex] = useState<number | null>(null);
    const [inventoryPickerSearch, setInventoryPickerSearch] = useState("");
    // Photo-only inventory picker state
    const [photoPickerIndex, setPhotoPickerIndex] = useState<number | null>(null);
    const [photoPickerSearch, setPhotoPickerSearch] = useState("");
    const [selectedSiteSuggestionIndex, setSelectedSiteSuggestionIndex] = useState<number>(0);
    const [roundOff, setRoundOff] = useState(false);

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
        projectId: "" as Id<"projects"> | "",
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
            originalQuantity: 0,
            unit: "pcs",
            unitPrice: 0,
            perUnitBasis: 1,
            perUnitBasisUnit: "pcs",
            discountPercent: "0",
            sgst: "0",
            cgst: "0",
            // Photo fields
            photoFile: null as File | null,
            photoPreview: null as string | null,
            projectId: "" as string,
            inventoryImageUrl: null as string | null, // from inventory item
        }
    ]);

    // Camera state (shared, per active item index)
    const [cameraOpenForItem, setCameraOpenForItem] = useState<number | null>(null);
    const itemPhotoInputRefs = useRef<(HTMLInputElement | null)[]>([]);

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

    const filteredProjects = useMemo(() => {
        if (!projects) return [];
        if (!projectSearchQuery.trim()) return projects.slice(0, 5);
        const query = projectSearchQuery.toLowerCase();
        return projects
            .filter((project) =>
                project.name.toLowerCase().includes(query)
            )
            .slice(0, 5);
    }, [projects, projectSearchQuery]);

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
                // Only set search query if not already set (e.g. by initialData)
                setVendorSearchQuery(prev => prev || selectedVendor.companyName);
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
        const total = items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
        return roundOff ? Math.round(total) : total;
    };

    useEffect(() => {
        if (open && initialData) {
            // Populate form with initial data
            setCommonData(prev => {
                const newData = {
                    ...prev,
                    requestNumber: initialData.requestNumber || "",
                    vendorId: (initialData.vendorId || "") as Id<"vendors"> | "",
                    deliverySite: initialData.deliverySiteId || "",
                    notes: initialData.notes || "",
                    validTill: initialData.validTill || "",
                };

                // Pre-fill vendor details if provided (avoids waiting for vendors query)
                if (initialData.vendorDetails) {
                    newData.vendorName = initialData.vendorDetails?.name || prev.vendorName;
                    newData.vendorEmail = initialData.vendorDetails?.email || prev.vendorEmail;
                    newData.vendorPhone = initialData.vendorDetails?.phone || prev.vendorPhone;
                    newData.contactName = initialData.vendorDetails?.contactName || prev.contactName;
                    newData.gstNumber = initialData.vendorDetails?.gstNumber || prev.gstNumber;
                    newData.vendorAddress = initialData.vendorDetails?.address || prev.vendorAddress;
                    newData.notes = initialData.notes || prev.notes;
                }

                return newData;
            });

            if (initialData.vendorDetails) {
                setVendorSearchQuery(initialData.vendorDetails.name);
            }

            if (initialData.deliverySiteName) {
                setSiteSearchQuery(initialData.deliverySiteName);
            }

            if (initialData.items && initialData.items.length > 0) {
                setItems(initialData.items.map((item) => {
                    // Smart Split: If itemDescription has newlines, split it to Title and Description
                    // This handles cases where data was previously saved as concatenated string
                    const lines = (item.itemDescription || "").split('\n');
                    const cleanName = lines[0] || "";
                    const cleanDescFromName = lines.length > 1 ? lines.slice(1).join('\n') : "";

                    // Try to find matching inventory item for details like HSN
                    const matchingInvItem = inventoryItems?.find(inv =>
                        inv.itemName.toLowerCase() === cleanName.toLowerCase()
                    );

                    return {
                        id: Date.now().toString() + Math.random().toString(),
                        requestId: item.requestId,
                        itemDescription: cleanName, // Only the first line
                        description: cleanDescFromName || item.description || matchingInvItem?.description || "",
                        itemSearchQuery: cleanName,
                        hsnCode: item.hsnCode || (matchingInvItem as any)?.hsnSacCode || "",
                        quantity: item.quantity,
                        originalQuantity: item.originalQuantity || item.quantity,
                        unit: item.unit || matchingInvItem?.unit || "pcs",
                        unitPrice: item.unitPrice,
                        perUnitBasis: 1, // Default to 1
                        perUnitBasisUnit: item.unit || matchingInvItem?.unit || "pcs",
                        discountPercent: item.discountPercent?.toString() || "0", // Auto-fill discount
                        sgst: item.sgst?.toString() || "0",                       // Auto-fill SGST
                        cgst: item.cgst?.toString() || "0",                       // Auto-fill CGST
                        photoFile: null,
                        photoPreview: null,
                        projectId: (item as any).projectId || "",
                        inventoryImageUrl: item.imageUrl || (matchingInvItem as any)?.images?.[0]?.imageUrl || null,
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
            projectId: "",
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
            originalQuantity: 0,
            unit: "pcs",
            unitPrice: 0,
            perUnitBasis: 1,
            perUnitBasisUnit: "pcs",
            discountPercent: "0",
            sgst: "0",
            cgst: "0",
            photoFile: null,
            photoPreview: null,
            projectId: "",
            inventoryImageUrl: null,
        }]);
        setVendorSearchQuery("");
        setItemSearchQuery("");
        setSiteSearchQuery("");
        setInfoItemName(null);
        setInfoSiteId(null);
        setActiveItemIndex(null);
        setProjectDropdownOpenIndex(null);
        setProjectDropdownSearch("");
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
                originalQuantity: 0,
                unit: "pcs",
                unitPrice: 0,
                perUnitBasis: 1,
                perUnitBasisUnit: "pcs",
                discountPercent: "0",
                sgst: "0",
                cgst: "0",
                photoFile: null,
                photoPreview: null,
                projectId: "",
                inventoryImageUrl: null,
            }
        ]);
    };

    const handleItemPhotoSelect = (index: number, file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const result = e.target?.result as string;
            if (result) {
                setItems(prev => {
                    const next = [...prev];
                    next[index] = { ...next[index], photoFile: file, photoPreview: result };
                    return next;
                });
            }
        };
        reader.readAsDataURL(file);
    };

    const handleItemCameraCapture = (index: number, file: File) => {
        handleItemPhotoSelect(index, file);
        setCameraOpenForItem(null);
    };

    const handleItemPhotoRemove = (index: number) => {
        setItems(prev => {
            const next = [...prev];
            next[index] = { ...next[index], photoFile: null, photoPreview: null, inventoryImageUrl: null };
            return next;
        });
    };

    const handleDuplicateItem = (index: number) => {
        const itemToDuplicate = items[index];
        setItems(prev => [
            ...prev,
            {
                ...itemToDuplicate,
                id: Date.now().toString(), // New unique ID
                requestId: undefined, // Clear request ID for new item
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

    const uploadImage = async (file: File) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("itemId", "direct-po-item");

        const resp = await fetch("/api/upload/image", {
            method: "POST",
            body: formData,
        });

        if (!resp.ok) {
            const error = await resp.json().catch(() => ({}));
            throw new Error(error.error || "Image upload failed");
        }

        return await resp.json() as { imageUrl: string; imageKey: string };
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        let toastId: string | number | undefined;

        try {
            if (!commonData.vendorId) throw new Error("Vendor is required");
            if (!commonData.validTill) throw new Error("PO expiry date is required");

            // Handle image uploads and format all items
            toastId = toast.loading("Processing items and images...");

            const formattedItems = await Promise.all(items.map(async (item, idx) => {
                if (!item.itemDescription.trim()) throw new Error(`Item ${idx + 1}: Description is required`);
                if (item.quantity <= 0) throw new Error(`Item ${idx + 1}: Quantity must be greater than 0`);
                if (item.unitPrice <= 0) throw new Error(`Item ${idx + 1}: Unit price must be greater than 0`);

                let finalImageUrl = item.inventoryImageUrl || undefined;
                let finalImageKey = undefined;

                // Priority to user-uploaded/captured photo
                if (item.photoFile) {
                    try {
                        const uploadResult = await uploadImage(item.photoFile);
                        finalImageUrl = uploadResult.imageUrl;
                        finalImageKey = uploadResult.imageKey;
                    } catch (uploadErr) {
                        console.error(`Upload error for item ${idx + 1}:`, uploadErr);
                        // We throw to prevent PO creation if upload fails (safe approach)
                        throw new Error(`Failed to upload photo for item ${idx + 1}`);
                    }
                }

                const cleanName = item.itemDescription.trim();
                const cleanDesc = (item.description || "").trim();
                let fullDescription = cleanName;

                if (cleanDesc) {
                    if (cleanDesc.toLowerCase().startsWith(cleanName.toLowerCase())) {
                        fullDescription = cleanDesc;
                    } else {
                        fullDescription = `${cleanName}\n${cleanDesc}`;
                    }
                }

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
                    imageUrl: finalImageUrl,
                    imageKey: finalImageKey,
                };
            }));

            toast.loading("Generating Purchase Order...", { id: toastId });

            await createDirectPO({
                existingRequestNumber: commonData.requestNumber || undefined,
                deliverySiteId: commonData.deliverySite ? (commonData.deliverySite as Id<"sites">) : undefined,
                deliverySiteName: siteSearchQuery.trim(),
                projectId: (commonData.projectId || items[0]?.projectId || undefined) as Id<"projects"> | undefined,
                vendorId: commonData.vendorId as Id<"vendors">,
                validTill: new Date(commonData.validTill).getTime(),
                notes: commonData.notes || undefined,
                items: formattedItems,
                isDirect: mode === "direct",
                isUrgent: false,
            });

            toast.success(`${mode === "direct" ? "Direct PO" : "Purchase Order"} generated successfully!`, {
                id: toastId,
                description: "The PO is now pending approval.",
            });

            handleOpenChange(false);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Failed to create Direct PO";
            toast.error(errorMessage, { id: toastId });
        } finally {
            setIsLoading(false);
        }
    };



    return (
        <>
            <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogContent
                    className="max-w-[95vw] sm:max-w-4xl max-h-[95vh] overflow-y-auto p-0 sm:p-0"
                    onOpenAutoFocus={(e) => e.preventDefault()}
                >
                    {/* RFQ-Style Gradient Header */}
                    <DialogHeader className={cn(
                        "px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b bg-gradient-to-r",
                        mode === "direct"
                            ? "from-orange-500/10 to-orange-500/5"
                            : "from-primary/5 to-primary/10"
                    )}>
                        <div className="flex items-center gap-2 sm:gap-3">
                            <div className={cn(
                                "p-2 rounded-lg",
                                mode === "direct" ? "bg-orange-100 dark:bg-orange-900/30" : "bg-primary/10"
                            )}>
                                {mode === "direct"
                                    ? <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-orange-500" />
                                    : <Plus className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                                }
                            </div>
                            <div>
                                <DialogTitle className="text-lg sm:text-xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                                    {mode === "direct" ? "Direct PO" : "Create Purchase Order"}
                                </DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                                    {mode === "direct" ? "Emergency procurement — bypasses approval workflow" : "Standard purchase order for vendor"}
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="px-4 sm:px-6 py-4 sm:py-6">
                    <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">

                        {/* 1. Vendor Details Section — RFQ card style */}
                        <div className="space-y-4 p-4 sm:p-5 bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl border shadow-sm hover:shadow-md transition-shadow duration-200">
                            <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                                <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                                <h3 className="text-sm sm:text-base font-bold text-foreground">Vendor Details</h3>
                            </div>

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

                        {/* 2. General Info Section — RFQ card style */}
                        <div className="space-y-4 p-4 sm:p-5 bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl border shadow-sm hover:shadow-md transition-shadow duration-200">
                            <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                                <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                                <h3 className="text-sm sm:text-base font-bold text-foreground">General Info</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                {/* Project (shared) */}
                                <div className="space-y-1.5 relative">
                                    <Label className="text-sm">Project <span className="text-muted-foreground text-xs">(optional)</span></Label>
                                    {(() => {
                                        const projectList = projects || [];
                                        const selectedProject = projectList.find(p => p._id === commonData.projectId);
                                        const filtered = projectSearchQuery.trim()
                                            ? projectList.filter(p => p.name.toLowerCase().includes(projectSearchQuery.toLowerCase()))
                                            : projectList;
                                        return (
                                            <div className="relative">
                                                {/* Trigger */}
                                                <button
                                                    type="button"
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        setShowProjectSuggestions(prev => !prev);
                                                        setProjectSearchQuery("");
                                                    }}
                                                    className={`w-full h-auto min-h-[36px] flex items-center justify-between gap-2 px-3 py-2 rounded-md border-2 text-sm text-left transition-all bg-background ${selectedProject ? "border-primary/40 hover:border-primary/60" : "border-input hover:border-primary/30"}`}
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        {selectedProject ? (
                                                            <div className="flex flex-col min-w-0">
                                                                <span className="font-medium text-sm text-foreground truncate leading-tight">{selectedProject.name}</span>
                                                                {selectedProject.location && (
                                                                    <span className="text-[11px] text-muted-foreground truncate leading-tight flex items-center gap-1">
                                                                        <MapPin className="h-2.5 w-2.5 shrink-0" />{selectedProject.location}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted-foreground">Select project...</span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1 shrink-0">
                                                        {commonData.projectId && (
                                                            <span
                                                                role="button"
                                                                onMouseDown={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    setCommonData(p => ({ ...p, projectId: "" }));
                                                                    setProjectSearchQuery("");
                                                                    setShowProjectSuggestions(false);
                                                                }}
                                                                className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                                                            >
                                                                <X className="h-3.5 w-3.5" />
                                                            </span>
                                                        )}
                                                        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${showProjectSuggestions ? "rotate-180" : ""}`} />
                                                    </div>
                                                </button>

                                                {/* Dropdown */}
                                                {showProjectSuggestions && (
                                                    <div
                                                        className="absolute z-[100] w-full mt-1 bg-popover border rounded-lg shadow-lg"
                                                        onMouseDown={(e) => e.preventDefault()}
                                                    >
                                                        <div className="p-2 border-b">
                                                            <div className="relative">
                                                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                                                <Input
                                                                    autoFocus
                                                                    placeholder="Search projects..."
                                                                    value={projectSearchQuery}
                                                                    onChange={(e) => setProjectSearchQuery(e.target.value)}
                                                                    onKeyDown={(e) => { if (e.key === "Escape") setShowProjectSuggestions(false); }}
                                                                    className="pl-8 h-8 text-sm"
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="max-h-48 overflow-y-auto">
                                                            {filtered.slice(0, 8).map((project) => {
                                                                const isSelected = commonData.projectId === project._id;
                                                                return (
                                                                    <div
                                                                        key={project._id}
                                                                        className={`px-3 py-2.5 cursor-pointer hover:bg-accent transition-colors border-b border-border/20 last:border-0 ${isSelected ? "bg-primary/10" : ""}`}
                                                                        onMouseDown={(e) => {
                                                                            e.preventDefault();
                                                                            setCommonData(p => ({ ...p, projectId: project._id }));
                                                                            setProjectSearchQuery("");
                                                                            setShowProjectSuggestions(false);
                                                                            if (project.location && sites) {
                                                                                const loc = project.location.toLowerCase();
                                                                                const matched = sites.find(s =>
                                                                                    s.name.toLowerCase() === loc ||
                                                                                    s.name.toLowerCase().includes(loc) ||
                                                                                    loc.includes(s.name.toLowerCase())
                                                                                );
                                                                                if (matched) {
                                                                                    setCommonData(p => ({ ...p, deliverySite: matched._id, projectId: project._id }));
                                                                                    setSiteSearchQuery(matched.name);
                                                                                }
                                                                            }
                                                                        }}
                                                                    >
                                                                        <div className={`font-semibold text-sm ${isSelected ? "text-primary" : ""}`}>{project.name}</div>
                                                                        {project.location && (
                                                                            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                                                                <MapPin className="h-3 w-3 shrink-0" />{project.location}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                            {filtered.length === 0 && (
                                                                <div className="px-3 py-3 text-sm text-muted-foreground text-center">No projects found</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>

                                {/* PO Expiry Date */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="validTill" className="text-sm">PO Expiry Date *</Label>
                                    <Input id="validTill" type="date" value={commonData.validTill} onChange={(e) => setCommonData(p => ({ ...p, validTill: e.target.value }))} required className="h-9" min={new Date().toISOString().split("T")[0]} />
                                </div>
                            </div>
                        </div>


                        {/* 3. Items Section — RFQ style items bar */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between gap-2 sm:gap-3 p-3 sm:p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl border border-primary/20">
                                <div className="flex items-center gap-2 sm:gap-3">
                                    <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10">
                                        <Package className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm sm:text-base font-bold text-foreground">Items</h3>
                                        <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-primary text-primary-foreground text-xs sm:text-sm font-bold shadow-sm">
                                            <span>{items.length}</span>
                                            <span className="hidden sm:inline">{items.length === 1 ? "item" : "items"}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {items.length > 1 && (
                                        <div className="flex items-center gap-1">
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => scrollToItem(0)}>
                                                            <ChevronUp className="h-4 w-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Scroll to first item</TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => scrollToItem(items.length - 1)}>
                                                            <ChevronDown className="h-4 w-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>Scroll to last item</TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </div>
                                    )}
                                    <Button
                                        type="button"
                                        variant="default"
                                        size="sm"
                                        onClick={handleAddItem}
                                        className="gap-1.5 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9 font-semibold shadow-sm hover:shadow-lg hover:scale-105 active:scale-95 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary transition-all duration-200"
                                    >
                                        <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                        <span className="hidden sm:inline">Add Item</span>
                                        <span className="sm:hidden">Add</span>
                                    </Button>
                                </div>
                            </div>

                            {items.map((item, index) => (
                                <div
                                    key={item.id}
                                    ref={(el) => { itemRefs.current[index] = el; }}
                                    className="space-y-4 sm:space-y-5 p-4 sm:p-5 border-2 rounded-xl bg-card shadow-md hover:shadow-xl hover:border-primary/30 transition-all duration-200 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50"
                                >
                                    {/* Item Header */}
                                    <div className="flex items-center justify-between pb-3 border-b-2 border-border/60">
                                        <div className="flex items-center gap-2 sm:gap-3">
                                            <div className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-bold text-sm sm:text-base shadow-sm">
                                                {index + 1}
                                            </div>
                                            <h4 className="text-sm sm:text-base font-bold text-foreground">Item {index + 1}</h4>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {/* Select from Inventory button */}
                                            <div className="relative">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 px-3 text-xs font-semibold border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950"
                                                    onClick={() => {
                                                        setInventoryPickerIndex(inventoryPickerIndex === index ? null : index);
                                                        setInventoryPickerSearch("");
                                                    }}
                                                >
                                                    <Package className="h-3.5 w-3.5 mr-1.5" />
                                                    Select from Inventory
                                                </Button>
                                                {/* Inventory picker dropdown */}
                                                {inventoryPickerIndex === index && (
                                                    <div className="absolute right-0 top-full mt-1 z-[200] w-72 bg-popover border rounded-lg shadow-xl">
                                                        <div className="p-2 border-b">
                                                            <input
                                                                autoFocus
                                                                type="text"
                                                                placeholder="Search inventory..."
                                                                value={inventoryPickerSearch}
                                                                onChange={(e) => setInventoryPickerSearch(e.target.value)}
                                                                className="w-full h-8 px-3 text-sm rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                                                            />
                                                        </div>
                                                        <div className="max-h-56 overflow-y-auto">
                                                            {(inventoryItems || [])
                                                                .filter(inv => !inventoryPickerSearch.trim() || inv.itemName.toLowerCase().includes(inventoryPickerSearch.toLowerCase()))
                                                                .slice(0, 20)
                                                                .map(inv => (
                                                                    <button
                                                                        key={inv._id}
                                                                        type="button"
                                                                        className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-accent transition-colors"
                                                                        onClick={() => {
                                                                            handleItemChange(index, 'itemDescription', inv.itemName);
                                                                            handleItemChange(index, 'itemSearchQuery', inv.itemName);
                                                                            handleItemChange(index, 'description', (inv as any).description || "");
                                                                            handleItemChange(index, 'unit', inv.unit || "pcs");
                                                                            handleItemChange(index, 'perUnitBasisUnit', inv.unit || "pcs");
                                                                            handleItemChange(index, 'hsnCode', (inv as any).hsnSacCode || "");
                                                                            handleItemChange(index, 'inventoryImageUrl', (inv as any).images?.[0]?.imageUrl || null);
                                                                            setInventoryPickerIndex(null);
                                                                            setInventoryPickerSearch("");
                                                                        }}
                                                                    >
                                                                        {(inv as any).images?.[0]?.imageUrl ? (
                                                                            <img src={(inv as any).images[0].imageUrl} alt={inv.itemName} className="w-8 h-8 object-cover rounded border flex-shrink-0" />
                                                                        ) : (
                                                                            <div className="w-8 h-8 rounded border bg-muted flex items-center justify-center flex-shrink-0">
                                                                                <Package className="h-3.5 w-3.5 text-muted-foreground" />
                                                                            </div>
                                                                        )}
                                                                        <div className="min-w-0 flex-1">
                                                                            <div className="text-sm font-medium truncate">{inv.itemName}</div>
                                                                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                                                                                {inv.unit && <span>{inv.unit}</span>}
                                                                                {(inv as any).centralStock !== undefined && (
                                                                                    <span className="text-emerald-600">Stock: {(inv as any).centralStock}</span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </button>
                                                                ))
                                                            }
                                                            {(inventoryItems || []).filter(inv => !inventoryPickerSearch.trim() || inv.itemName.toLowerCase().includes(inventoryPickerSearch.toLowerCase())).length === 0 && (
                                                                <div className="p-4 text-center text-sm text-muted-foreground">No items found</div>
                                                            )}
                                                        </div>
                                                        <div className="p-2 border-t">
                                                            <Button type="button" variant="ghost" size="sm" className="w-full text-xs" onClick={() => setInventoryPickerIndex(null)}>
                                                                Cancel
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}
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
                                                            // Auto-set inventory image if available
                                                            handleItemChange(index, 'inventoryImageUrl', (selectedItem as any).images?.[0]?.imageUrl || null);
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
                                                                    // Auto-set inventory image if available
                                                                    handleItemChange(index, 'inventoryImageUrl', (invItem as any).images?.[0]?.imageUrl || null);
                                                                    setActiveItemIndex(null);
                                                                    setShowItemSuggestions(false);
                                                                }}
                                                                className={cn(
                                                                    "w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center justify-between cursor-pointer",
                                                                    selectedItemSuggestionIndex === suggestionIdx && "bg-accent"
                                                                )}
                                                            >
                                                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                                                    {/* Inventory image thumbnail */}
                                                                    {(invItem as any).images?.[0]?.imageUrl ? (
                                                                        <img
                                                                            src={(invItem as any).images[0].imageUrl}
                                                                            alt={invItem.itemName}
                                                                            className="w-8 h-8 object-cover rounded border flex-shrink-0"
                                                                        />
                                                                    ) : (
                                                                        <div className="w-8 h-8 rounded border bg-muted flex items-center justify-center flex-shrink-0">
                                                                            <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                                                        </div>
                                                                    )}
                                                                    <span className="truncate">{invItem.itemName}</span>
                                                                </div>
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
                                                            Use &quot;{item.itemSearchQuery || item.itemDescription}&quot; as New Item
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Row 1.6: Description */}
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
                                        <div className="space-y-1.5 relative">
                                            <div className="flex justify-between items-center">
                                                <Label className="text-sm">Quantity *</Label>
                                                {(item.originalQuantity && item.quantity > item.originalQuantity) ? (
                                                    <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">
                                                        +{(item.quantity - item.originalQuantity).toFixed(2).replace(/\.00$/, '')} Extra
                                                    </span>
                                                ) : null}
                                            </div>
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
                                    <div className="grid grid-cols-3 gap-4 relative">
                                        <div className="space-y-1.5">
                                            <Label className="text-sm">Discount (%)</Label>
                                            <Input type="number" min="0" max="100" step="0.1" value={item.discountPercent} onChange={(e) => handleItemChange(index, 'discountPercent', e.target.value)} className="h-9" />
                                        </div>
                                        <div className="space-y-1.5 relative">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-sm">SGST (%)</Label>
                                                <div className="flex items-center gap-1.5">
                                                    <Checkbox
                                                        id={`apply-18-${index}`}
                                                        className="h-3.5 w-3.5"
                                                        checked={parseFloat(item.sgst || "0") === 9 && parseFloat(item.cgst || "0") === 9}
                                                        onCheckedChange={(checked) => {
                                                            if (checked) {
                                                                handleItemChange(index, 'sgst', '9');
                                                                handleItemChange(index, 'cgst', '9');
                                                            } else {
                                                                handleItemChange(index, 'sgst', '0');
                                                                handleItemChange(index, 'cgst', '0');
                                                            }
                                                        }}
                                                    />
                                                    <label
                                                        htmlFor={`apply-18-${index}`}
                                                        className="text-[10px] font-medium text-blue-600 dark:text-blue-400 cursor-pointer select-none"
                                                    >
                                                        18% GST
                                                    </label>
                                                </div>
                                            </div>
                                            <Input type="number" min="0" max="100" step="0.1" value={item.sgst} onChange={(e) => handleItemChange(index, 'sgst', e.target.value)} className="h-9" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-sm">CGST (%)</Label>
                                            <Input type="number" min="0" max="100" step="0.1" value={item.cgst} onChange={(e) => handleItemChange(index, 'cgst', e.target.value)} className="h-9" />
                                        </div>
                                    </div>

                                    {/* Row 4: Item Photo */}
                                    <div className="space-y-1.5">
                                        <Label className="text-sm flex items-center gap-1.5">
                                            <ImageIcon className="h-3.5 w-3.5" />
                                            Photos
                                            <span className="text-muted-foreground text-xs">(Multiple allowed)</span>
                                        </Label>

                                        <input
                                            type="file"
                                            accept="image/*"
                                            ref={(el: HTMLInputElement | null) => {
                                                itemPhotoInputRefs.current[index] = el;
                                            }}
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) handleItemPhotoSelect(index, file);
                                            }}
                                            className="hidden"
                                        />

                                        {/* Dashed drop zone — RFQ style */}
                                        <div
                                            className="flex items-center justify-between gap-3 border-2 border-dashed border-border/60 rounded-lg px-4 py-3 bg-muted/10 hover:border-primary/40 hover:bg-muted/20 transition-colors"
                                            onDragOver={(e) => e.preventDefault()}
                                            onDrop={(e) => {
                                                e.preventDefault();
                                                const file = e.dataTransfer.files?.[0];
                                                if (file && file.type.startsWith("image/")) handleItemPhotoSelect(index, file);
                                            }}
                                        >
                                            <div className="flex items-center gap-2 text-muted-foreground min-w-0">
                                                <Upload className="h-4 w-4 shrink-0 opacity-50" />
                                                <span className="text-xs truncate">
                                                    {(item.photoPreview || item.inventoryImageUrl)
                                                        ? "Photo added — drop to replace"
                                                        : "Drag and drop image here"}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 px-2.5 gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                                                    onClick={() => itemPhotoInputRefs.current[index]?.click()}
                                                >
                                                    <Upload className="h-3.5 w-3.5" />
                                                    Upload
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 px-2.5 gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                                                    onClick={() => setCameraOpenForItem(index)}
                                                >
                                                    <Camera className="h-3.5 w-3.5" />
                                                    Camera
                                                </Button>
                                                {/* From Inventory - photo only */}
                                                <div className="relative">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 px-2.5 gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950"
                                                        onClick={() => {
                                                            setPhotoPickerIndex(photoPickerIndex === index ? null : index);
                                                            setPhotoPickerSearch("");
                                                        }}
                                                    >
                                                        <Package className="h-3.5 w-3.5" />
                                                        Inventory
                                                    </Button>
                                                    {/* Photo-only inventory picker */}
                                                    {photoPickerIndex === index && (
                                                        <div className="absolute right-0 bottom-full mb-1 z-[200] w-64 bg-popover border rounded-lg shadow-xl">
                                                            <div className="p-2 border-b">
                                                                <input
                                                                    autoFocus
                                                                    type="text"
                                                                    placeholder="Search item..."
                                                                    value={photoPickerSearch}
                                                                    onChange={(e) => setPhotoPickerSearch(e.target.value)}
                                                                    className="w-full h-7 px-2 text-xs rounded border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                                                                />
                                                            </div>
                                                            <div className="max-h-48 overflow-y-auto">
                                                                {(inventoryItems || [])
                                                                    .filter(inv =>
                                                                        (inv as any).images?.length > 0 &&
                                                                        (!photoPickerSearch.trim() || inv.itemName.toLowerCase().includes(photoPickerSearch.toLowerCase()))
                                                                    )
                                                                    .slice(0, 15)
                                                                    .map(inv => (
                                                                        <button
                                                                            key={inv._id}
                                                                            type="button"
                                                                            className="w-full flex items-center gap-2 px-2 py-1.5 text-left hover:bg-accent transition-colors"
                                                                            onClick={() => {
                                                                                handleItemChange(index, 'inventoryImageUrl', (inv as any).images[0].imageUrl);
                                                                                setPhotoPickerIndex(null);
                                                                                setPhotoPickerSearch("");
                                                                            }}
                                                                        >
                                                                            <img src={(inv as any).images[0].imageUrl} alt={inv.itemName} className="w-8 h-8 object-cover rounded border flex-shrink-0" />
                                                                            <span className="text-xs truncate">{inv.itemName}</span>
                                                                        </button>
                                                                    ))
                                                                }
                                                                {(inventoryItems || []).filter(inv => (inv as any).images?.length > 0 && (!photoPickerSearch.trim() || inv.itemName.toLowerCase().includes(photoPickerSearch.toLowerCase()))).length === 0 && (
                                                                    <div className="p-3 text-center text-xs text-muted-foreground">No items with photos</div>
                                                                )}
                                                            </div>
                                                            <div className="p-1.5 border-t">
                                                                <Button type="button" variant="ghost" size="sm" className="w-full text-xs h-6" onClick={() => setPhotoPickerIndex(null)}>Cancel</Button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Preview thumbnail */}
                                        {(item.photoPreview || item.inventoryImageUrl) && (
                                            <div className="flex items-center gap-3 mt-1.5">
                                                <div className="relative group shrink-0">
                                                    <img
                                                        src={item.photoPreview || item.inventoryImageUrl!}
                                                        alt="Item photo"
                                                        className="w-14 h-14 object-cover rounded-lg border border-border shadow-sm"
                                                    />
                                                    {item.photoPreview && (
                                                        <div className="absolute top-0.5 left-0.5 bg-blue-500 text-white text-[9px] px-1 rounded font-medium">New</div>
                                                    )}
                                                    {!item.photoPreview && item.inventoryImageUrl && (
                                                        <div className="absolute top-0.5 left-0.5 bg-emerald-500 text-white text-[9px] px-1 rounded font-medium">Inv</div>
                                                    )}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleItemPhotoRemove(index)}
                                                        className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity ring-2 ring-background"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                </div>
                                                <span className="text-xs text-muted-foreground">1 photo added</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Item Total */}
                                    <div className="text-right text-xs text-muted-foreground pt-1">
                                        Item Total: <span className="font-bold text-primary">₹{calculateItemTotal(item).toFixed(2)}</span>
                                    </div>
                                </div>
                            ))}

                            {/* Add Item button - RFQ style */}
                            <button
                                type="button"
                                onClick={handleAddItem}
                                className="w-full py-3 rounded-xl border-2 border-dashed border-primary/30 hover:border-primary/60 hover:bg-primary/5 text-sm font-semibold text-muted-foreground hover:text-primary transition-all flex items-center justify-center gap-2 group"
                            >
                                <Plus className="h-4 w-4 group-hover:rotate-90 transition-transform duration-200" />
                                Add Another Item
                            </button>

                            {/* Camera dialog for item photos */}
                            {cameraOpenForItem !== null && (
                                <CameraDialog
                                    open={true}
                                    onOpenChange={(open) => { if (!open) setCameraOpenForItem(null); }}
                                    onCapture={(file) => handleItemCameraCapture(cameraOpenForItem, file)}
                                    multiple={false}
                                />
                            )}



                            {/* Grand Total Block — RFQ style */}
                            <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-4 flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="roundOff"
                                        checked={roundOff}
                                        onCheckedChange={(checked) => setRoundOff(checked as boolean)}
                                    />
                                    <Label htmlFor="roundOff" className="text-sm font-semibold cursor-pointer text-muted-foreground">
                                        Round Off Total
                                    </Label>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">Grand Total</p>
                                    <p className="text-2xl font-bold text-primary">₹{calculateGrandTotal().toFixed(2)}</p>
                                </div>
                            </div>

                            {/* Internal Notes */}
                            <div className="space-y-1.5 pt-2">
                                <Label htmlFor="notes" className="text-sm font-semibold flex items-center gap-1.5">
                                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                                    Internal Notes <span className="text-muted-foreground text-xs font-normal">(optional)</span>
                                </Label>
                                <Textarea id="notes" placeholder="Add any internal notes or special instructions..." value={commonData.notes} onChange={(e) => setCommonData(p => ({ ...p, notes: e.target.value }))} className="resize-none min-h-[70px]" rows={2} />
                            </div>
                        </div>

                        <DialogFooter className="gap-2 sm:gap-2 border-t pt-4 mt-2">
                            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isLoading} className="rounded-full px-6">
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isLoading} className="rounded-full px-8 font-bold shadow-sm hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-200 bg-gradient-to-r from-primary to-primary/90">
                                {isLoading ? "Generating..." : "Generate PO"}
                            </Button>
                        </DialogFooter>
                    </form>
                    </div>
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
