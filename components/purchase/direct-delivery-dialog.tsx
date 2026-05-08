"use client";

/**
 * Direct Delivery Challan Dialog
 * 
 * Enhanced with RFQ-style UI/UX patterns:
 * - Item selection with inventory suggestions and keyboard navigation
 * - Quantity input with unit suggestions side-by-side
 * - Improved form layout matching RFQ structure
 * - Auto-calculation: Qty × Rate = Total
 * - Draft saving with incomplete data allowed
 * - Validation only on final "Create DC" click
 */

import { useState, useEffect, useRef, useCallback } from "react";
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
import { Truck, Package, Upload, FileText, Loader2, Plus, X, Trash2, Search, Building } from "lucide-react";
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
    itemSearchQuery: string;
    description: string;
    quantity: number;
    quantityInput: string;
    rate: number;
    unit: string;
    total: number;
    selectedItemFromInventory: { itemName: string; unit: string; centralStock?: number } | null;
    showItemSuggestions: boolean;
    showQuantitySuggestions: boolean;
    deductFromInventory: boolean; // Auto-deduct from inventory on DC creation
}

// ── RFQ-style Utility Functions ──────────────────────────────────────────
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
    const deductStock = useMutation(api.inventory.deductInventoryStockByName);

    // Load existing delivery if in edit mode
    const existingDelivery = useQuery(
        api.deliveries.getDeliveryWithItems,
        editingDeliveryId ? { deliveryId: editingDeliveryId } : "skip"
    );

    // Vendor data
    const vendors = useQuery(api.vendors.getAllVendors, {});

    // Form State - Vendor Selection (NEW - Mandatory)
    const [selectedVendorId, setSelectedVendorId] = useState<Id<"vendors"> | "">("");
    const [vendorSearchQuery, setVendorSearchQuery] = useState("");
    const [showVendorSuggestions, setShowVendorSuggestions] = useState(false);
    const [selectedVendorIndex, setSelectedVendorIndex] = useState(0);

    // Form State - Logistics (Enhanced with Transporter)
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [deliveryMode, setDeliveryMode] = useState<"porter" | "private" | "transporter">("porter");
    const [transporterName, setTransporterName] = useState(""); // NEW
    const [deliveryPersonName, setDeliveryPersonName] = useState("");
    const [vehicleNumber, setVehicleNumber] = useState("");
    const [driverPhone, setDriverPhone] = useState("");
    const [receiverName, setReceiverName] = useState("");
    const [notes, setNotes] = useState("");
    const [buyersOrderNo, setBuyersOrderNo] = useState("");
    const [loadingPhotos, setLoadingPhotos] = useState<FileList | null>(null);
    const [invoiceFile, setInvoiceFile] = useState<File | null>(null);

    // Form State - Items (Enhanced with RFQ-style structure)
    const [items, setItems] = useState<DirectDeliveryItem[]>([
        {
            id: "item-1",
            itemName: "",
            itemSearchQuery: "",
            description: "",
            quantity: 0,
            quantityInput: "",
            rate: 0,
            unit: "",
            total: 0,
            selectedItemFromInventory: null,
            showItemSuggestions: false,
            showQuantitySuggestions: false,
            deductFromInventory: false,
        },
    ]);

    // Enhanced state for RFQ-style interactions
    const inventoryItems = useQuery(api.requests.getInventoryItemsForAutocomplete, {});
    const [selectedItemIndex, setSelectedItemIndex] = useState<{ [itemId: string]: number }>({});
    const [selectedQuantityIndex, setSelectedQuantityIndex] = useState<{ [itemId: string]: number }>({});
    
    // Refs for keyboard navigation
    const itemRefs = useRef<{ [itemId: string]: HTMLInputElement | null }>({});
    const quantityRefs = useRef<{ [itemId: string]: HTMLInputElement | null }>({});

    // Preview State
    const [showPreview, setShowPreview] = useState(false);

    // Vendor filtering
    const filteredVendors = vendors?.filter(vendor =>
        vendor.companyName.toLowerCase().includes(vendorSearchQuery.toLowerCase()) ||
        vendor.email?.toLowerCase().includes(vendorSearchQuery.toLowerCase())
    ) || [];

    // Get selected vendor details
    const selectedVendor = vendors?.find(v => v._id === selectedVendorId);

    // Update vendor search query when vendor is selected
    useEffect(() => {
        if (selectedVendorId && selectedVendor) {
            setVendorSearchQuery(selectedVendor.companyName);
        }
    }, [selectedVendorId, selectedVendor]);

    // Close suggestions when clicking outside (RFQ-style)
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            items.forEach(item => {
                if (
                    item.showItemSuggestions &&
                    !(event.target as HTMLElement)?.closest('[data-item-suggestions]') &&
                    !(event.target as HTMLElement)?.closest(`#item-name-${item.id}`)
                ) {
                    updateItem(item.id, { showItemSuggestions: false });
                }
                if (
                    item.showQuantitySuggestions &&
                    !(event.target as HTMLElement)?.closest('[data-quantity-suggestions]') &&
                    !(event.target as HTMLElement)?.closest(`#quantity-${item.id}`)
                ) {
                    updateItem(item.id, { showQuantitySuggestions: false });
                }
            });
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [items]);

    // Common units for suggestions (from RFQ)
    const COMMON_UNITS = [
        "bags", "kg", "g", "gm", "ton", "mm", "cm", "m", "km",
        "nos", "pieces", "pcs", "liters", "l", "ml", "sqft", "sqm",
        "cft", "cum", "boxes", "cartons", "bundles", "rolls", "sheets", "units",
    ];

    // Parse quantity input (from RFQ logic)
    const parseQuantityInput = (input: string): { quantity: number; unit: string } => {
        if (!input.trim()) return { quantity: 0, unit: "" };
        
        const match = input.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
        if (match) {
            const quantity = parseFloat(match[1]);
            const unit = match[2].trim();
            return { quantity: isNaN(quantity) ? 0 : quantity, unit };
        }
        
        const numMatch = input.match(/^(\d+(?:\.\d+)?)/);
        if (numMatch) {
            return { quantity: parseFloat(numMatch[1]), unit: "" };
        }
        
        return { quantity: 0, unit: input.trim() };
    };

    // Get related units based on selected item's unit (from RFQ logic)
    const getRelatedUnits = (itemUnit: string): string[] => {
        if (!itemUnit) return [];
        const cleanedUnit = itemUnit.replace(/\d+/g, '').trim();
        if (!cleanedUnit) return [];
        const unit = cleanedUnit.toLowerCase();

        if (unit === "kg" || unit === "kilogram" || unit === "kilograms") {
            return ["kg", "gm", "g", "ton", "quintal"];
        }
        if (unit === "g" || unit === "gm" || unit === "gram" || unit === "grams") {
            return ["g", "gm", "kg"];
        }
        if (unit === "ton" || unit === "tonne") {
            return ["ton", "kg", "quintal"];
        }
        if (unit === "m" || unit === "meter" || unit === "metre" || unit === "meters") {
            return ["m", "cm", "mm", "km", "ft", "inch"];
        }
        if (unit === "cm" || unit === "centimeter" || unit === "centimetre") {
            return ["cm", "mm", "m", "inch"];
        }
        if (unit === "mm" || unit === "millimeter" || unit === "millimetre") {
            return ["mm", "cm", "m"];
        }
        if (unit === "ft" || unit === "feet" || unit === "foot") {
            return ["ft", "inch", "m", "cm"];
        }
        if (unit === "l" || unit === "liter" || unit === "litre" || unit === "liters") {
            return ["l", "ml", "cft", "cum"];
        }
        if (unit === "ml" || unit === "milliliter" || unit === "millilitre") {
            return ["ml", "l"];
        }
        if (unit === "sqft" || unit === "sq ft" || unit === "square feet") {
            return ["sqft", "sqm", "acre"];
        }
        if (unit === "sqm" || unit === "sq m" || unit === "square meter") {
            return ["sqm", "sqft", "acre"];
        }
        if (unit === "cft" || unit === "cubic feet") {
            return ["cft", "cum", "l"];
        }
        if (unit === "cum" || unit === "cubic meter") {
            return ["cum", "cft", "l"];
        }
        if (unit === "nos" || unit === "number" || unit === "numbers") {
            return ["nos", "pcs", "pieces", "units"];
        }
        if (unit === "pcs" || unit === "pieces" || unit === "piece") {
            return ["pcs", "pieces", "nos", "units"];
        }
        
        return [unit];
    };

    // Generate quantity suggestions (enhanced from RFQ logic)
    const generateQuantitySuggestions = (item: DirectDeliveryItem): string[] => {
        const suggestions: string[] = [];
        const currentQuantity = item.quantity || 0;
        
        // If item is selected from inventory, prioritize its unit
        const inventoryUnit = item.selectedItemFromInventory?.unit;
        if (inventoryUnit) {
            const relatedUnits = getRelatedUnits(inventoryUnit);
            relatedUnits.forEach(unit => {
                if (currentQuantity > 0) {
                    suggestions.push(`${currentQuantity} ${unit}`);
                }
                suggestions.push(`10 ${unit}`, `50 ${unit}`, `100 ${unit}`);
            });
        }
        
        // Add smart defaults based on quantity
        if (currentQuantity > 0) {
            if (currentQuantity < 100) {
                suggestions.push(`${currentQuantity} g`, `${currentQuantity} ml`, `${currentQuantity} mm`);
            } else if (currentQuantity < 1000) {
                suggestions.push(`${currentQuantity} kg`, `${currentQuantity} l`, `${currentQuantity} m`);
            } else {
                suggestions.push(`${currentQuantity} cartons`, `${currentQuantity} bags`, `${currentQuantity} ton`);
            }
        }
        
        // Add common quantity-unit combinations
        suggestions.push(
            "1 bag", "5 bags", "10 bags", "25 bags", "50 bags",
            "1 kg", "5 kg", "10 kg", "25 kg", "50 kg", "100 kg",
            "1 nos", "5 nos", "10 nos", "25 nos", "50 nos", "100 nos",
            "1 m", "5 m", "10 m", "25 m", "50 m", "100 m",
            "1 l", "5 l", "10 l", "25 l", "50 l", "100 l",
            "1 box", "5 boxes", "10 boxes", "25 boxes",
            "1 carton", "5 cartons", "10 cartons"
        );
        
        // Remove duplicates and filter by current input
        const unique = [...new Set(suggestions)];
        const filtered = unique.filter(s => 
            s.toLowerCase().includes(item.quantityInput.toLowerCase()) ||
            item.quantityInput.toLowerCase().includes(s.toLowerCase())
        );
        
        return filtered.slice(0, 10); // Limit to 10 suggestions
    };

    // Reset form when dialog opens (only for new creation, not editing)
    useEffect(() => {
        if (open && !editingDeliveryId) {
            // New creation mode - reset everything
            setSelectedVendorId("");
            setVendorSearchQuery("");
            setShowVendorSuggestions(false);
            setSelectedVendorIndex(0);
            setDeliveryMode("porter");
            setTransporterName("");
            setDeliveryPersonName("");
            setVehicleNumber("");
            setDriverPhone("");
            setReceiverName("");
            setNotes("");
            setBuyersOrderNo("");
            setLoadingPhotos(null);
            setInvoiceFile(null);
            setItems([
                {
                    id: "item-1",
                    itemName: "",
                    itemSearchQuery: "",
                    description: "",
                    quantity: 0,
                    quantityInput: "",
                    rate: 0,
                    unit: "",
                    total: 0,
                    selectedItemFromInventory: null,
                    showItemSuggestions: false,
                    showQuantitySuggestions: false,
                    deductFromInventory: false,
                },
            ]);
            setSelectedItemIndex({});
            setSelectedQuantityIndex({});
            setShowPreview(false);
        } else if (open && editingDeliveryId && existingDelivery) {
            // Edit mode - load existing data
            setSelectedVendorId(existingDelivery.vendor?._id || "");
            setVendorSearchQuery(existingDelivery.vendor?.companyName || "");
            setShowVendorSuggestions(false);
            setSelectedVendorIndex(0);
            setDeliveryMode(
                existingDelivery.deliveryType === "public" ? "porter" : 
                existingDelivery.deliveryType === "private" ? "private" : "transporter"
            );
            setTransporterName(existingDelivery.deliveryType === "vendor" ? existingDelivery.deliveryPerson || "" : "");
            setDeliveryPersonName(existingDelivery.deliveryPerson || "");
            setVehicleNumber(existingDelivery.vehicleNumber || "");
            setDriverPhone(existingDelivery.deliveryContact || "");
            setReceiverName(existingDelivery.receiverName || "");
            setNotes("");
            setBuyersOrderNo("");
            setLoadingPhotos(null);
            setInvoiceFile(null);

            // Load items from existing delivery
            if (existingDelivery.items && existingDelivery.items.length > 0) {
                setItems(
                    existingDelivery.items.map((item: any, idx: number) => ({
                        id: `item-${idx}`,
                        itemName: item.itemName || "",
                        itemSearchQuery: item.itemName || "",
                        description: item.description || "",
                        quantity: item.quantity || 0,
                        quantityInput: `${item.quantity || 0} ${item.unit || ""}`.trim(),
                        rate: item.rate || 0,
                        unit: item.unit || "",
                        total: (item.quantity || 0) * (item.rate || 0),
                        selectedItemFromInventory: null,
                        showItemSuggestions: false,
                        showQuantitySuggestions: false,
                        deductFromInventory: false,
                    }))
                );
            } else {
                setItems([
                    {
                        id: "item-1",
                        itemName: "",
                        itemSearchQuery: "",
                        description: "",
                        quantity: 0,
                        quantityInput: "",
                        rate: 0,
                        unit: "",
                        total: 0,
                        selectedItemFromInventory: null,
                        showItemSuggestions: false,
                        showQuantitySuggestions: false,
                        deductFromInventory: false,
                    },
                ]);
            }
            setSelectedItemIndex({});
            setSelectedQuantityIndex({});
            setShowPreview(false);
        }
    }, [open, editingDeliveryId, existingDelivery]);

    // Update item helper
    const updateItem = (itemId: string, updates: Partial<DirectDeliveryItem>) => {
        setItems(prev =>
            prev.map(item => {
                if (item.id !== itemId) return item;

                const updated = { ...item, ...updates };

                // Auto-calculate total if quantity or rate changed
                if ('quantity' in updates || 'rate' in updates) {
                    updated.total = updated.quantity * updated.rate;
                }

                return updated;
            })
        );
    };

    // Handle item selection from autocomplete (RFQ-style)
    const handleItemSelect = (itemId: string, item: { itemName: string; unit?: string; centralStock?: number }) => {
        const cleanedUnit = item.unit?.replace(/\d+/g, '').trim() || "";
        updateItem(itemId, {
            itemName: item.itemName,
            itemSearchQuery: item.itemName,
            selectedItemFromInventory: {
                itemName: item.itemName,
                unit: cleanedUnit,
                centralStock: item.centralStock || 0,
            },
            showItemSuggestions: false,
            unit: cleanedUnit,
            deductFromInventory: (item.centralStock || 0) > 0, // Auto-tick if stock available
        });
        setSelectedItemIndex(prev => ({ ...prev, [itemId]: -1 }));
        itemRefs.current[itemId]?.blur();
    };

    // Handle keyboard navigation for item suggestions (RFQ-style)
    const handleItemKeyDown = (itemId: string, e: React.KeyboardEvent<HTMLInputElement>, suggestions: any[]) => {
        const currentIndex = selectedItemIndex[itemId] ?? -1;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            const nextIndex = currentIndex < suggestions.length - 1 ? currentIndex + 1 : 0;
            setSelectedItemIndex(prev => ({ ...prev, [itemId]: nextIndex }));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prevIndex = currentIndex > 0 ? currentIndex - 1 : suggestions.length - 1;
            setSelectedItemIndex(prev => ({ ...prev, [itemId]: prevIndex }));
        } else if (e.key === 'Enter' && currentIndex >= 0 && currentIndex < suggestions.length) {
            e.preventDefault();
            handleItemSelect(itemId, suggestions[currentIndex]);
            setSelectedItemIndex(prev => ({ ...prev, [itemId]: -1 }));
        } else if (e.key === 'Escape') {
            updateItem(itemId, { showItemSuggestions: false });
            setSelectedItemIndex(prev => ({ ...prev, [itemId]: -1 }));
        }
    };

    // Handle quantity input change (RFQ-style)
    const handleQuantityInputChange = (itemId: string, value: string) => {
        const parsed = parseQuantityInput(value);
        updateItem(itemId, {
            quantityInput: value,
            quantity: parsed.quantity,
            unit: parsed.unit,
            showQuantitySuggestions: value.length > 0,
        });
        setSelectedQuantityIndex(prev => ({ ...prev, [itemId]: -1 }));
    };

    // Handle keyboard navigation for quantity suggestions (RFQ-style)
    const handleQuantityKeyDown = (itemId: string, e: React.KeyboardEvent<HTMLInputElement>, suggestions: string[]) => {
        const currentIndex = selectedQuantityIndex[itemId] ?? -1;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            const nextIndex = currentIndex < suggestions.length - 1 ? currentIndex + 1 : 0;
            setSelectedQuantityIndex(prev => ({ ...prev, [itemId]: nextIndex }));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prevIndex = currentIndex > 0 ? currentIndex - 1 : suggestions.length - 1;
            setSelectedQuantityIndex(prev => ({ ...prev, [itemId]: prevIndex }));
        } else if (e.key === 'Enter' && currentIndex >= 0 && currentIndex < suggestions.length) {
            e.preventDefault();
            handleQuantitySelect(itemId, suggestions[currentIndex]);
            setSelectedQuantityIndex(prev => ({ ...prev, [itemId]: -1 }));
        } else if (e.key === 'Escape') {
            updateItem(itemId, { showQuantitySuggestions: false });
            setSelectedQuantityIndex(prev => ({ ...prev, [itemId]: -1 }));
        }
    };

    // Handle quantity suggestion select (RFQ-style)
    const handleQuantitySelect = (itemId: string, suggestion: string) => {
        const parsed = parseQuantityInput(suggestion);
        updateItem(itemId, {
            quantityInput: suggestion,
            quantity: parsed.quantity,
            unit: parsed.unit,
            showQuantitySuggestions: false,
        });
        setSelectedQuantityIndex(prev => ({ ...prev, [itemId]: -1 }));
        quantityRefs.current[itemId]?.blur();
    };

    // Calculate total for an item
    const calculateTotal = (quantity: number, rate: number): number => {
        return quantity * rate;
    };

    // Add new item row
    const addItemRow = () => {
        const newId = `item-${Date.now()}`;
        setItems(prev => [
            ...prev,
            {
                id: newId,
                itemName: "",
                itemSearchQuery: "",
                description: "",
                quantity: 0,
                quantityInput: "",
                rate: 0,
                unit: "",
                total: 0,
                selectedItemFromInventory: null,
                showItemSuggestions: false,
                showQuantitySuggestions: false,
                deductFromInventory: false,
            },
        ]);
        toast.success("New item added!", { duration: 1500 });
    };

    // Remove item row
    const removeItemRow = (id: string) => {
        if (items.length === 1) {
            toast.error("At least one item is required");
            return;
        }
        setItems(prev => prev.filter(item => item.id !== id));
    };

    // Upload photo helper with better error handling
    const uploadPhoto = async (file: File): Promise<{ imageUrl: string; imageKey: string } | null> => {
        try {
            const formData = new FormData();
            formData.append("file", file);

            const response = await fetch("/api/upload/dc-photo", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Upload response error:", errorText);
                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                } catch {
                    errorData = { error: errorText };
                }
                throw new Error(errorData.error || `Upload failed with status ${response.status}`);
            }

            const result = await response.json();
            console.log("Upload successful:", result);
            return result;
        } catch (error) {
            console.error("Photo upload error:", error);
            toast.error(`Failed to upload ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return null;
        }
    };

    // Validate form
    const validateForm = (): boolean => {
        if (!selectedVendorId) {
            toast.error("Vendor selection is required");
            return false;
        }

        if (!driverPhone.trim()) {
            toast.error("Driver Phone is required");
            return false;
        }

        if (!receiverName.trim()) {
            toast.error("Receiver Name is required");
            return false;
        }

        if (deliveryMode === "transporter" && !transporterName.trim()) {
            toast.error("Transporter Name is required");
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

        // Check for incomplete items
        const incompleteItems = items.filter(
            item => item.itemName.trim() && (!item.quantity || !item.unit.trim())
        );

        if (incompleteItems.length > 0) {
            toast.error("Please complete all item details (quantity and unit are required)");
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
            // Upload photos (optional - don't fail if upload fails)
            let loadingPhotoData = null;
            let invoicePhotoData = null;

            if (loadingPhotos && loadingPhotos.length > 0) {
                toast.info("Uploading loading photo...");
                loadingPhotoData = await uploadPhoto(loadingPhotos[0]);
                // Don't fail the entire process if photo upload fails
                if (!loadingPhotoData) {
                    console.warn("Loading photo upload failed, continuing without photo");
                }
            }

            if (invoiceFile) {
                toast.info("Uploading invoice...");
                invoicePhotoData = await uploadPhoto(invoiceFile);
                // Don't fail the entire process if invoice upload fails
                if (!invoicePhotoData) {
                    console.warn("Invoice upload failed, continuing without invoice");
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
                    deliveryType: deliveryMode === "porter" ? "public" : deliveryMode === "private" ? "private" : "vendor",
                    deliveryPerson: deliveryMode === "transporter" ? transporterName : deliveryPersonName || undefined,
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
                    deliveryType: deliveryMode === "porter" ? "public" : deliveryMode === "private" ? "private" : "vendor",
                    deliveryPerson: deliveryMode === "transporter" ? transporterName : deliveryPersonName || undefined,
                    deliveryContact: driverPhone,
                    vehicleNumber: vehicleNumber || undefined,
                    receiverName,
                    purchaserName: "",
                    loadingPhoto: loadingPhotoData || undefined,
                    invoicePhoto: invoicePhotoData || undefined,
                    directDelivery: true,
                    vendorId: selectedVendorId ? selectedVendorId as Id<"vendors"> : undefined,
                    status: "delivered", // Mark as finalized after creation
                });

                deliveryId = result;

                // Deduct inventory for items with deduction enabled
                const deductionItems = validItems.filter(item => item.deductFromInventory && item.selectedItemFromInventory && item.quantity > 0);
                for (const item of deductionItems) {
                    try {
                        await deductStock({
                            itemName: item.itemName,
                            quantity: item.quantity,
                            reason: `Direct DC delivery - ${receiverName}`,
                        });
                    } catch (deductErr) {
                        console.error(`Failed to deduct stock for ${item.itemName}:`, deductErr);
                        toast.warning(`Could not deduct ${item.itemName} from inventory. Please update manually.`);
                    }
                }

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
        deliveryType: deliveryMode === "porter" ? "public" : deliveryMode === "private" ? "private" : "vendor",
        deliveryPerson: deliveryMode === "transporter" ? transporterName : deliveryPersonName,
        deliveryContact: driverPhone,
        vehicleNumber: vehicleNumber,
        receiverName: receiverName,
        po: null,
        vendor: selectedVendor ? {
            companyName: selectedVendor.companyName,
            contactName: selectedVendor.contactName,
            address: selectedVendor.address,
            gstNumber: selectedVendor.gstNumber,
            phone: selectedVendor.phone,
            email: selectedVendor.email,
        } : null,
        items: items
            .filter(item => item.itemName.trim())
            .map(item => ({
                _id: item.id as any,
                itemName: item.itemName,
                quantity: item.quantity,
                unit: item.unit,
                description: item.description,
                rate: item.rate,
            })),
        creator: null,
        notes: notes,
        buyersOrderNo: buyersOrderNo,
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[1100px] max-h-[90vh] flex flex-col">
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
                            {/* Vendor Selection - Simple and Consistent */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <Building className="h-5 w-5 text-blue-600" />
                                    <h3 className="font-semibold text-base">Vendor Details</h3>
                                </div>
                                
                                <div className="space-y-2 relative">
                                    <Label htmlFor="vendorName" className="text-sm font-medium">Vendor Name *</Label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="vendorName"
                                            placeholder="Start typing vendor name..."
                                            value={vendorSearchQuery}
                                            onChange={(e) => {
                                                setVendorSearchQuery(e.target.value);
                                                setShowVendorSuggestions(true);
                                                setSelectedVendorIndex(0);
                                                if (selectedVendorId) setSelectedVendorId("");
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
                                                        setSelectedVendorId(vendor._id);
                                                        setShowVendorSuggestions(false);
                                                    }
                                                }
                                            }}
                                            onFocus={() => setShowVendorSuggestions(true)}
                                            onBlur={() => setTimeout(() => setShowVendorSuggestions(false), 200)}
                                            className="pl-9 pr-10"
                                        />
                                        {vendorSearchQuery && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setVendorSearchQuery("");
                                                    setSelectedVendorId("");
                                                }}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        )}
                                        
                                        {/* Vendor Suggestions Dropdown */}
                                        {showVendorSuggestions && (filteredVendors.length > 0 || vendorSearchQuery.trim().length > 0) && (
                                            <div className="absolute z-[100] w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-y-auto">
                                                {filteredVendors.length > 0 ? (
                                                    filteredVendors.map((vendor, index) => (
                                                        <div
                                                            key={vendor._id}
                                                            className={`w-full px-3 py-2 flex items-center justify-between hover:bg-accent transition-colors cursor-pointer ${
                                                                index === selectedVendorIndex ? "bg-accent" : ""
                                                            }`}
                                                            onMouseDown={(e) => e.preventDefault()} // Prevent input blur
                                                            onClick={() => {
                                                                setSelectedVendorId(vendor._id);
                                                                setShowVendorSuggestions(false);
                                                            }}
                                                        >
                                                            <div className="flex-1 overflow-hidden">
                                                                <div className="font-medium truncate">{vendor.companyName}</div>
                                                                <div className="text-xs text-muted-foreground truncate">{vendor.email}</div>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="p-4 text-center text-sm text-muted-foreground">
                                                        No vendors found.
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Selected Vendor Info - Simple */}
                                    {selectedVendor && (
                                        <div className="text-sm text-muted-foreground">
                                            Selected: {selectedVendor.companyName}
                                            {selectedVendor.email && ` • ${selectedVendor.email}`}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Items Section - Enhanced RFQ-style */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-semibold text-base flex items-center gap-2">
                                        <Package className="h-5 w-5 text-blue-600" />
                                        Items
                                    </h3>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={addItemRow}
                                        className="gap-2 hover:bg-blue-50 hover:border-blue-300"
                                    >
                                        <Plus className="h-4 w-4" />
                                        Add Item
                                    </Button>
                                </div>

                                {/* Items Cards - RFQ-style layout */}
                                <div className="space-y-4">
                                    {items.map((item, index) => {
                                        const itemSuggestions = inventoryItems?.filter(inv =>
                                            inv.itemName.toLowerCase().includes(item.itemSearchQuery.toLowerCase())
                                        ).slice(0, 8) || [];
                                        
                                        const quantitySuggestions = generateQuantitySuggestions(item);

                                        return (
                                            <div key={item.id} className="border rounded-lg p-4 bg-card hover:shadow-md transition-shadow">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-sm font-semibold flex items-center justify-center">
                                                            {index + 1}
                                                        </div>
                                                        <span className="text-sm font-medium text-muted-foreground">Item {index + 1}</span>
                                                    </div>
                                                    {items.length > 1 && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => removeItemRow(item.id)}
                                                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {/* Item Name with Suggestions */}
                                                    <div className="space-y-2 relative">
                                                        <Label htmlFor={`item-name-${item.id}`} className="text-sm font-medium">
                                                            Select Item *
                                                        </Label>
                                                        <div className="relative">
                                                            <Input
                                                                id={`item-name-${item.id}`}
                                                                ref={(el) => { itemRefs.current[item.id] = el; }}
                                                                value={item.itemSearchQuery}
                                                                onChange={(e) => {
                                                                    updateItem(item.id, {
                                                                        itemName: e.target.value,
                                                                        itemSearchQuery: e.target.value,
                                                                        showItemSuggestions: e.target.value.length > 0,
                                                                    });
                                                                    setSelectedItemIndex(prev => ({ ...prev, [item.id]: -1 }));
                                                                }}
                                                                onFocus={() => {
                                                                    if (item.itemSearchQuery.length > 0) {
                                                                        updateItem(item.id, { showItemSuggestions: true });
                                                                    }
                                                                }}
                                                                onKeyDown={(e) => handleItemKeyDown(item.id, e, itemSuggestions)}
                                                                placeholder="Start typing to search items..."
                                                                className="pr-10"
                                                                autoComplete="off"
                                                            />
                                                            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                        </div>
                                                        
                                                        {/* Item Suggestions - RFQ Style */}
                                                        {item.showItemSuggestions && item.itemSearchQuery.trim().length > 0 && itemSuggestions.length > 0 && (
                                                            <div
                                                                data-item-suggestions
                                                                className="absolute z-50 w-full mt-1 rounded-md border bg-popover text-popover-foreground shadow-md max-h-60 overflow-y-auto"
                                                            >
                                                                {itemSuggestions.map((invItem, index) => (
                                                                    <div
                                                                        key={invItem._id}
                                                                        className={`w-full text-left px-3 py-2 text-sm rounded-md font-medium transition-all duration-200 focus:outline-none flex items-center justify-between group ${
                                                                            index === (selectedItemIndex[item.id] ?? -1)
                                                                                ? "bg-primary text-primary-foreground"
                                                                                : "hover:bg-primary/10 hover:text-primary"
                                                                        }`}
                                                                    >
                                                                        <button
                                                                            type="button"
                                                                            onMouseDown={(e) => e.preventDefault()} // Prevent input blur
                                                                            onClick={() => handleItemSelect(item.id, invItem)}
                                                                            className="flex-1 text-left flex items-center"
                                                                        >
                                                                            {invItem.itemName}
                                                                            {invItem.unit && (
                                                                                <span className={`ml-2 ${
                                                                                    index === (selectedItemIndex[item.id] ?? -1) 
                                                                                        ? "text-primary-foreground/80" 
                                                                                        : "text-muted-foreground"
                                                                                }`}>
                                                                                    ({invItem.unit})
                                                                                </span>
                                                                            )}
                                                                            {(invItem.centralStock ?? 0) > 0 && (
                                                                                <span className={`ml-2 text-xs ${
                                                                                    index === (selectedItemIndex[item.id] ?? -1) 
                                                                                        ? "text-primary-foreground/80" 
                                                                                        : "text-emerald-600"
                                                                                }`}>
                                                                                    • {invItem.centralStock} in stock
                                                                                </span>
                                                                            )}
                                                                        </button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                        
                                                        {/* Stock indicator */}
                                                        {item.selectedItemFromInventory && (
                                                            <div className="flex items-center gap-3">
                                                                <div className="text-xs text-emerald-600 font-medium">
                                                                    ✓ {item.selectedItemFromInventory.centralStock || 0} in stock
                                                                </div>
                                                                {(item.selectedItemFromInventory.centralStock || 0) > 0 && (
                                                                    <label className="flex items-center gap-1.5 cursor-pointer">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={item.deductFromInventory}
                                                                            onChange={(e) => updateItem(item.id, { deductFromInventory: e.target.checked })}
                                                                            className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                                        />
                                                                        <span className="text-xs text-muted-foreground">Deduct from inventory</span>
                                                                    </label>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Quantity with Unit Suggestions */}
                                                    <div className="space-y-2 relative">
                                                        <Label htmlFor={`quantity-${item.id}`} className="text-sm font-medium">
                                                            Quantity *
                                                        </Label>
                                                        <div className="relative">
                                                            <Input
                                                                id={`quantity-${item.id}`}
                                                                ref={(el) => { quantityRefs.current[item.id] = el; }}
                                                                value={item.quantityInput}
                                                                onChange={(e) => handleQuantityInputChange(item.id, e.target.value)}
                                                                onFocus={() => {
                                                                    if (item.quantityInput.length > 0) {
                                                                        updateItem(item.id, { showQuantitySuggestions: true });
                                                                    }
                                                                }}
                                                                onKeyDown={(e) => handleQuantityKeyDown(item.id, e, quantitySuggestions)}
                                                                placeholder="e.g. 10 bags, 5 kg, 30 nos"
                                                                className="pr-16"
                                                                autoComplete="off"
                                                            />
                                                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground">
                                                                {item.unit || "unit"}
                                                            </div>
                                                        </div>
                                                        
                                                        {/* Quantity Suggestions - RFQ Style */}
                                                        {item.showQuantitySuggestions && quantitySuggestions.length > 0 && (
                                                            <div
                                                                data-quantity-suggestions
                                                                className="absolute z-50 w-full mt-1 rounded-md border bg-popover text-popover-foreground shadow-md max-h-60 overflow-y-auto"
                                                            >
                                                                <div className="p-1">
                                                                    {quantitySuggestions.map((suggestion, index) => (
                                                                        <button
                                                                            key={suggestion}
                                                                            type="button"
                                                                            onMouseDown={(e) => e.preventDefault()} // Prevent input blur
                                                                            onClick={() => handleQuantitySelect(item.id, suggestion)}
                                                                            className={`w-full text-left px-3 py-2 text-sm rounded-md font-medium transition-all duration-200 focus:outline-none ${
                                                                                index === (selectedQuantityIndex[item.id] ?? -1)
                                                                                    ? "bg-primary text-primary-foreground"
                                                                                    : "hover:bg-primary/10 hover:text-primary"
                                                                            }`}
                                                                        >
                                                                            {suggestion}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Description */}
                                                    <div className="space-y-2">
                                                        <Label htmlFor={`description-${item.id}`} className="text-sm font-medium">
                                                            Description
                                                        </Label>
                                                        <Textarea
                                                            id={`description-${item.id}`}
                                                            value={item.description}
                                                            onChange={(e) => updateItem(item.id, { description: e.target.value })}
                                                            placeholder="Enter item description..."
                                                            className="min-h-[80px] resize-none"
                                                        />
                                                    </div>

                                                    {/* Rate and Total */}
                                                    <div className="space-y-2">
                                                        <Label htmlFor={`rate-${item.id}`} className="text-sm font-medium">
                                                            Rate (₹)
                                                        </Label>
                                                        <div className="flex gap-2">
                                                            <Input
                                                                id={`rate-${item.id}`}
                                                                type="number"
                                                                value={item.rate || ""}
                                                                onChange={(e) => updateItem(item.id, { rate: parseFloat(e.target.value) || 0 })}
                                                                placeholder="0.00"
                                                                min="0"
                                                                step="0.01"
                                                                className="flex-1"
                                                            />
                                                            <div className="flex items-center px-3 py-2 bg-muted rounded-md border min-w-[100px]">
                                                                <span className="text-sm font-semibold">
                                                                    ₹{item.total.toFixed(2)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            Total = {item.quantity} × ₹{item.rate} = ₹{item.total.toFixed(2)}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Grand Total */}
                                <div className="flex justify-end p-4 bg-muted/30 rounded-lg border">
                                    <div className="text-xl font-bold text-primary">
                                        Grand Total: ₹{grandTotal.toFixed(2)}
                                    </div>
                                </div>
                            </div>

                            {/* Logistics Details - MOVED TO BOTTOM */}
                            <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
                                <div className="flex items-center gap-2">
                                    <Truck className="h-5 w-5 text-green-600" />
                                    <h3 className="font-semibold text-base">Logistics Details</h3>
                                </div>

                                {/* Delivery Mode - Enhanced with Transporter */}
                                <div className="space-y-3">
                                    <Label className="text-sm font-medium">Delivery Mode</Label>
                                    <RadioGroup value={deliveryMode} onValueChange={(v) => setDeliveryMode(v as "porter" | "private" | "transporter")}>
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
                                            <RadioGroupItem value="transporter" id="transporter" />
                                            <Label htmlFor="transporter" className="flex items-center gap-2 cursor-pointer flex-1">
                                                <Building className="h-4 w-4" />
                                                <span>Transporter</span>
                                            </Label>
                                        </div>
                                    </RadioGroup>
                                </div>

                                {/* Transporter Name - Show only when transporter is selected */}
                                {deliveryMode === "transporter" && (
                                    <div className="space-y-2">
                                        <Label htmlFor="transporterName">Transporter Name *</Label>
                                        <Input
                                            id="transporterName"
                                            value={transporterName}
                                            onChange={(e) => setTransporterName(e.target.value)}
                                            placeholder="Enter transporter company name"
                                            className="border-red-200 focus:border-red-500"
                                        />
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="personName">
                                            {deliveryMode === "transporter" ? "Contact Person Name" : "Delivery Person Name"}
                                        </Label>
                                        <Input
                                            id="personName"
                                            value={deliveryPersonName}
                                            onChange={(e) => setDeliveryPersonName(e.target.value)}
                                            placeholder={deliveryMode === "transporter" ? "Enter contact person name" : "Enter delivery person name"}
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

                                {/* Buyer's Order No. Field */}
                                <div className="space-y-2">
                                    <Label htmlFor="buyersOrderNo">Buyer's Order No.</Label>
                                    <Input
                                        id="buyersOrderNo"
                                        value={buyersOrderNo}
                                        onChange={(e) => setBuyersOrderNo(e.target.value)}
                                        placeholder="Enter buyer's order number"
                                    />
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
