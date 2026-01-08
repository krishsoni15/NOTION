"use client";

/**
 * Check Dialog Component
 * 
 * Simplified version of Cost Comparison Dialog for "Recheck" phase.
 * Allows adding vendors and editing details without the full comparison analytics.
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
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
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Save, Send, AlertCircle, Package, CheckCircle, Building, Info, ExternalLink, Mail, Phone, Hash, MapPin } from "lucide-react";
import { useUserRole } from "@/hooks/use-user-role";
import { ROLES } from "@/lib/auth/roles";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { VendorCreationForm } from "./vendor-creation-form";
import { LazyImage } from "@/components/ui/lazy-image";
import { ImageSlider } from "@/components/ui/image-slider";
import type { Id } from "@/convex/_generated/dataModel";
import { Edit, Check, X } from "lucide-react";

interface CheckDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    requestId: Id<"requests">; // Main request ID (used when opening single item)
    requestIds?: Id<"requests">[]; // Multiple request IDs for batch CC viewing
}

interface VendorQuote {
    vendorId: Id<"vendors">;
    unitPrice: number;
    amount?: number;
    unit?: string;
    discountPercent?: number;  // Optional discount percentage
    gstPercent?: number;       // Optional GST percentage
}

// Common unit suggestions for autocomplete
const UNIT_SUGGESTIONS = [
    "kg", "kgs", "kilogram", "kilograms",
    "g", "gm", "gram", "grams",
    "lb", "lbs", "pound", "pounds",
    "ton", "tons", "tonne", "tonnes",
    "m", "meter", "meters", "metre", "metres",
    "cm", "centimeter", "centimeters",
    "mm", "millimeter", "millimeters",
    "ft", "feet", "foot",
    "inch", "inches", "in",
    "l", "liter", "liters", "litre", "litres",
    "ml", "milliliter", "milliliters",
    "gal", "gallon", "gallons",
    "pcs", "pieces", "piece", "pc",
    "box", "boxes",
    "pack", "packs", "packet", "packets",
    "dozen", "dozens",
    "set", "sets",
    "roll", "rolls",
    "sheet", "sheets",
    "bag", "bags",
    "bottle", "bottles",
    "can", "cans",
    "tube", "tubes",
    "unit", "units",
    "each"
];

export function CheckDialog({
    open,
    onOpenChange,
    requestId,
    requestIds,
}: CheckDialogProps) {
    // Multi-item CC navigation state
    const [currentCCIndex, setCurrentCCIndex] = useState(0);

    // Determine the list of request IDs to work with
    const ccRequestIds = requestIds && requestIds.length > 0 ? requestIds : [requestId];
    const hasMultipleCCs = ccRequestIds.length > 1;

    // Active request ID based on current index
    const activeRequestId = ccRequestIds[currentCCIndex] || requestId;

    const [vendorQuotes, setVendorQuotes] = useState<VendorQuote[]>([]);
    const [selectedVendorId, setSelectedVendorId] = useState<Id<"vendors"> | "">("");
    const [unitPrice, setUnitPrice] = useState("");
    const [isDirectDelivery, setIsDirectDelivery] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [vendorDialogOpen, setVendorDialogOpen] = useState(false);
    const [inventoryInfoOpen, setInventoryInfoOpen] = useState(false);
    const [imageSliderOpen, setImageSliderOpen] = useState(false);
    const [imageSliderImages, setImageSliderImages] = useState<Array<{ imageUrl: string; imageKey: string }>>([]);
    const [imageSliderItemName, setImageSliderItemName] = useState("");
    const [imageSliderInitialIndex, setImageSliderInitialIndex] = useState(0);
    const [isCreatingDirectPO, setIsCreatingDirectPO] = useState(false);
    const [quoteAmount, setQuoteAmount] = useState("1");
    const [quoteUnit, setQuoteUnit] = useState("");
    const [quoteDiscount, setQuoteDiscount] = useState("");  // Discount percentage
    const [quoteGst, setQuoteGst] = useState("");            // GST percentage
    const [showVendorDetails, setShowVendorDetails] = useState<string | null>(null);
    const [showDirectDeliveryConfirm, setShowDirectDeliveryConfirm] = useState(false);
    const [showCreateVendorDialog, setShowCreateVendorDialog] = useState(false);
    const [vendorSearchTerm, setVendorSearchTerm] = useState("");
    const [showVendorDropdown, setShowVendorDropdown] = useState(false);
    const [selectedVendorIndex, setSelectedVendorIndex] = useState(-1);
    const [editingQuoteIndex, setEditingQuoteIndex] = useState(-1); // -1 = adding new, >= 0 = editing existing
    const [showSaveConfirm, setShowSaveConfirm] = useState(false);
    const [showSplitApproveConfirm, setShowSplitApproveConfirm] = useState(false);

    // Inventory-based fulfillment state (skip vendor comparison)
    const [useInventoryStock, setUseInventoryStock] = useState(false);

    // Split fulfillment state - for partial inventory fulfillment
    const [quantityFromInventory, setQuantityFromInventory] = useState(0);
    const [quantityFromVendor, setQuantityFromVendor] = useState(0); // Minimum needed from vendor
    const [quantityToBuy, setQuantityToBuy] = useState(0); // Actual quantity to buy (can be >= quantityFromVendor)

    // Unit suggestions state
    const [showUnitSuggestions, setShowUnitSuggestions] = useState(false);
    const [selectedUnitIndex, setSelectedUnitIndex] = useState(-1);

    // Item details edit state
    const [isEditingItem, setIsEditingItem] = useState(false);
    const [editQuantity, setEditQuantity] = useState("");
    const [editUnit, setEditUnit] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [editItemName, setEditItemName] = useState("");
    const [isUpdatingItem, setIsUpdatingItem] = useState(false);


    // Item name autocomplete state
    const [showItemNameSuggestions, setShowItemNameSuggestions] = useState(false);
    const [selectedItemNameIndex, setSelectedItemNameIndex] = useState(-1);

    // Manager review state
    const [selectedFinalVendor, setSelectedFinalVendor] = useState<Id<"vendors"> | "">("");
    const [managerNotes, setManagerNotes] = useState("");
    const [isReviewing, setIsReviewing] = useState(false);

    const userRole = useUserRole();
    const isManager = userRole === ROLES.MANAGER;
    const reviewCC = useMutation(api.costComparisons.reviewCostComparison);
    const approveSplit = useMutation(api.costComparisons.approveSplitFulfillment);

    const request = useQuery(
        api.requests.getRequestById,
        activeRequestId ? { requestId: activeRequestId } : "skip"
    );
    const vendors = useQuery(api.vendors.getAllVendors);
    const inventoryItems = useQuery(api.inventory.getAllInventoryItems);

    // Check if item exists in inventory
    const itemInInventory = inventoryItems?.find(
        (item) => item.itemName.toLowerCase() === request?.itemName.toLowerCase()
    );

    // Check if inventory has sufficient stock
    const hasSufficientInventory = itemInInventory && (itemInInventory.centralStock || 0) >= (request?.quantity || 0);

    // Get smart vendor suggestions based on item in inventory
    const suggestedVendors = vendors?.filter(vendor =>
        itemInInventory?.vendorIds?.includes(vendor._id) || false
    ) || [];

    const otherVendors = vendors?.filter(vendor =>
        !itemInInventory?.vendorIds?.includes(vendor._id) &&
        !vendorQuotes.some(quote => quote.vendorId === vendor._id)
    ) || [];
    const existingCC = useQuery(
        api.costComparisons.getCostComparisonByRequestId,
        activeRequestId ? { requestId: activeRequestId } : "skip"
    );
    const upsertCC = useMutation(api.costComparisons.upsertCostComparison);
    const submitCC = useMutation(api.costComparisons.submitCostComparison);
    const resubmitCC = useMutation(api.costComparisons.resubmitCostComparison);
    const updateRequestDetails = useMutation(api.requests.updateRequestDetails);
    const updatePurchaseRequestStatus = useMutation(api.requests.updatePurchaseRequestStatus);
    const deductInventoryStock = useMutation(api.inventory.deductInventoryStockByName);

    // Load existing cost comparison
    useEffect(() => {
        if (existingCC && open) {
            setVendorQuotes(
                existingCC.vendorQuotes.map((q) => ({
                    vendorId: q.vendorId,
                    unitPrice: q.unitPrice,
                }))
            );
            setIsDirectDelivery(existingCC.isDirectDelivery);
            // If there are vendor quotes, user chose external purchase
            setUseInventoryStock(existingCC.vendorQuotes.length === 0);
            // Reset manager notes when opening
            if (isManager) {
                setManagerNotes("");
            }
        } else if (open && !existingCC) {
            // Reset when opening new
            setVendorQuotes([]);
            setIsDirectDelivery(false);
            // Default to inventory stock if sufficient
            setUseInventoryStock(false);
            if (isManager) {
                setManagerNotes("");
            }
        }
    }, [existingCC, open, isManager]);

    // Initialize edit fields when request loads
    useEffect(() => {
        if (request && open) {
            setEditQuantity(request.quantity.toString());
            setEditUnit(request.unit || "");
            setEditDescription(request.description || "");
            setEditItemName(request.itemName);
        }
    }, [request, open]);

    // Initialize split fulfillment quantities when request and inventory loads
    useEffect(() => {
        if (request && itemInInventory && open) {
            const availableStock = itemInInventory.centralStock || 0;
            const requiredQuantity = request.quantity || 0;

            if (availableStock >= requiredQuantity) {
                // Full inventory fulfillment possible
                setQuantityFromInventory(requiredQuantity);
                setQuantityFromVendor(0);
                setQuantityToBuy(0);
            } else if (availableStock > 0) {
                // Partial inventory fulfillment
                const neededFromVendor = requiredQuantity - availableStock;
                setQuantityFromInventory(availableStock);
                setQuantityFromVendor(neededFromVendor);
                setQuantityToBuy(neededFromVendor); // Default to minimum needed
            } else {
                // No inventory, all from vendors
                setQuantityFromInventory(0);
                setQuantityFromVendor(requiredQuantity);
                setQuantityToBuy(requiredQuantity);
            }
        } else if (request && !itemInInventory && open) {
            // New item, all from vendors
            setQuantityFromInventory(0);
            setQuantityFromVendor(request.quantity || 0);
            setQuantityToBuy(request.quantity || 0);
        }
    }, [request, itemInInventory, open]);

    // Get vendor name by ID
    const getVendorName = (vendorId: Id<"vendors">) => {
        return vendors?.find((v) => v._id === vendorId)?.companyName || "Unknown";
    };

    // Add or update vendor quote
    const handleAddVendor = () => {
        if (!selectedVendorId || !unitPrice) {
            toast.error("Please select a vendor and enter unit price");
            return;
        }

        const price = parseFloat(unitPrice);
        if (isNaN(price) || price < 0) {
            toast.error("Please enter a valid unit price");
            return;
        }

        // Check for duplicate vendor (only when adding new, not editing)
        if (editingQuoteIndex === -1 && vendorQuotes.some((q) => q.vendorId === selectedVendorId)) {
            toast.error("This vendor is already added");
            return;
        }

        const amount = parseFloat(quoteAmount) || 1;
        const unit = quoteUnit.trim() || request?.unit || itemInInventory?.unit || "units";
        const discount = parseFloat(quoteDiscount) || 0;
        const gst = parseFloat(quoteGst) || 0;

        const newQuote: VendorQuote = {
            vendorId: selectedVendorId as Id<"vendors">,
            unitPrice: price,
            amount: amount,
            unit: unit,
            discountPercent: discount > 0 ? discount : undefined,
            gstPercent: gst > 0 ? gst : undefined,
        };

        let newQuotes: VendorQuote[];
        if (editingQuoteIndex >= 0) {
            // Update existing quote
            newQuotes = [...vendorQuotes];
            newQuotes[editingQuoteIndex] = newQuote;
            setVendorQuotes(newQuotes);
            toast.success("Quote updated");
        } else {
            // Add new quote
            newQuotes = [...vendorQuotes, newQuote];
            setVendorQuotes(newQuotes);
            toast.success("Quote added");
        }

        // Save immediately
        handleSave(true, newQuotes);

        // Reset form
        setSelectedVendorId("");
        setUnitPrice("");
        setQuoteAmount("1");
        setQuoteUnit("");
        setQuoteDiscount("");
        setQuoteGst("");
        setEditingQuoteIndex(-1);
        setVendorSearchTerm("");
        setVendorDialogOpen(false);
    };

    // Edit vendor quote - populate form with existing data
    const handleEditQuote = (index: number) => {
        const quote = vendorQuotes[index];
        if (!quote) return;

        setEditingQuoteIndex(index);
        setSelectedVendorId(quote.vendorId);
        setVendorSearchTerm(getVendorName(quote.vendorId));
        setUnitPrice(quote.unitPrice.toString());
        setQuoteAmount((quote.amount || 1).toString());
        setQuoteUnit(quote.unit || "");
        setQuoteDiscount(quote.discountPercent?.toString() || "");
        setQuoteGst(quote.gstPercent?.toString() || "");
        setVendorDialogOpen(true);
    };

    // Remove vendor quote
    const handleRemoveVendor = (vendorId: Id<"vendors">) => {
        const newQuotes = vendorQuotes.filter((q) => q.vendorId !== vendorId);
        setVendorQuotes(newQuotes);
        toast.success("Quote removed");
        // Save immediately if there are still quotes
        if (newQuotes.length > 0) {
            handleSave(true, newQuotes);
        }
    };

    // Save cost comparison (silent mode for auto-save, accepts quotes parameter for immediate save)
    const handleSave = async (silent: boolean = false, quotesToSave?: VendorQuote[]) => {
        const quotes = quotesToSave || vendorQuotes;
        // For Check Dialog, we allow saving even with 0 quotes (just item details update)

        setIsSaving(true);
        try {
            await upsertCC({
                requestId: activeRequestId,
                vendorQuotes: quotes,
                isDirectDelivery,
                inventoryFulfillmentQuantity: quantityFromInventory,
            });
            if (!silent) toast.success("Changes saved");
        } catch (error: any) {
            if (!silent) toast.error(error.message || "Failed to save");
        } finally {
            setIsSaving(false);
        }
    };

    // Auto-save state - moved isInitialLoad state here
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    // Reset initial load flag when dialog closes
    useEffect(() => {
        if (!open) {
            setIsInitialLoad(true);
        }
    }, [open]);

    // Submit/Complete action
    const handleCompleteCheck = async () => {
        await handleSave();
        onOpenChange(false);
        toast.success("Check completed. Request ready for next steps.");
    };

    // Calculate total
    const calculateTotal = (unitPrice: number) => {
        if (!request) return 0;
        return unitPrice * request.quantity;
    };

    // Calculate price after discount
    const calculatePriceAfterDiscount = (unitPrice: number, discountPercent?: number) => {
        if (!discountPercent || discountPercent <= 0) return unitPrice;
        return unitPrice * (1 - discountPercent / 100);
    };

    // Calculate GST amount
    const calculateGstAmount = (priceAfterDiscount: number, gstPercent?: number) => {
        if (!gstPercent || gstPercent <= 0) return 0;
        return priceAfterDiscount * (gstPercent / 100);
    };

    // Calculate final price with discount and GST
    const calculateFinalPrice = (unitPrice: number, discountPercent?: number, gstPercent?: number) => {
        const priceAfterDiscount = calculatePriceAfterDiscount(unitPrice, discountPercent);
        const gstAmount = calculateGstAmount(priceAfterDiscount, gstPercent);
        return priceAfterDiscount + gstAmount;
    };

    // Calculate total with discount and GST for a quote
    const calculateQuoteTotal = (quote: VendorQuote, quantity: number) => {
        const finalUnitPrice = calculateFinalPrice(quote.unitPrice, quote.discountPercent, quote.gstPercent);
        return finalUnitPrice * quantity;
    };

    // Item edit handlers
    const handleStartEditItem = () => {
        setIsEditingItem(true);
        setEditQuantity(request?.quantity.toString() || "");
        setEditUnit(request?.unit || "");
        setEditDescription(request?.description || "");
    };

    const handleCancelEditItem = () => {
        setIsEditingItem(false);
        setEditQuantity(request?.quantity.toString() || "");
        setEditUnit(request?.unit || "");
        setEditDescription(request?.description || "");
        setEditItemName(request?.itemName || "");
    };

    const handleSaveItemDetails = async () => {
        if (!request) return;

        const quantity = parseFloat(editQuantity);
        if (isNaN(quantity) || quantity <= 0) {
            toast.error("Please enter a valid quantity");
            return;
        }

        if (!editItemName.trim()) {
            toast.error("Please enter an item name");
            return;
        }

        setIsUpdatingItem(true);
        try {
            await updateRequestDetails({
                requestId: activeRequestId,
                quantity,
                unit: editUnit.trim() || undefined,
                description: editDescription.trim() || undefined,
                itemName: editItemName.trim(),
            });
            toast.success("Item details updated successfully");
            setIsEditingItem(false);
        } catch (error: any) {
            toast.error(error.message || "Failed to update item details");
        } finally {
            setIsUpdatingItem(false);
        }
    };

    // Unit autocomplete handlers
    const getFilteredUnitSuggestions = (input: string) => {
        if (!input.trim()) return UNIT_SUGGESTIONS.slice(0, 8); // Show first 8 when empty
        return UNIT_SUGGESTIONS.filter(unit =>
            unit.toLowerCase().includes(input.toLowerCase())
        ).slice(0, 8); // Limit to 8 suggestions
    };

    const handleUnitInputChange = (value: string) => {
        setEditUnit(value);
        setShowUnitSuggestions(true);
        setSelectedUnitIndex(-1); // Reset selection when typing
    };

    const handleUnitKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        const suggestions = getFilteredUnitSuggestions(editUnit);

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedUnitIndex(prev =>
                prev < suggestions.length - 1 ? prev + 1 : prev
            );
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedUnitIndex(prev => prev > 0 ? prev - 1 : -1);
        } else if (e.key === 'Enter' && selectedUnitIndex >= 0) {
            e.preventDefault();
            setEditUnit(suggestions[selectedUnitIndex]);
            setShowUnitSuggestions(false);
            setSelectedUnitIndex(-1);
        } else if (e.key === 'Escape') {
            setShowUnitSuggestions(false);
            setSelectedUnitIndex(-1);
        }
    };

    const handleUnitSuggestionClick = (suggestion: string) => {
        setEditUnit(suggestion);
        setShowUnitSuggestions(false);
        setSelectedUnitIndex(-1);
    };

    const handleUnitFocus = () => {
        setShowUnitSuggestions(true);
    };

    const handleUnitBlur = () => {
        // Delay hiding to allow click on suggestions
        setTimeout(() => setShowUnitSuggestions(false), 150);
    };

    // Item name autocomplete handlers
    const getFilteredItemNameSuggestions = (input: string) => {
        if (!inventoryItems) return [];
        if (!input.trim()) return inventoryItems.slice(0, 8); // Show first 8 when empty
        return inventoryItems.filter(item =>
            item.itemName.toLowerCase().includes(input.toLowerCase())
        ).slice(0, 8); // Limit to 8 suggestions
    };

    const handleItemNameInputChange = (value: string) => {
        setEditItemName(value);
        setShowItemNameSuggestions(true);
        setSelectedItemNameIndex(-1); // Reset selection when typing
    };

    const handleItemNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        const suggestions = getFilteredItemNameSuggestions(editItemName);

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedItemNameIndex(prev =>
                prev < suggestions.length - 1 ? prev + 1 : prev
            );
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedItemNameIndex(prev => prev > 0 ? prev - 1 : -1);
        } else if (e.key === 'Enter' && selectedItemNameIndex >= 0) {
            e.preventDefault();
            setEditItemName(suggestions[selectedItemNameIndex].itemName);
            setShowItemNameSuggestions(false);
            setSelectedItemNameIndex(-1);
        } else if (e.key === 'Escape') {
            setShowItemNameSuggestions(false);
            setSelectedItemNameIndex(-1);
        }
    };

    const handleItemNameSuggestionClick = (suggestion: string) => {
        setEditItemName(suggestion);
        setShowItemNameSuggestions(false);
        setSelectedItemNameIndex(-1);
    };

    const handleItemNameFocus = () => {
        setShowItemNameSuggestions(true);
    };

    const handleItemNameBlur = () => {
        // Delay hiding to allow click on suggestions
        setTimeout(() => setShowItemNameSuggestions(false), 150);
    };

    const canEdit = existingCC?.status === "draft" || existingCC?.status === "cc_rejected" || !existingCC || request?.status === "recheck";
    const isSubmitted = existingCC?.status === "cc_pending";
    // Check dialog is used in 'recheck' or preparation, so we ignore some submitted logic unless it's strictly manager review state (which shouldn't happen here)
    const isManagerReview = isManager && isSubmitted;

    // Filter vendors based on search term
    const filteredVendors = vendors?.filter(vendor =>
        vendor.companyName.toLowerCase().includes(vendorSearchTerm.toLowerCase())
    ) || [];

    // Filter units based on input for quote
    const getFilteredUnitSuggestionsForQuote = (input: string) => {
        if (!input.trim()) return UNIT_SUGGESTIONS.slice(0, 8); // Show first 8 when empty
        return UNIT_SUGGESTIONS.filter(unit =>
            unit.toLowerCase().includes(input.toLowerCase())
        ).slice(0, 8); // Limit to 8 suggestions
    };

    // Unit suggestion handlers for quote
    const handleQuoteUnitInputChange = (value: string) => {
        setQuoteUnit(value);
        setShowUnitSuggestions(true);
        setSelectedUnitIndex(-1); // Reset selection when typing
    };

    const handleQuoteUnitKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        const suggestions = getFilteredUnitSuggestionsForQuote(quoteUnit);

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedUnitIndex(prev =>
                prev < suggestions.length - 1 ? prev + 1 : prev
            );
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedUnitIndex(prev => prev > 0 ? prev - 1 : -1);
        } else if (e.key === 'Enter' && selectedUnitIndex >= 0) {
            e.preventDefault();
            setQuoteUnit(suggestions[selectedUnitIndex]);
            setShowUnitSuggestions(false);
            setSelectedUnitIndex(-1);
        } else if (e.key === 'Escape') {
            setShowUnitSuggestions(false);
            setSelectedUnitIndex(-1);
        }
    };

    const handleQuoteUnitSuggestionClick = (suggestion: string) => {
        setQuoteUnit(suggestion);
        setShowUnitSuggestions(false);
        setSelectedUnitIndex(-1);
        // Auto-focus back to the input or next field for better UX
    };

    const handleQuoteUnitFocus = () => {
        setShowUnitSuggestions(true);
    };

    const handleQuoteUnitBlur = () => {
        // Delay hiding to allow click on suggestions
        setTimeout(() => setShowUnitSuggestions(false), 150);
    };

    const handleDirectDelivery = async () => {
        if (!request) return;

        // Determine quantity to take from inventory
        const deliveryQuantity = hasSufficientInventory
            ? (request.quantity || 0)  // Full fulfillment from inventory
            : quantityFromInventory;   // Partial fulfillment

        if (deliveryQuantity <= 0) {
            toast.error("Please specify a quantity to deliver from inventory");
            return;
        }

        setIsCreatingDirectPO(true);
        try {
            // Deduct stock from inventory
            const result = await deductInventoryStock({
                itemName: request.itemName,
                quantity: deliveryQuantity,
                reason: `Direct delivery for request ${request.requestNumber}`,
            });

            // If full fulfillment (all from inventory), update request to delivery stage
            if (hasSufficientInventory || quantityFromVendor === 0) {
                await updatePurchaseRequestStatus({
                    requestId: activeRequestId,
                    status: "delivery_stage",
                });
                toast.success(
                    `Direct Delivery created! ${deliveryQuantity} ${request.unit || 'units'} deducted from inventory. ` +
                    `Remaining stock: ${result.newStock} ${itemInInventory?.unit || 'units'}`
                );
            } else {
                // Partial fulfillment - still need vendor quotes for remaining quantity
                toast.success(
                    `${deliveryQuantity} ${request.unit || 'units'} taken from inventory. ` +
                    `Remaining stock: ${result.newStock}. ` +
                    `Please add vendor quotes for remaining ${quantityFromVendor} ${request.unit || 'units'}.`
                );
            }

            setShowDirectDeliveryConfirm(false);

            // Only close dialog if full fulfillment
            if (hasSufficientInventory || quantityFromVendor === 0) {
                onOpenChange(false);
            }
        } catch (error: any) {
            toast.error(error.message || "Failed to create Direct PO");
        } finally {
            setIsCreatingDirectPO(false);
        }
    };

    const openImageSlider = (images: Array<{ imageUrl: string; imageKey: string }>, itemName: string, initialIndex: number = 0) => {
        setImageSliderImages(images);
        setImageSliderItemName(itemName);
        setImageSliderInitialIndex(initialIndex);
        setImageSliderOpen(true);
    };

    // Load selected vendor if CC is approved (for manager view)
    useEffect(() => {
        if (existingCC?.selectedVendorId && open && isManager) {
            setSelectedFinalVendor(existingCC.selectedVendorId);
        } else if (open && isManager && !existingCC?.selectedVendorId) {
            setSelectedFinalVendor("");
        }
    }, [existingCC, open, isManager]);

    // Reset CC index when dialog opens
    useEffect(() => {
        if (open) {
            setCurrentCCIndex(0);
        }
    }, [open]);

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader className="pb-3">
                        <DialogTitle className="text-lg">Review & Check Request - {request?.requestNumber}</DialogTitle>
                        <DialogDescription className="text-xs">
                            Manage inventory fulfillment and vendor quotes.
                        </DialogDescription>

                        {/* CC Navigation Tabs - shown when there are multiple CCs */}
                        {hasMultipleCCs && (
                            <div className="flex items-center gap-2 pt-2 border-t mt-2">
                                <span className="text-xs text-muted-foreground">Items:</span>
                                <div className="flex items-center gap-1">
                                    {ccRequestIds.map((_, index) => (
                                        <Button
                                            key={index}
                                            variant={currentCCIndex === index ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => setCurrentCCIndex(index)}
                                            className={`h-7 px-3 text-xs font-medium ${currentCCIndex === index
                                                ? "bg-primary text-primary-foreground"
                                                : "hover:bg-muted"
                                                }`}
                                        >
                                            Item {index + 1}
                                        </Button>
                                    ))}
                                </div>
                                <span className="text-xs text-muted-foreground ml-2">
                                    ({currentCCIndex + 1}/{ccRequestIds.length})
                                </span>
                            </div>
                        )}
                    </DialogHeader>

                    <div className="space-y-3">
                        {/* Item Information Card */}
                        {request && (
                            <div className="p-3 bg-muted/30 border rounded-lg space-y-2">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-medium text-sm">Item Details</h4>
                                    {canEdit && !isManager && !isEditingItem && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleStartEditItem}
                                            className="h-6 w-6 p-0"
                                        >
                                            <Edit className="h-3 w-3" />
                                        </Button>
                                    )}
                                </div>
                                <div className="space-y-3 text-sm">
                                    {/* Item Name Row - Full Width */}
                                    <div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-muted-foreground">Item:</span>

                                        </div>
                                        {isEditingItem ? (
                                            <div className="relative mt-1">
                                                <Input
                                                    type="text"
                                                    value={editItemName}
                                                    onChange={(e) => handleItemNameInputChange(e.target.value)}
                                                    onKeyDown={handleItemNameKeyDown}
                                                    onFocus={handleItemNameFocus}
                                                    onBlur={handleItemNameBlur}
                                                    placeholder="Enter item name..."
                                                    className="text-sm"
                                                    disabled={isUpdatingItem}
                                                />
                                                {showItemNameSuggestions && getFilteredItemNameSuggestions(editItemName).length > 0 && (
                                                    <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border border-border rounded-md shadow-lg max-h-40 overflow-y-auto">
                                                        {getFilteredItemNameSuggestions(editItemName).map((item, index) => (
                                                            <button
                                                                key={item._id}
                                                                type="button"
                                                                onClick={() => handleItemNameSuggestionClick(item.itemName)}
                                                                className={`w-full px-3 py-1.5 text-left text-xs hover:bg-muted transition-colors ${index === selectedItemNameIndex ? 'bg-muted font-medium' : ''
                                                                    }`}
                                                            >
                                                                <div className="flex items-center justify-between w-full">
                                                                    <span>{item.itemName}</span>
                                                                    <span className="text-muted-foreground ml-2">
                                                                        ({item.centralStock || 0} {item.unit || 'units'})
                                                                    </span>
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <p className="font-medium mt-1">{request.itemName}</p>
                                        )}
                                    </div>

                                    {/* Quantity and Unit Row - 50/50 */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <span className="text-muted-foreground">Quantity:</span>
                                            {isEditingItem ? (
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    step="any"
                                                    value={editQuantity}
                                                    onChange={(e) => setEditQuantity(e.target.value)}
                                                    className="h-7 text-xs mt-1"
                                                    disabled={isUpdatingItem}
                                                />
                                            ) : (
                                                <p className="font-medium mt-1">{request.quantity}</p>
                                            )}
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Unit:</span>
                                            {isEditingItem ? (
                                                <div className="relative mt-1">
                                                    <Input
                                                        type="text"
                                                        placeholder="unit"
                                                        value={editUnit}
                                                        onChange={(e) => handleUnitInputChange(e.target.value)}
                                                        onKeyDown={handleUnitKeyDown}
                                                        onFocus={handleUnitFocus}
                                                        onBlur={handleUnitBlur}
                                                        className="h-7 text-xs"
                                                        disabled={isUpdatingItem}
                                                    />
                                                    {showUnitSuggestions && getFilteredUnitSuggestions(editUnit).length > 0 && (
                                                        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border border-border rounded-md shadow-lg max-h-40 overflow-y-auto">
                                                            {getFilteredUnitSuggestions(editUnit).map((suggestion, index) => (
                                                                <button
                                                                    key={suggestion}
                                                                    type="button"
                                                                    onClick={() => handleUnitSuggestionClick(suggestion)}
                                                                    className={`w-full px-3 py-1.5 text-left text-xs hover:bg-muted transition-colors ${index === selectedUnitIndex ? 'bg-muted font-medium' : ''
                                                                        }`}
                                                                >
                                                                    {suggestion}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <p className="font-medium mt-1">{request.unit || itemInInventory?.unit || 'units'}</p>
                                            )}
                                        </div>
                                    </div>
                                    {/* Description Row - Full Width */}
                                    <div>
                                        <span className="text-muted-foreground">Description:</span>
                                        {isEditingItem ? (
                                            <Textarea
                                                value={editDescription}
                                                onChange={(e) => setEditDescription(e.target.value)}
                                                placeholder="Enter item description..."
                                                className="mt-1 text-xs min-h-[60px]"
                                                disabled={isUpdatingItem}
                                            />
                                        ) : (
                                            <p className="text-sm mt-1">{request.description || "No description provided"}</p>
                                        )}
                                    </div>
                                    {/* Save/Cancel Edit Buttons */}
                                    {isEditingItem && (
                                        <div className="flex gap-2 justify-end pt-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={handleCancelEditItem}
                                                disabled={isUpdatingItem}
                                                className="h-7 text-xs"
                                            >
                                                Cancel
                                            </Button>
                                            <Button
                                                variant="default"
                                                size="sm"
                                                onClick={handleSaveItemDetails}
                                                disabled={isUpdatingItem}
                                                className="h-7 text-xs"
                                            >
                                                Save
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Direct Delivery - Shows when item is in inventory with sufficient stock */}
                        {hasSufficientInventory && canEdit && !isManager && (
                            <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-300 dark:border-green-700 rounded-lg">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-full">
                                            <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-green-700 dark:text-green-300">
                                                ✓ Item Available in Inventory
                                            </h3>
                                            <p className="text-sm text-green-600 dark:text-green-400">
                                                Stock: <span className="font-bold">{itemInInventory?.centralStock || 0}</span> {itemInInventory?.unit || 'units'}
                                                <span className="mx-2">•</span>
                                                Required: <span className="font-bold">{request?.quantity || 0}</span> {request?.unit || 'units'}
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        onClick={() => setShowDirectDeliveryConfirm(true)}
                                        className="bg-green-600 hover:bg-green-700 text-white"
                                        size="sm"
                                    >
                                        <Package className="h-4 w-4 mr-2" />
                                        Direct Delivery
                                    </Button>
                                </div>
                                <p className="text-xs text-green-600 dark:text-green-400 mt-3 pl-14">
                                    No vendor comparison needed. Click "Direct Delivery" to move directly to delivery stage.
                                </p>
                            </div>
                        )}

                        {/* Smart Fulfillment - Shows when item is in inventory but with partial stock */}
                        {itemInInventory && !hasSufficientInventory && canEdit && !isManager && (itemInInventory.centralStock || 0) > 0 && (
                            <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border border-blue-300 dark:border-blue-700 rounded-lg space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                        <span className="font-semibold text-sm text-blue-700 dark:text-blue-300">
                                            Smart Fulfillment
                                        </span>
                                    </div>
                                    <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                                        Partial Stock Available
                                    </span>
                                </div>

                                {/* Current Status */}
                                <div className="grid grid-cols-3 gap-3 text-xs">
                                    <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded text-center">
                                        <span className="text-green-600 dark:text-green-400 font-medium block">📦 In Stock</span>
                                        <span className="font-bold text-green-700 dark:text-green-300 text-xl">{itemInInventory.centralStock || 0}</span>
                                        <span className="text-green-600 dark:text-green-400 block">{itemInInventory.unit || 'units'}</span>
                                    </div>
                                    <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded text-center">
                                        <span className="text-blue-600 dark:text-blue-400 font-medium block">🎯 Required</span>
                                        <span className="font-bold text-blue-700 dark:text-blue-300 text-xl">{request?.quantity || 0}</span>
                                        <span className="text-blue-600 dark:text-blue-400 block">{request?.unit || 'units'}</span>
                                    </div>
                                    <div className="bg-amber-100 dark:bg-amber-900/30 p-3 rounded text-center">
                                        <span className="text-amber-600 dark:text-amber-400 font-medium block">🛒 Need to Buy</span>
                                        <span className="font-bold text-amber-700 dark:text-amber-300 text-xl">{quantityFromVendor}</span>
                                        <span className="text-amber-600 dark:text-amber-400 block">{itemInInventory.unit || 'units'}</span>
                                    </div>
                                </div>

                                {/* Smart Controls */}
                                <div className="grid grid-cols-2 gap-4">
                                    {/* From Inventory - Direct Delivery */}
                                    <div className="p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Package className="h-4 w-4 text-green-600" />
                                            <span className="font-medium text-sm text-green-700 dark:text-green-300">From Inventory</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                type="number"
                                                min="0"
                                                max={itemInInventory.centralStock || 0}
                                                value={quantityFromInventory}
                                                onChange={(e) => {
                                                    const val = Math.max(0, Math.min(Number(e.target.value), itemInInventory.centralStock || 0));
                                                    setQuantityFromInventory(val);
                                                    const newNeeded = Math.max(0, (request?.quantity || 0) - val);
                                                    setQuantityFromVendor(newNeeded);
                                                    setQuantityToBuy(Math.max(newNeeded, quantityToBuy < newNeeded ? newNeeded : quantityToBuy));
                                                }}
                                                className="w-20 text-center font-bold"
                                            />
                                            <span className="text-sm text-green-600 dark:text-green-400">{itemInInventory.unit || 'units'}</span>
                                        </div>
                                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                                            Available: {itemInInventory.centralStock || 0}
                                        </p>
                                        {quantityFromInventory > 0 && (
                                            <>
                                                {/* Gate Direct Delivery: Allowed if NOT mixed plan OR if mixed plan is approved */}
                                                {(quantityToBuy === 0 || existingCC?.managerNotes?.includes("Split Fulfillment Approved")) ? (
                                                    <Button
                                                        onClick={() => setShowDirectDeliveryConfirm(true)}
                                                        className="mt-2 w-full bg-green-600 hover:bg-green-700 text-white"
                                                        size="sm"
                                                    >
                                                        <Package className="h-3 w-3 mr-1" />
                                                        Direct Delivery ({quantityFromInventory})
                                                    </Button>
                                                ) : (
                                                    <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700 text-center flex items-center justify-center gap-2">
                                                        <AlertCircle className="h-3 w-3" />
                                                        <span>Waiting for Manager Approval</span>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>

                                    {/* From Vendors - Can buy more than needed */}
                                    <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Building className="h-4 w-4 text-blue-600" />
                                            <span className="font-medium text-sm text-blue-700 dark:text-blue-300">Purchase from Vendors</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                type="number"
                                                min="1"
                                                value={quantityToBuy}
                                                onChange={(e) => setQuantityToBuy(Math.max(1, Number(e.target.value) || 0))}
                                                className="w-20 text-center font-bold"
                                            />
                                            <span className="text-sm text-blue-600 dark:text-blue-400">{request?.unit || 'units'}</span>
                                        </div>
                                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                            Min: {quantityFromVendor} required (can buy more)
                                        </p>
                                        {quantityToBuy < quantityFromVendor && quantityToBuy > 0 && (
                                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                                ⚠️ Need at least {quantityFromVendor} to fulfill request
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Extra to Inventory Preview */}
                                {quantityToBuy > quantityFromVendor && (
                                    <div className="p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-purple-600 dark:text-purple-400">📈</span>
                                                <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Extra → Inventory</span>
                                            </div>
                                            <span className="font-bold text-purple-700 dark:text-purple-300">
                                                +{quantityToBuy - quantityFromVendor} {itemInInventory.unit || 'units'}
                                            </span>
                                        </div>
                                        <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                                            After delivery, inventory will have: {Math.max(0, (itemInInventory.centralStock || 0) - quantityFromInventory) + (quantityToBuy - quantityFromVendor)} {itemInInventory.unit || 'units'}
                                        </p>
                                    </div>
                                )}

                                {/* Quick Actions */}
                                <div className="flex gap-2 flex-wrap">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setQuantityFromInventory(itemInInventory.centralStock || 0);
                                            const newNeeded = Math.max(0, (request?.quantity || 0) - (itemInInventory.centralStock || 0));
                                            setQuantityFromVendor(newNeeded);
                                            setQuantityToBuy(newNeeded);
                                        }}
                                        className="text-xs"
                                    >
                                        Use All Stock
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setQuantityFromInventory(0);
                                            setQuantityFromVendor(request?.quantity || 0);
                                            setQuantityToBuy(request?.quantity || 0);
                                        }}
                                        className="text-xs"
                                    >
                                        Buy All from Vendors
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Out of Stock - Item in inventory but 0 stock */}
                        {itemInInventory && !hasSufficientInventory && (itemInInventory.centralStock || 0) === 0 && canEdit && !isManager && (
                            <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-300 dark:border-amber-700 rounded-lg space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                        <span className="font-semibold text-sm text-amber-700 dark:text-amber-300">
                                            Out of Stock - Purchase Required
                                        </span>
                                    </div>
                                    <span className="text-xs bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 px-2 py-1 rounded">
                                        0 in inventory
                                    </span>
                                </div>

                                {/* Quantity Controls */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded text-center">
                                        <span className="text-blue-600 dark:text-blue-400 font-medium block text-xs">🎯 Required</span>
                                        <span className="font-bold text-blue-700 dark:text-blue-300 text-xl">{request?.quantity || 0}</span>
                                        <span className="text-blue-600 dark:text-blue-400 block text-xs">{request?.unit || 'units'}</span>
                                    </div>
                                    <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded">
                                        <span className="text-green-600 dark:text-green-400 font-medium block text-xs text-center">🛒 Quantity to Buy</span>
                                        <div className="flex items-center justify-center gap-2 mt-1">
                                            <Input
                                                type="number"
                                                min="1"
                                                value={quantityToBuy}
                                                onChange={(e) => setQuantityToBuy(Math.max(1, Number(e.target.value)))}
                                                className="w-20 text-center font-bold"
                                            />
                                            <span className="text-sm text-green-600 dark:text-green-400">{request?.unit || 'units'}</span>
                                        </div>
                                        <p className="text-xs text-green-600 dark:text-green-400 mt-1 text-center">
                                            Min: {request?.quantity || 0} (can buy more)
                                        </p>
                                    </div>
                                </div>

                                {/* Extra to Inventory Preview */}
                                {quantityToBuy > (request?.quantity || 0) && (
                                    <div className="p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-purple-600 dark:text-purple-400">📈</span>
                                                <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Extra → Inventory</span>
                                            </div>
                                            <span className="font-bold text-purple-700 dark:text-purple-300">
                                                +{quantityToBuy - (request?.quantity || 0)} {itemInInventory.unit || 'units'}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* New Item - Not in inventory */}
                        {!itemInInventory && canEdit && !isManager && (
                            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-300 dark:border-blue-700 rounded-lg space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                        <span className="font-semibold text-sm text-blue-700 dark:text-blue-300">
                                            New Item - Will be Added to Inventory
                                        </span>
                                    </div>
                                    <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                                        Not in inventory
                                    </span>
                                </div>

                                {/* Quantity Controls */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded text-center">
                                        <span className="text-blue-600 dark:text-blue-400 font-medium block text-xs">🎯 Required</span>
                                        <span className="font-bold text-blue-700 dark:text-blue-300 text-xl">{request?.quantity || 0}</span>
                                        <span className="text-blue-600 dark:text-blue-400 block text-xs">{request?.unit || 'units'}</span>
                                    </div>
                                    <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded">
                                        <span className="text-green-600 dark:text-green-400 font-medium block text-xs text-center">🛒 Quantity to Buy</span>
                                        <div className="flex items-center justify-center gap-2 mt-1">
                                            <Input
                                                type="number"
                                                min="1"
                                                value={quantityToBuy}
                                                onChange={(e) => setQuantityToBuy(Math.max(1, Number(e.target.value)))}
                                                className="w-20 text-center font-bold"
                                            />
                                            <span className="text-sm text-green-600 dark:text-green-400">{request?.unit || 'units'}</span>
                                        </div>
                                        <p className="text-xs text-green-600 dark:text-green-400 mt-1 text-center">
                                            Min: {request?.quantity || 0} (can buy more)
                                        </p>
                                    </div>
                                </div>

                                {/* Extra to Inventory Preview */}
                                {quantityToBuy > (request?.quantity || 0) && (
                                    <div className="p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-purple-600 dark:text-purple-400">📈</span>
                                                <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Extra → Inventory</span>
                                            </div>
                                            <span className="font-bold text-purple-700 dark:text-purple-300">
                                                +{quantityToBuy - (request?.quantity || 0)} {request?.unit || 'units'}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                <div className="p-2 bg-blue-100/50 dark:bg-blue-900/30 rounded text-xs text-blue-600 dark:text-blue-400">
                                    💡 After purchase, this item will be added to inventory with the selected vendor relationship.
                                </div>
                            </div>
                        )}






                        {/* Manager Approval for Mixed Fulfillment */}
                        {isManager && (existingCC?.inventoryFulfillmentQuantity || 0) > 0 && !existingCC?.managerNotes?.includes("Split Fulfillment Approved") && (
                            <div className="space-y-2 pt-1 border-t mt-4">
                                <Button
                                    onClick={async () => {
                                        setIsSaving(true);
                                        try {
                                            await approveSplit({ requestId: activeRequestId });
                                            toast.success("Mixed Fulfillment Approved");
                                        } catch (error: any) {
                                            toast.error("Failed to approve: " + error.message);
                                        } finally {
                                            setIsSaving(false);
                                        }
                                    }}
                                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                                    size="sm"
                                    disabled={isSaving}
                                >
                                    <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                                    Approve Mixed Fulfillment
                                </Button>
                            </div>
                        )}

                        {/* Main Action Buttons */}
                        {canEdit && (
                            <div className="space-y-2 pt-1 border-t mt-4">
                                {/* Auto-save indicator */}
                                {isSaving && (
                                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                                        <div className="h-3 w-3 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                                        Auto-saving...
                                    </div>
                                )}
                                <div className="flex gap-2 justify-end">
                                    <Button
                                        variant="ghost"
                                        onClick={() => onOpenChange(false)}
                                        size="sm"
                                    >
                                        Cancel
                                    </Button>
                                    {isManager && quantityFromInventory > 0 && quantityToBuy > 0 ? (
                                        <Button
                                            onClick={() => setShowSplitApproveConfirm(true)}
                                            disabled={isSaving || isSubmitting}
                                            size="sm"
                                            className="bg-purple-600 hover:bg-purple-700 text-white"
                                        >
                                            <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                                            Confirm Split & Approve
                                        </Button>
                                    ) : (
                                        <Button
                                            onClick={() => setShowSaveConfirm(true)}
                                            disabled={isSaving || isSubmitting}
                                            size="sm"
                                            className="bg-green-600 hover:bg-green-700 text-white"
                                        >
                                            <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                                            Save
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Direct Delivery Confirmation */}
            <AlertDialog open={showDirectDeliveryConfirm} onOpenChange={setShowDirectDeliveryConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Direct Delivery</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will deduct items from inventory and create a delivery record. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDirectDelivery} className="bg-green-600 hover:bg-green-700">
                            Confirm Delivery
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Save/Ready for CC Confirmation */}
            <AlertDialog open={showSaveConfirm} onOpenChange={setShowSaveConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Ready for Cost Comparison?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will save your check details and mark the request as ready for cost comparison.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleCompleteCheck} className="bg-blue-600 hover:bg-blue-700">
                            Confirm & Save
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Manager Split Approval Confirmation */}
            <AlertDialog open={showSplitApproveConfirm} onOpenChange={setShowSplitApproveConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Approve Mixed Fulfillment?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will save the split plan ({quantityFromInventory} from Inventory, {quantityToBuy} to Buy) and immediately approve it for processing.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={async () => {
                                setIsSaving(true);
                                try {
                                    // 1. Save the CC data first
                                    await upsertCC({
                                        requestId: activeRequestId,
                                        vendorQuotes: vendorQuotes,
                                        isDirectDelivery: false,
                                        inventoryFulfillmentQuantity: quantityFromInventory
                                    });

                                    // 2. Approve the split
                                    await approveSplit({ requestId: activeRequestId });

                                    setShowSplitApproveConfirm(false);
                                    onOpenChange(false);
                                    toast.success("Split Plan Saved & Approved");
                                } catch (error: any) {
                                    toast.error("Failed to approve: " + error.message);
                                } finally {
                                    setIsSaving(false);
                                }
                            }}
                            className="bg-purple-600 hover:bg-purple-700"
                        >
                            Confirm & Approve
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
