"use client";

/**
 * Cost Comparison Dialog Component
 * 
 * Dialog for creating/editing cost comparisons with multiple vendor quotes.
 */

import { useState, useEffect, useRef } from "react";
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

interface CostComparisonDialogProps {
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
  perUnitBasis?: number;     // Optional basis for price (e.g. price per 50 units)
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

// Common units for suggestions (expanded list)
const COMMON_UNITS = [
  "bags", "kg", "g", "gm", "ton", "mm", "cm", "m", "km",
  "nos", "pieces", "pcs", "liters", "l", "ml", "sqft", "sqm",
  "cft", "cum", "boxes", "cartons", "bundles", "rolls", "sheets", "units",
];

export function CostComparisonDialog({
  open,
  onOpenChange,
  requestId,
  requestIds,
}: CostComparisonDialogProps) {
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
  // const [quoteGst, setQuoteGst] = useState("");            // GST percentage - Replaced by CGST/SGST
  const [quoteCgst, setQuoteCgst] = useState("9");       // CGST percentage (default 9)
  const [quoteSgst, setQuoteSgst] = useState("9");       // SGST percentage (default 9)
  const [perUnitBasis, setPerUnitBasis] = useState("1");   // Per unit basis for price (e.g. price per 1 unit, or per 50 units) - Hidden in UI now
  const [showVendorDetails, setShowVendorDetails] = useState<string | null>(null);
  const [showDirectDeliveryConfirm, setShowDirectDeliveryConfirm] = useState(false);
  const [showCreateVendorDialog, setShowCreateVendorDialog] = useState(false);
  const [vendorSearchTerm, setVendorSearchTerm] = useState("");
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);
  const [selectedVendorIndex, setSelectedVendorIndex] = useState(-1);
  const [editingQuoteIndex, setEditingQuoteIndex] = useState(-1); // -1 = adding new, >= 0 = editing existing

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
          amount: q.amount,
          unit: q.unit,
          discountPercent: q.discountPercent,
          gstPercent: q.gstPercent,
        }))
      );
      setIsDirectDelivery(existingCC.isDirectDelivery);
      // If there are vendor quotes, user chose external purchase
      setUseInventoryStock(existingCC.vendorQuotes.length === 0);

      // Load saved quantity preferences if available
      if (existingCC.purchaseQuantity) {
        setQuantityToBuy(existingCC.purchaseQuantity);
        // If we have saved purchase quantity, we should trust it for quantityFromVendor too unless we want to recalculate
        // But usually purchaseQuantity >= quantityFromVendor
      }

      if (existingCC.inventoryFulfillmentQuantity) {
        setQuantityFromInventory(existingCC.inventoryFulfillmentQuantity);
      }

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
    // If we have an existing CC with saved quantities, don't overwrite them with defaults
    if (existingCC?.purchaseQuantity || existingCC?.inventoryFulfillmentQuantity) {
      return;
    }

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
  }, [request, itemInInventory, open, existingCC]);

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

    const basis = parseFloat(perUnitBasis) || 1;
    const enteredPrice = parseFloat(unitPrice);

    if (isNaN(enteredPrice) || enteredPrice < 0) {
      toast.error("Please enter a valid unit price");
      return;
    }

    const price = enteredPrice / basis; // Normalize price per 1 unit

    if (editingQuoteIndex === -1 && vendorQuotes.some((q) => q.vendorId === selectedVendorId)) {
      toast.error("This vendor is already added");
      return;
    }

    const amount = parseFloat(quoteAmount) || 1;
    const unit = quoteUnit.trim() || request?.unit || itemInInventory?.unit || "units";
    const discount = parseFloat(quoteDiscount) || 0;
    // GST is now sum of CGST and SGST
    const cgst = parseFloat(quoteCgst) || 0;
    const sgst = parseFloat(quoteSgst) || 0;
    const gst = cgst + sgst;

    if (discount < 0 || discount > 100) {
      toast.error("Discount must be between 0% and 100%");
      return;
    }

    if (cgst < 0 || cgst > 100 || sgst < 0 || sgst > 100) {
      toast.error("Tax percentages must be between 0% and 100%");
      return;
    }

    const newQuote: VendorQuote = {
      vendorId: selectedVendorId as Id<"vendors">,
      unitPrice: price,
      amount: amount,
      unit: unit,
      discountPercent: discount > 0 ? discount : undefined,
      gstPercent: gst > 0 ? gst : undefined,
      perUnitBasis: basis,
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
    const defaultUnit = request?.unit || itemInInventory?.unit || "units";
    setQuoteUnit(defaultUnit);

    setQuoteDiscount("");
    setQuoteCgst("9"); // Reset to 9
    setQuoteSgst("9"); // Reset to 9
    // setQuoteGst("");
    setEditingQuoteIndex(-1);
    setVendorSearchTerm("");
    setVendorDialogOpen(false);
  };

  // Get related units based on selected item's unit
  const getRelatedUnits = (itemUnit: string): string[] => {
    if (!itemUnit) return [];
    const cleanedUnit = itemUnit.replace(/\d+/g, '').trim();
    if (!cleanedUnit) return [];
    const unit = cleanedUnit.toLowerCase();

    if (unit === "kg" || unit === "kilogram" || unit === "kilograms") return ["kg", "gm", "g", "ton", "quintal"];
    if (unit === "g" || unit === "gm" || unit === "gram" || unit === "grams") return ["g", "gm", "kg"];
    if (unit === "ton" || unit === "tonne") return ["ton", "kg", "quintal"];
    if (unit === "m" || unit === "meter" || unit === "meters" || unit === "metre" || unit === "metres") return ["m", "cm", "mm", "km", "ft", "inch"];
    if (unit === "cm" || unit === "centimeter") return ["cm", "mm", "m", "inch"];
    if (unit === "mm" || unit === "millimeter") return ["mm", "cm", "m"];
    if (unit === "ft" || unit === "feet" || unit === "foot") return ["ft", "inch", "m", "cm"];
    if (unit === "l" || unit === "liter" || unit === "liters" || unit === "litre") return ["l", "ml", "cft", "cum"];
    if (unit === "ml" || unit === "milliliter") return ["ml", "l"];
    if (unit === "cft") return ["cft", "cum", "l"];
    if (unit === "cum") return ["cum", "cft", "l"];
    if (unit === "sqft") return ["sqft", "sqm", "acre"];
    if (unit === "sqm") return ["sqm", "sqft", "acre"];
    if (unit === "nos" || unit === "number" || unit === "numbers") return ["nos", "pcs", "pieces", "units"];
    if (unit === "pcs" || unit === "pieces" || unit === "piece") return ["pcs", "pieces", "nos", "units"];
    if (unit === "units" || unit === "unit") return ["units", "nos", "pcs", "pieces"];
    if (unit === "bags" || unit === "bag") return ["bags", "kg", "ton"];
    if (unit === "boxes" || unit === "box") return ["boxes", "cartons", "nos", "pcs"];
    if (unit === "cartons" || unit === "carton") return ["cartons", "boxes", "nos"];
    if (unit === "bundles" || unit === "bundle") return ["bundles", "nos", "pcs"];
    if (unit === "rolls" || unit === "roll") return ["rolls", "nos", "m", "ft"];
    if (unit === "sheets" || unit === "sheet") return ["sheets", "nos", "sqft", "sqm"];

    return [unit, ...COMMON_UNITS.filter(u => u !== unit).slice(0, 5)];
  };




  // Edit vendor quote - populate form with existing data
  const handleEditQuote = (index: number) => {
    const quote = vendorQuotes[index];
    if (!quote) return;

    setEditingQuoteIndex(index);
    setSelectedVendorId(quote.vendorId);
    setVendorSearchTerm(getVendorName(quote.vendorId));
    setPerUnitBasis((quote.perUnitBasis || 1).toString());
    setUnitPrice((quote.unitPrice * (quote.perUnitBasis || 1)).toString());
    setQuoteAmount((quote.amount || 1).toString());
    setQuoteUnit(quote.unit || "");

    setQuoteDiscount(quote.discountPercent?.toString() || "");
    // Split GST back into CGST/SGST (assuming equal split if persisted as total)
    // If backend supports separate fields, ideally use them. Here we'll just split existing total.
    const totalGst = quote.gstPercent || 0;
    setQuoteCgst((totalGst / 2).toString());
    setQuoteSgst((totalGst / 2).toString());
    // setQuoteGst(quote.gstPercent?.toString() || "");
    setVendorDialogOpen(true);
  };

  // Remove vendor quote
  const handleRemoveVendor = (vendorId: Id<"vendors">) => {
    const newQuotes = vendorQuotes.filter((q) => q.vendorId !== vendorId);
    setVendorQuotes(newQuotes);
    toast.success("Quote removed");
    // Save immediately if there are still quotes
    handleSave(true, newQuotes);
  };

  // Save cost comparison (silent mode for auto-save, accepts quotes parameter for immediate save)
  const handleSave = async (silent: boolean = false, quotesToSave?: VendorQuote[]) => {
    const quotes = quotesToSave || vendorQuotes;

    setIsSaving(true);
    try {
      await upsertCC({
        requestId: activeRequestId,
        vendorQuotes: quotes,
        isDirectDelivery,
        purchaseQuantity: quantityToBuy,
        inventoryFulfillmentQuantity: quantityFromInventory,
      });
      if (!silent) toast.success("Cost comparison saved");
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

  // Submit for approval
  const handleSubmit = async () => {
    if (vendorQuotes.length === 0) {
      toast.error("Please add at least one vendor quote");
      return;
    }

    setIsSubmitting(true);
    try {
      if (existingCC?.status === "cc_rejected") {
        await resubmitCC({
          requestId: activeRequestId,
          vendorQuotes,
          isDirectDelivery,
        });
        toast.success("Cost comparison resubmitted");
      } else {
        await handleSave();
        await submitCC({ requestId: activeRequestId });
        toast.success("Cost comparison submitted");
      }
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to submit");
    } finally {
      setIsSubmitting(false);
    }
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

  // Helper for determining best price (memoized calculation for render)
  const calculatedTotals = vendorQuotes.map(q => calculateQuoteTotal(q, request?.quantity || 0));


  // Item edit handlers
  const handleStartEditItem = () => {
    setIsEditingItem(true);
    setEditQuantity(request?.quantity.toString() || "");
    setEditUnit(request?.unit || itemInInventory?.unit || "");
    setEditDescription(request?.description || "");
    setEditItemName(request?.itemName || "");
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
  /* Unit autocomplete handlers */
  const getFilteredUnitSuggestions = (input: string) => {
    // If we have a current unit, try to suggest related units first
    const currentUnit = request?.unit || itemInInventory?.unit || "";
    if (currentUnit) {
      const related = getRelatedUnits(currentUnit);
      if (related.length > 0) {
        // If input is empty, show related units. If not, filter related units + common units
        if (!input.trim()) return related.slice(0, 8);
        return Array.from(new Set([...related, ...COMMON_UNITS])).filter(u =>
          u.toLowerCase().includes(input.toLowerCase())
        ).slice(0, 8);
      }
    }

    // Fallback if no specific context
    if (!input.trim()) return UNIT_SUGGESTIONS.slice(0, 8);
    return UNIT_SUGGESTIONS.filter(unit =>
      unit.toLowerCase().includes(input.toLowerCase())
    ).slice(0, 8);
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
      setEditUnit(suggestions[selectedUnitIndex] || editUnit);
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

  const canEdit = existingCC?.status === "draft" || existingCC?.status === "cc_rejected" || !existingCC;
  const isSubmitted = existingCC?.status === "cc_pending";
  const isManagerReview = isManager && isSubmitted;

  // Check if inventory data is still loading
  const isInventoryLoading = inventoryItems === undefined;

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
          status: "ready_for_delivery",
        });
        toast.success(
          `Request moved to Ready for Delivery! ${deliveryQuantity} ${request.unit || 'units'} deducted from inventory. ` +
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
        <DialogContent className="max-w-3xl w-[95vw] max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="pb-4 border-b">
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight">Cost Comparison</DialogTitle>
                <DialogDescription className="text-sm mt-1 flex items-center gap-2">
                  <span className="font-medium text-foreground">{request?.requestNumber}</span>
                  <span className="text-muted-foreground">•</span>
                  <span>{request?.itemName}</span>
                </DialogDescription>
              </div>
              <Badge variant={
                request?.status === "delivered" ? "default" :
                  (request?.status === "rejected" || request?.status === "rejected_po" || request?.status === "cc_rejected") ? "destructive" :
                    "outline"
              }>
                {request?.status?.replace("_", " ") || "Pending"}
              </Badge>
            </div>

            {/* CC Navigation Tabs - shown when there are multiple CCs */}
            {hasMultipleCCs && (
              <div className="flex items-center gap-2 pt-3 mt-1">
                <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
                  {ccRequestIds.map((_, index) => (
                    <Button
                      key={index}
                      variant={currentCCIndex === index ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setCurrentCCIndex(index)}
                      className={`h-7 px-3 text-xs font-medium rounded-md transition-all ${currentCCIndex === index
                        ? "shadow-sm"
                        : "hover:bg-background/50"
                        }`}
                    >
                      Item {index + 1}
                    </Button>
                  ))}
                </div>
                <span className="text-xs text-muted-foreground ml-2">
                  Viewing {currentCCIndex + 1} of {ccRequestIds.length} items
                </span>
              </div>
            )}
          </DialogHeader>

          <div className="space-y-3 flex-1 overflow-y-auto overflow-x-hidden pr-1">
            {/* Item Information Card - Compact & Clean */}
            {request && (
              <div className="bg-muted/10 rounded-xl border border-border/50 overflow-hidden">
                <div className="bg-card px-5 py-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-sm flex items-center gap-2 text-primary">
                      <Package className="h-4 w-4" />
                      Item Details
                    </h4>
                    {canEdit && !isManager && !isEditingItem && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleStartEditItem}
                        className="h-7 w-7 p-0 hover:bg-muted text-muted-foreground"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    {isEditingItem && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleSaveItemDetails}
                          disabled={isUpdatingItem}
                          className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCancelEditItem}
                          disabled={isUpdatingItem}
                          className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                    {/* Item Name */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Item Name</span>
                      {isEditingItem ? (
                        <div className="relative">
                          <Input
                            type="text"
                            value={editItemName}
                            onChange={(e) => handleItemNameInputChange(e.target.value)}
                            onKeyDown={handleItemNameKeyDown}
                            onFocus={handleItemNameFocus}
                            onBlur={handleItemNameBlur}
                            placeholder="Enter item name..."
                            className="text-sm h-8"
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
                        <p className="font-medium text-base truncate pr-4" title={request.itemName}>{request.itemName}</p>
                      )}
                    </div>

                    {/* Quantity & Unit */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Quantity</span>
                      {isEditingItem ? (
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            min="1"
                            step="any"
                            value={editQuantity}
                            onChange={(e) => setEditQuantity(e.target.value)}
                            className="h-8 text-sm w-24"
                            disabled={isUpdatingItem}
                            placeholder="Qty"
                          />
                          <div className="relative flex-1">
                            <Input
                              type="text"
                              placeholder="Unit"
                              value={editUnit}
                              onChange={(e) => handleUnitInputChange(e.target.value)}
                              onKeyDown={handleUnitKeyDown}
                              onFocus={handleUnitFocus}
                              onBlur={handleUnitBlur}
                              className="h-8 text-sm"
                              disabled={isUpdatingItem}
                            />
                            {showUnitSuggestions && getFilteredUnitSuggestions(editUnit).length > 0 && (
                              <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border border-border rounded-md shadow-lg max-h-40 overflow-y-auto w-full min-w-[100px]">
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
                        </div>
                      ) : (
                        <div className="flex items-baseline gap-1.5">
                          <p className="font-bold text-lg tabular-nums">{request.quantity}</p>
                          <p className="text-sm text-muted-foreground font-medium">{request.unit || itemInInventory?.unit || 'units'}</p>
                        </div>
                      )}
                    </div>

                    {/* Description - Full Grid Width */}
                    {(request.description || isEditingItem) && (
                      <div className="md:col-span-2 space-y-1.5 pt-2 border-t border-dashed">
                        <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Description</span>
                        {isEditingItem ? (
                          <Textarea
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            placeholder="Enter item description..."
                            className="mt-1 text-sm min-h-[60px]"
                            disabled={isUpdatingItem}
                          />
                        ) : (
                          <p className="text-sm text-muted-foreground/90 leading-relaxed bg-muted/20 p-2.5 rounded-md border border-border/40">
                            {request.description}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {!isEditingItem && (
                    <div className="mt-4 flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setInventoryInfoOpen(true)}
                        className="text-xs h-7 gap-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30"
                      >
                        <Info className="h-3.5 w-3.5" />
                        View Inventory Details
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}


            {/* Loading Indicator for Inventory Data */}
            {isInventoryLoading && canEdit && !isSubmitted && !isManager && (
              <div className="p-4 bg-muted/50 border border-border/60 rounded-lg animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-muted rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Loading inventory status...</p>
              </div>
            )}



            {/* Rejection Notes */}
            {existingCC?.status === "cc_rejected" && (
              <div className="p-2 bg-destructive/10 border border-destructive/20 rounded text-xs">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <span className="font-semibold text-destructive">Rejected: </span>
                    <span className="text-muted-foreground">{existingCC.managerNotes || "No reason provided."}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Vendor Quotes - Show always to allow comparison even if stock exists */}
            {(canEdit || isManagerReview) && (
              <div className="space-y-4 pt-2 border-t mt-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Building className="h-4 w-4 text-primary" />
                    {isManagerReview ? "Select Final Vendor" : "Vendor Quotes"}
                  </h3>
                  {/* Create/Add Vendor Button */}
                  {canEdit && !isManagerReview && vendorQuotes.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setQuoteAmount((quantityToBuy || request?.quantity || 0).toString());
                        const bestUnit = itemInInventory?.unit || request?.unit || "";
                        if (bestUnit) setQuoteUnit(bestUnit);
                        setVendorDialogOpen(true);
                      }}
                      className="h-8 gap-1 border-dashed border-2 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Quote
                    </Button>
                  )}
                </div>

                {/* Quantity Analysis Summary - Visible for Manager review OR when quotes exist */}
                {request && (isManagerReview || vendorQuotes.length > 0) && (
                  <div className="mb-4 p-3 bg-muted/40 border border-border/60 rounded-lg flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Requested</span>
                        <span className="font-medium">{request.quantity} {request.unit}</span>
                      </div>
                      <div className="h-8 w-px bg-border/60"></div>
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">To Buy</span>
                        <span className="font-medium text-blue-600 dark:text-blue-400">
                          {existingCC?.purchaseQuantity || quantityToBuy || vendorQuotes[0]?.amount || request.quantity} {request.unit}
                        </span>
                      </div>
                      {((existingCC?.purchaseQuantity || quantityToBuy || vendorQuotes[0]?.amount || 0) > request.quantity) && (
                        <>
                          <div className="h-8 w-px bg-border/60"></div>
                          <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Extra → Inventory</span>
                            <span className="font-bold text-green-600 dark:text-green-400">
                              +{((existingCC?.purchaseQuantity || quantityToBuy || vendorQuotes[0]?.amount || 0) - request.quantity).toFixed(2).replace(/\.00$/, '')} {request.unit}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Empty State / Add First Vendor Button */}
                {vendorQuotes.length === 0 && canEdit && !isManagerReview && (
                  <button
                    onClick={() => {
                      setQuoteAmount((quantityToBuy || request?.quantity || 0).toString());
                      const bestUnit = itemInInventory?.unit || request?.unit || "";
                      if (bestUnit) setQuoteUnit(bestUnit);
                      setVendorDialogOpen(true);
                    }}
                    className="w-full flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg border-muted-foreground/20 hover:border-primary/50 hover:bg-muted/30 transition-all group cursor-pointer"
                  >
                    <div className="h-10 w-10 bg-muted rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform group-hover:bg-primary/10">
                      <Plus className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                    </div>
                    <h4 className="font-medium text-foreground group-hover:text-primary">Add Vendor Quote</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      No quotes added yet. Add at least 2 quotes for comparison.
                    </p>
                  </button>
                )}

                {/* Empty State Text for Viewers */}
                {vendorQuotes.length === 0 && (!canEdit || isManagerReview) && (
                  <div className="text-xs text-muted-foreground text-center py-6 border rounded-lg bg-muted/30">
                    <p>No vendor quotes available.</p>
                  </div>
                )}

                {vendorQuotes.length > 0 && (
                  <div className="space-y-4">


                    {/* Quotes Grid */}
                    <div className="grid grid-cols-1 gap-3">
                      {vendorQuotes.map((quote, index) => {
                        // Determine if this is the best price
                        const isBestPrice = index === 0 && vendorQuotes.length > 1 &&
                          (calculateQuoteTotal(vendorQuotes[0], request?.quantity || 0) < calculateQuoteTotal(vendorQuotes[1], request?.quantity || 0) ||
                            (vendorQuotes.every((q, i) => i === 0 || calculateQuoteTotal(q, request?.quantity || 0) >= calculateQuoteTotal(quote, request?.quantity || 0))));

                        const totalAmount = calculateQuoteTotal(quote, request?.quantity || 0);

                        return (
                          <div
                            key={quote.vendorId}
                            className={`relative group bg-card border rounded-lg p-4 transition-all duration-200 ${isManagerReview && selectedFinalVendor === quote.vendorId
                              ? "border-primary ring-1 ring-primary shadow-md bg-primary/5"
                              : "hover:border-primary/50 hover:shadow-sm"
                              } ${isBestPrice && !isManagerReview ? "border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-950/10" : ""}`}
                            onClick={isManagerReview ? () => setSelectedFinalVendor(prev => prev === quote.vendorId ? "" : quote.vendorId) : undefined}
                          >
                            {/* Best Price Badge */}
                            {isBestPrice && (
                              <div className="absolute -top-2.5 right-4 px-2 py-0.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-[10px] font-bold uppercase tracking-wide rounded-full border border-green-200 dark:border-green-800 shadow-sm flex items-center gap-1">
                                <span className="text-xs">★</span> Best Price
                              </div>
                            )}

                            {/* Card Content */}
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                {/* Header */}
                                <div className="flex items-center gap-2 mb-2">
                                  {isManagerReview && (
                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${selectedFinalVendor === quote.vendorId ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground"}`}>
                                      {selectedFinalVendor === quote.vendorId && <Check className="w-2.5 h-2.5" />}
                                    </div>
                                  )}
                                  <h4 className="font-semibold text-lg truncate text-foreground">{getVendorName(quote.vendorId)}</h4>
                                </div>

                                {/* Details Stack - One item per row */}
                                <div className="space-y-1 text-sm">
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground w-20">Quantity:</span>
                                    <span className="font-medium text-foreground">{quote.amount || 1} {quote.unit || 'units'}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground w-20">Price:</span>
                                    <span className="font-medium">
                                      ₹{(quote.unitPrice * (quote.perUnitBasis || 1)).toFixed(2)} / {quote.perUnitBasis || 1} {quote.unit || 'unit'}
                                    </span>
                                  </div>

                                  {(quote.discountPercent || 0) > 0 && (
                                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                                      <span className="w-20">Discount:</span>
                                      <span className="font-medium">-{quote.discountPercent}%</span>
                                    </div>
                                  )}

                                  {(quote.gstPercent || 0) > 0 && (
                                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                                      <span className="w-20">GST:</span>
                                      <span className="font-medium">+{quote.gstPercent}%</span>
                                    </div>
                                  )}

                                  <div className="flex items-center gap-2 pt-1 mt-1 border-t border-dashed border-muted-foreground/30">
                                    <span className="text-muted-foreground w-20 font-medium">Net Price:</span>
                                    <span className="font-semibold text-foreground">
                                      ₹{calculateFinalPrice(quote.unitPrice * (quote.perUnitBasis || 1), quote.discountPercent, quote.gstPercent).toFixed(2)} / {quote.perUnitBasis || 1} {quote.unit || 'unit'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Total & Actions */}
                              <div className="flex flex-col items-end justify-between h-full gap-4">
                                <div className="text-right bg-muted/30 p-2 rounded-lg border border-border/50">
                                  <p className="text-xs text-muted-foreground mb-0.5 font-medium uppercase tracking-wider">Total Amount</p>
                                  <p className="text-xl font-bold tracking-tight text-primary">₹{totalAmount.toFixed(2)}</p>
                                </div>

                                {canEdit && !isManagerReview && (
                                  <div className="flex items-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditQuote(index);
                                      }}
                                      className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                                      title="Edit quote"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveVendor(quote.vendorId);
                                      }}
                                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                      title="Remove quote"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Cost Savings Recommendation */}
                    {vendorQuotes.length >= 2 && (
                      <div className="mt-4 p-3 bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-800 rounded-lg">
                        {(() => {
                          // Sort by final calculated price
                          const sortedQuotes = [...vendorQuotes].sort((a, b) =>
                            calculateQuoteTotal(a, request?.quantity || 0) - calculateQuoteTotal(b, request?.quantity || 0)
                          );
                          const bestQuote = sortedQuotes[0];
                          const nextBestQuote = sortedQuotes[1];
                          const bestVendor = getVendorName(bestQuote.vendorId);
                          const bestTotal = calculateQuoteTotal(bestQuote, request?.quantity || 0);
                          const nextTotal = calculateQuoteTotal(nextBestQuote, request?.quantity || 0);
                          const totalSavings = nextTotal - bestTotal;

                          // If difference is negligible
                          if (totalSavings < 0.01) {
                            return (
                              <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span>Best vendors have similar pricing. Choose based on reliability.</span>
                              </div>
                            );
                          }

                          return (
                            <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                              <span className="shrink-0 text-lg">💡</span>
                              <span>
                                <span className="font-bold">{bestVendor}</span> is best. Save <span className="font-bold">₹{totalSavings.toFixed(2)}</span>.
                              </span>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Manager Review Actions */}
            {isManagerReview && (
              <div className="mt-4 pt-4 border-t border-border/60">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Manager Decision Notes
                      </Label>
                      <span className="text-[10px] text-muted-foreground italic">
                        Required for rejection
                      </span>
                    </div>
                    <Textarea
                      placeholder="Add approval notes or rejection reason..."
                      value={managerNotes}
                      onChange={(e) => setManagerNotes(e.target.value)}
                      className="min-h-[80px] w-full text-sm resize-none bg-muted/20 focus:bg-background transition-all border-muted-foreground/20 focus:border-primary/50"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button
                      variant="ghost"
                      onClick={async () => {
                        if (!managerNotes.trim()) {
                          toast.error("Please provide a reason for rejection");
                          return;
                        }

                        setIsReviewing(true);
                        try {
                          await reviewCC({
                            requestId,
                            action: "reject",
                            notes: managerNotes.trim(),
                          });
                          toast.success("Cost comparison rejected");
                          onOpenChange(false);
                        } catch (error: any) {
                          toast.error(error.message || "Failed to reject");
                        } finally {
                          setIsReviewing(false);
                        }
                      }}
                      disabled={isReviewing}
                      size="sm"
                      className="flex-1 text-destructive hover:bg-destructive/10 hover:text-destructive border border-transparent hover:border-destructive/20 transition-all font-medium"
                    >
                      <X className="h-4 w-4 mr-1.5" />
                      Reject
                    </Button>
                    <Button
                      onClick={async () => {
                        if (!selectedFinalVendor) {
                          toast.error("Please select a final vendor");
                          return;
                        }
                        setIsReviewing(true);
                        try {
                          await reviewCC({
                            requestId,
                            action: "approve",
                            selectedVendorId: selectedFinalVendor as Id<"vendors">,
                            notes: managerNotes.trim() || undefined,
                          });
                          toast.success("Cost comparison approved");
                          onOpenChange(false);
                        } catch (error: any) {
                          toast.error(error.message || "Failed to approve");
                        } finally {
                          setIsReviewing(false);
                        }
                      }}
                      disabled={isReviewing || !selectedFinalVendor}
                      size="sm"
                      className="flex-[2] bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm hover:shadow transition-all font-medium"
                    >
                      <CheckCircle className="h-4 w-4 mr-1.5" />
                      Approve & Select Vendor
                    </Button>
                  </div>
                </div>
              </div>
            )
            }

            {/* Purchase Officer Actions - Only show vendor workflow when insufficient inventory */}
            {
              canEdit && !isSubmitted && !isManager && (
                <div className="space-y-2 pt-4 border-t mt-2">
                  {/* Auto-save indicator */}
                  {isSaving && (
                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mb-2">
                      <div className="h-3 w-3 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                      Auto-saving...
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => onOpenChange(false)}
                      className="flex-1"
                      size="sm"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={isSaving || isSubmitting || vendorQuotes.length < 2}
                      size="sm"
                      className="flex-1"
                    >
                      <Send className="h-3.5 w-3.5 mr-1.5" />
                      {existingCC?.status === "cc_rejected" ? "Resubmit" : "Submit for Approval"}
                    </Button>
                  </div>
                </div>
              )
            }

            {
              isSubmitted && !isManagerReview && (
                <p className="text-xs text-muted-foreground text-center py-4 border-t mt-2">
                  Submitted for manager approval
                </p>
              )
            }
          </div></DialogContent>
      </Dialog>

      {/* Simplified Vendor Selection Dialog */}
      <Dialog open={vendorDialogOpen && canEdit} onOpenChange={(open) => {
        if (canEdit) {
          setVendorDialogOpen(open);
          // Reset form when closing
          if (!open) {
            setSelectedVendorId("");
            setUnitPrice("");
            setQuoteAmount("1");
            const defaultUnit = request?.unit || itemInInventory?.unit || "";
            setQuoteUnit(defaultUnit);
            setPerUnitBasis("1");

            setShowVendorDetails(null);
            setShowCreateVendorDialog(false);
            setVendorSearchTerm("");
            setShowVendorDropdown(false);
            setSelectedVendorIndex(-1);
            setShowUnitSuggestions(false);
            setSelectedUnitIndex(-1);
          }
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingQuoteIndex >= 0 ? 'Edit Vendor Quote' : 'Add Vendor Quote'}</DialogTitle>

          </DialogHeader>

          {/* Auto-fill quote amount from quantityToBuy when adding new quote */}
          {useEffect(() => {
            if (vendorDialogOpen && editingQuoteIndex === -1) {
              setQuoteAmount(quantityToBuy.toString());
              // Also ensure unit is synced with current preference
              const bestUnit = itemInInventory?.unit || request?.unit || "";
              if (bestUnit) setQuoteUnit(bestUnit);
            }
          }, [vendorDialogOpen, editingQuoteIndex, quantityToBuy, itemInInventory, request]) as unknown as React.ReactNode}

          <div className="space-y-3">
            {/* Vendor Selection Row */}
            <div className="space-y-1">
              <Label className="text-sm font-medium">Vendor<span className="text-red-500">*</span></Label>
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="Search and select vendor..."
                      value={vendorSearchTerm}
                      onChange={(e) => {
                        setVendorSearchTerm(e.target.value);
                        setShowVendorDropdown(true);
                      }}
                      onKeyDown={(e) => {
                        const suggestions = vendorSearchTerm.trim() ? [
                          ...filteredVendors,
                          { _id: 'create', companyName: `Create "${vendorSearchTerm}" as new vendor` }
                        ] : filteredVendors;

                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          setSelectedVendorIndex(prev =>
                            prev < suggestions.length - 1 ? prev + 1 : prev
                          );
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          setSelectedVendorIndex(prev => prev > 0 ? prev - 1 : -1);
                        } else if (e.key === 'Enter' && selectedVendorIndex >= 0) {
                          e.preventDefault();
                          const selected = suggestions[selectedVendorIndex];
                          if (selected._id === 'create') {
                            setShowCreateVendorDialog(true);
                            setShowVendorDropdown(false);
                          } else {
                            setSelectedVendorId(selected._id as Id<"vendors">);
                            setVendorSearchTerm(selected.companyName);
                            setShowVendorDropdown(false);
                          }
                          setSelectedVendorIndex(-1);
                        } else if (e.key === 'Escape') {
                          setShowVendorDropdown(false);
                          setSelectedVendorIndex(-1);
                        }
                      }}
                      className="text-sm pr-9"
                      onFocus={() => setShowVendorDropdown(true)}
                      onBlur={() => setTimeout(() => setShowVendorDropdown(false), 200)}
                      required
                      autoFocus={editingQuoteIndex === -1}
                    />
                    {vendorSearchTerm && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setVendorSearchTerm("");
                          setSelectedVendorId("");
                        }}
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent text-muted-foreground hover:text-foreground"
                        title="Clear vendor selection"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {showVendorDropdown && (
                    <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border border-border rounded-md shadow-lg max-h-40 overflow-y-auto">
                      {filteredVendors.length > 0 ? (
                        filteredVendors.map((vendor, index) => (
                          <div
                            key={vendor._id}
                            onClick={() => {
                              setSelectedVendorId(vendor._id);
                              setVendorSearchTerm(vendor.companyName);
                              setShowVendorDropdown(false);
                            }}
                            className={`w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors flex items-center justify-between cursor-pointer ${index === selectedVendorIndex ? 'bg-muted' : ''
                              }`}
                          >
                            <span>{vendor.companyName}</span>
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowVendorDetails(vendor._id);
                              }}
                              className="opacity-60 hover:opacity-100 p-1 rounded"
                            >
                              <Info className="h-3 w-3" />
                            </div>
                          </div>
                        ))
                      ) : vendorSearchTerm.trim() ? (
                        <div
                          onClick={() => {
                            setShowCreateVendorDialog(true);
                            setShowVendorDropdown(false);
                          }}
                          className={`w-full px-3 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors cursor-pointer ${filteredVendors.length === selectedVendorIndex ? 'bg-blue-50 dark:bg-blue-950/50' : ''
                            }`}
                        >
                          <Plus className="h-3 w-3 inline mr-1" />
                          Create "{vendorSearchTerm}" as new vendor
                        </div>
                      ) : (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                          No vendors available
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowCreateVendorDialog(true)}
                  className="h-9 w-9 shrink-0"
                  title="Add new vendor"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Total Quantity and Unit Row */}
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Total Quantity <span className="text-red-500">*</span></Label>
              <Input
                type="number"
                min="0"
                step="any"
                value={quoteAmount}
                onChange={(e) => setQuoteAmount(e.target.value)}
                placeholder="Qty"
                className="text-sm border-2 hover:border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                required
              />
            </div>

            <div className="space-y-1">
              <Label className="text-sm font-medium">Unit <span className="text-red-500">*</span></Label>
              <div className="relative">
                <Input
                  type="text"
                  value={quoteUnit}
                  onChange={(e) => handleQuoteUnitInputChange(e.target.value)}
                  onKeyDown={handleQuoteUnitKeyDown}
                  onFocus={handleQuoteUnitFocus}
                  onBlur={handleQuoteUnitBlur}
                  placeholder="e.g. kg"
                  autoComplete="off"
                  className="text-sm border-2 hover:border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                  required
                />
                {showUnitSuggestions && (
                  <div className="absolute top-full left-0 right-0 z-[100] mt-1 bg-popover text-popover-foreground shadow-xl rounded-md border ring-1 ring-border/50 max-h-[200px] overflow-y-auto overflow-x-hidden animate-in fade-in-0 zoom-in-95 duration-100">
                    {getFilteredUnitSuggestionsForQuote(quoteUnit).length > 0 ? (
                      <div className="p-1">
                        {getFilteredUnitSuggestionsForQuote(quoteUnit).map((suggestion, index) => (
                          <div
                            key={suggestion}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleQuoteUnitSuggestionClick(suggestion);
                            }}
                            className={`px-3 py-2 text-sm rounded-sm cursor-pointer transition-colors flex items-center justify-between ${selectedUnitIndex === index
                              ? "bg-accent text-accent-foreground font-medium"
                              : "hover:bg-muted/80 text-foreground/80"
                              }`}
                          >
                            <span>{suggestion}</span>
                            {selectedUnitIndex === index && (
                              <Check className="h-3.5 w-3.5 opacity-70" />
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 text-xs text-muted-foreground text-center italic">
                        Use "{quoteUnit}" as custom unit
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Price and Discount Row */}
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Price (₹) <span className="text-red-500">*</span></Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                placeholder="0.00"
                className="text-sm font-semibold border-2 hover:border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                required
                autoFocus={editingQuoteIndex >= 0}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-sm font-medium">Discount %</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={quoteDiscount}
                onChange={(e) => setQuoteDiscount(e.target.value)}
                placeholder="0"
                className="text-sm"
              />
            </div>
          </div>

          <div className="space-y-3 mt-3">
            <div className="flex items-center gap-2 p-1">
              <Checkbox
                id="gst-toggle"
                checked={parseFloat(quoteCgst || "0") === 9 && parseFloat(quoteSgst || "0") === 9}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setQuoteCgst("9");
                    setQuoteSgst("9");
                  } else {
                    setQuoteCgst("0");
                    setQuoteSgst("0");
                  }
                }}
              />
              <Label htmlFor="gst-toggle" className="text-sm font-medium cursor-pointer">
                Auto Apply 18% GST
              </Label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-sm font-medium">CGST %</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={quoteCgst}
                  onChange={(e) => setQuoteCgst(e.target.value)}
                  placeholder="0"
                  className="text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium">SGST %</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={quoteSgst}
                  onChange={(e) => setQuoteSgst(e.target.value)}
                  placeholder="0"
                  className="text-sm"
                />
              </div>
            </div>
          </div>

          {/* Price Calculation Preview */}
          {unitPrice && (
            <div className="p-3 bg-muted/50 rounded-lg space-y-2 mt-4">
              <p className="text-xs font-medium text-muted-foreground">Price Calculation Preview</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Price per {quoteUnit || 'unit'}:</span>
                  <span className="font-medium">₹{(parseFloat(unitPrice || "0") / (parseFloat(perUnitBasis || "1"))).toFixed(2)}</span>
                </div>
                {parseFloat(quoteDiscount || "0") > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount ({quoteDiscount}%):</span>
                    <span>-₹{((parseFloat(unitPrice || "0") / (parseFloat(perUnitBasis || "1"))) * parseFloat(quoteDiscount || "0") / 100).toFixed(2)}</span>
                  </div>
                )}
                {parseFloat(quoteDiscount || "0") > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Price after Discount:</span>
                    <span className="font-medium">₹{calculatePriceAfterDiscount((parseFloat(unitPrice || "0") / (parseFloat(perUnitBasis || "1"))), parseFloat(quoteDiscount || "0")).toFixed(2)}</span>
                  </div>
                )}
                {(parseFloat(quoteCgst || "0") + parseFloat(quoteSgst || "0")) > 0 && (
                  <div className="flex justify-between text-amber-600">
                    <span>Tax ({(parseFloat(quoteCgst || "0") + parseFloat(quoteSgst || "0"))}%):</span>
                    <span>+₹{calculateGstAmount(calculatePriceAfterDiscount((parseFloat(unitPrice || "0") / (parseFloat(perUnitBasis || "1"))), parseFloat(quoteDiscount || "0")), (parseFloat(quoteCgst || "0") + parseFloat(quoteSgst || "0"))).toFixed(2)}</span>
                  </div>
                )}
              </div>
              <div className="flex justify-between pt-2 border-t border-muted-foreground/20">
                <span className="font-semibold">Final Price per {quoteUnit || 'unit'}:</span>
                <span className="font-bold text-primary">
                  ₹{calculateFinalPrice((parseFloat(unitPrice || "0") / (parseFloat(perUnitBasis || "1"))), parseFloat(quoteDiscount || "0"), (parseFloat(quoteCgst || "0") + parseFloat(quoteSgst || "0"))).toFixed(2)}
                </span>
              </div>

              {/* Total Amount Preview based on Quantity */}
              <div className="flex justify-between pt-2 border-t-2 border-dashed border-muted-foreground/20 mt-1">
                <span className="font-bold text-lg">Total Amount ({quoteAmount || 0} {quoteUnit || 'units'}):</span>
                <span className="font-bold text-xl text-primary">
                  ₹{(calculateFinalPrice((parseFloat(unitPrice || "0") / (parseFloat(perUnitBasis || "1"))), parseFloat(quoteDiscount || "0"), (parseFloat(quoteCgst || "0") + parseFloat(quoteSgst || "0"))) * (parseFloat(quoteAmount) || 0)).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t mt-4">
            <Button variant="outline" onClick={() => {
              setVendorDialogOpen(false);
              setEditingQuoteIndex(-1);
              setSelectedVendorId("");
              setUnitPrice("");
              setQuoteAmount("1");
              setQuoteUnit("");

              setQuoteDiscount("");
              setQuoteCgst("9");
              setQuoteSgst("9");
              setVendorSearchTerm("");
            }}>
              Cancel
            </Button>
            <Button
              onClick={handleAddVendor}
              disabled={!selectedVendorId || !unitPrice}
            >
              {editingQuoteIndex >= 0 ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Update Quote
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Quote
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Vendor Dialog */}
      <Dialog open={showCreateVendorDialog} onOpenChange={setShowCreateVendorDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Vendor</DialogTitle>
            <DialogDescription>
              Add a new vendor for this quote.
            </DialogDescription>
          </DialogHeader>

          <VendorCreationForm
            onVendorCreated={(vendorId) => {
              const newVendor = vendors?.find(v => v._id === vendorId);
              if (newVendor) {
                setSelectedVendorId(vendorId);
                setVendorSearchTerm(newVendor.companyName);
                setShowCreateVendorDialog(false);
                toast.success("Vendor created! You can now add the quote details.");
              }
            }}
            onCancel={() => setShowCreateVendorDialog(false)}
            itemName={request?.itemName}
            initialCompanyName={vendorSearchTerm}
          />
        </DialogContent>
      </Dialog>

      {/* Inventory Information Dialog */}
      <Dialog open={inventoryInfoOpen} onOpenChange={setInventoryInfoOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Inventory Information
            </DialogTitle>
            <DialogDescription>
              Details for "{request?.itemName}"
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {itemInInventory ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                  <CheckCircle className="h-4 w-4" />
                  <span className="font-medium">Item exists in inventory</span>
                </div>

                <div className="space-y-3 p-3 bg-muted/50 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Central Stock:</span>
                      <p className="font-medium">{itemInInventory.centralStock || 0} {itemInInventory.unit || 'units'}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Unit:</span>
                      <p className="font-medium">{itemInInventory.unit || 'Not specified'}</p>
                    </div>
                  </div>

                  {itemInInventory.vendorIds && itemInInventory.vendorIds.length > 0 && (
                    <div>
                      <span className="text-muted-foreground text-sm">Associated Vendors:</span>
                      <div className="mt-1 space-y-1">
                        {itemInInventory.vendorIds.map((vendorId) => {
                          const vendor = vendors?.find(v => v._id === vendorId);
                          return vendor ? (
                            <div key={vendorId} className="flex items-center gap-2 text-sm">
                              <Building className="h-3 w-3 text-muted-foreground" />
                              <span>{vendor.companyName}</span>
                            </div>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}

                  {itemInInventory.images && itemInInventory.images.length > 0 && (
                    <div>
                      <span className="text-muted-foreground text-sm">Images:</span>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {itemInInventory.images.slice(0, 4).map((image, index) => (
                          <div key={image.imageKey} className="relative group">
                            <button
                              type="button"
                              onClick={() => openImageSlider(itemInInventory.images || [], request?.itemName || 'Item', index)}
                              className="block"
                            >
                              <LazyImage
                                src={image.imageUrl}
                                alt={`Image ${index + 1}`}
                                width={60}
                                height={45}
                                className="rounded border hover:border-primary transition-colors object-cover"
                              />
                            </button>
                            {index === 3 && itemInInventory.images && itemInInventory.images.length > 4 && (
                              <div className="absolute inset-0 bg-black/50 rounded flex items-center justify-center">
                                <span className="text-white text-xs font-medium">
                                  +{itemInInventory.images.length - 4}
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {itemInInventory.images.length} image{itemInInventory.images.length !== 1 ? 's' : ''} • Click to view
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="text-sm">
                    <p className="font-medium text-blue-700 dark:text-blue-300">Stock Status</p>
                    <p className="text-blue-600 dark:text-blue-400">
                      {(itemInInventory.centralStock || 0) >= (request?.quantity || 0)
                        ? 'Sufficient stock available'
                        : 'Insufficient stock - may need to reorder'
                      }
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {(itemInInventory.centralStock || 0)} / {request?.quantity || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Available / Required</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium">Item not found in inventory</span>
                </div>

                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-3">
                    This item is not currently in your inventory system.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    You may want to add this item to inventory or check if it exists under a different name.
                  </p>
                </div>

                <Button
                  onClick={() => {
                    // Navigate to inventory page
                    window.location.href = '/dashboard/inventory';
                  }}
                  className="w-full"
                  variant="outline"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Check Inventory
                </Button>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setInventoryInfoOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog >



      {/* Image Slider */}
      < ImageSlider
        images={imageSliderImages}
        initialIndex={imageSliderInitialIndex}
        open={imageSliderOpen}
        onOpenChange={setImageSliderOpen}
        itemName={imageSliderItemName}
      />

      {/* Direct Delivery Confirmation Dialog */}
      < AlertDialog open={showDirectDeliveryConfirm} onOpenChange={setShowDirectDeliveryConfirm} >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-green-600" />
              Confirm Direct Delivery from Inventory
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>This will deduct stock from inventory and {hasSufficientInventory || quantityFromVendor === 0 ? 'move to delivery stage' : 'prepare for vendor orders'}.</p>

                <div className="bg-green-50 dark:bg-green-950/30 p-3 rounded-lg border border-green-200 dark:border-green-800 space-y-2">
                  <p className="font-semibold text-green-700 dark:text-green-300">{request?.itemName}</p>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-white dark:bg-gray-900 p-2 rounded">
                      <span className="text-muted-foreground block text-xs">Deducting from Inventory</span>
                      <span className="font-bold text-green-600 text-lg">
                        {hasSufficientInventory ? (request?.quantity || 0) : quantityFromInventory}
                      </span>
                      <span className="text-muted-foreground ml-1">{request?.unit || 'units'}</span>
                    </div>
                    <div className="bg-white dark:bg-gray-900 p-2 rounded">
                      <span className="text-muted-foreground block text-xs">Stock After Deduction</span>
                      <span className="font-bold text-blue-600 text-lg">
                        {Math.max(0, (itemInInventory?.centralStock || 0) - (hasSufficientInventory ? (request?.quantity || 0) : quantityFromInventory))}
                      </span>
                      <span className="text-muted-foreground ml-1">{itemInInventory?.unit || 'units'}</span>
                    </div>
                  </div>

                  {!hasSufficientInventory && quantityFromVendor > 0 && (
                    <div className="bg-amber-50 dark:bg-amber-950/30 p-2 rounded border border-amber-200 dark:border-amber-800">
                      <span className="text-amber-700 dark:text-amber-300 text-xs font-medium">
                        ⚠ Remaining {quantityFromVendor} {request?.unit || 'units'} will need vendor quotes
                      </span>
                    </div>
                  )}
                </div>

                <p className="text-sm text-muted-foreground">
                  {hasSufficientInventory || quantityFromVendor === 0
                    ? 'The request will move directly to delivery stage. No vendor comparison needed.'
                    : 'After this, please add vendor quotes for the remaining quantity.'}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCreatingDirectPO}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDirectDelivery}
              disabled={isCreatingDirectPO}
              className="bg-green-600 hover:bg-green-700"
            >
              {isCreatingDirectPO ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <Package className="h-4 w-4 mr-2" />
                  Confirm Delivery ({hasSufficientInventory ? (request?.quantity || 0) : quantityFromInventory} {request?.unit || 'units'})
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog >

      {/* Vendor Details Dialog */}
      < Dialog open={!!showVendorDetails
      } onOpenChange={() => setShowVendorDetails(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building className="h-5 w-5 text-blue-600" />
              Vendor Details
            </DialogTitle>
          </DialogHeader>

          {showVendorDetails && (() => {
            const vendor = vendors?.find(v => v._id === showVendorDetails);
            if (!vendor) return null;

            return (
              <div className="space-y-4">
                <div className="text-center pb-4 border-b">
                  <h3 className="font-semibold text-lg">{vendor.companyName}</h3>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground mt-1" />
                    <div>
                      <p className="text-sm font-medium">Email</p>
                      <p className="text-sm text-muted-foreground">{vendor.email}</p>
                    </div>
                  </div>

                  {vendor.phone && (
                    <div className="flex items-start gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground mt-1" />
                      <div>
                        <p className="text-sm font-medium">Phone</p>
                        <p className="text-sm text-muted-foreground">{vendor.phone}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <Hash className="h-4 w-4 text-muted-foreground mt-1" />
                    <div>
                      <p className="text-sm font-medium">GST Number</p>
                      <p className="text-sm text-muted-foreground">{vendor.gstNumber}</p>
                    </div>
                  </div>

                  {vendor.address && (
                    <div className="flex items-start gap-3">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                      <div>
                        <p className="text-sm font-medium">Address</p>
                        <p className="text-sm text-muted-foreground">{vendor.address}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVendorDetails(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog >
    </>
  );
}

