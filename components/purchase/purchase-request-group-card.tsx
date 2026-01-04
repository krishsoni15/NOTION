"use client";

/**
 * Purchase Request Group Card - Shows all items within a request number
 *
 * Matches the manager page layout exactly for consistency.
 */

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Eye, FileText, MapPin, Search, X, Sparkles, Building, Plus, Save, Edit, Check, Truck } from "lucide-react";
import { CompactImageGallery } from "@/components/ui/image-gallery";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel";

interface RequestItem {
  _id: Id<"requests">;
  requestNumber: string;
  itemName: string;
  quantity: number;
  unit: string;
  description?: string;
  specsBrand?: string;
  isUrgent: boolean;
  status: string;
  photo?: {
    imageUrl: string;
    imageKey: string;
  };
  photos?: Array<{
    imageUrl: string;
    imageKey: string;
  }>;
  itemOrder?: number;
  site?: {
    _id: Id<"sites">;
    name: string;
    code?: string;
    address?: string;
  } | null;
  creator?: {
    fullName: string;
  } | null;
}

interface Vendor {
  _id: Id<"vendors">;
  companyName: string;
  email: string;
  phone?: string;
}

interface ItemWithVendor extends RequestItem {
  selectedVendorId?: Id<"vendors"> | "";
  vendorQuantity?: string;
  vendorUnit?: string;
  vendorQuantityInput?: string;
  vendorNotes?: string;
  showVendorSuggestions?: boolean;
  showVendorQuantitySuggestions?: boolean;
}

interface PurchaseRequestGroupCardProps {
  requestNumber: string;
  items: RequestItem[];
  firstItem: RequestItem;
  statusInfo: {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    icon: any;
  };
  hasMultipleItems: boolean;
  urgentCount: number;
  onViewDetails: (requestId: Id<"requests">) => void;
  onOpenCC?: (requestId: Id<"requests">) => void;
  onSiteClick?: (siteId: Id<"sites">) => void;
  onItemClick?: (itemName: string) => void;
  canEditVendor?: boolean;
}

// Helper function to collect photos
const getItemPhotos = (item: RequestItem) => {
  const photos: Array<{ imageUrl: string; imageKey: string }> = [];
  if (item.photos && item.photos.length > 0) {
    item.photos.forEach((photo) => {
      photos.push({
        imageUrl: photo.imageUrl,
        imageKey: photo.imageKey,
      });
    });
  } else if (item.photo) {
    photos.push({
      imageUrl: item.photo.imageUrl,
      imageKey: item.photo.imageKey,
    });
  }
  return photos;
};

const handleOpenInMap = (address: string) => {
  const encodedAddress = encodeURIComponent(address);
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
  window.open(mapUrl, '_blank');
};

// Get status badge helper
const getStatusBadge = (status: string) => {
  switch (status) {
    case "draft":
      return (
        <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950 dark:text-gray-300 dark:border-gray-800 text-xs">
          Draft
        </Badge>
      );
    case "pending":
      return (
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800 text-xs">
          Pending
        </Badge>
      );
    case "approved":
      return (
        <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-white text-xs">
          Approved
        </Badge>
      );
    case "ready_for_cc":
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800 text-xs">
          Ready for CC
        </Badge>
      );
    case "cc_pending":
      return (
        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800 text-xs">
          CC Pending
        </Badge>
      );
    case "ready_for_po":
      return (
        <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-800 text-xs">
          Ready for PO
        </Badge>
      );
    case "delivery_stage":
      return (
        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800 text-xs">
          Delivery
        </Badge>
      );
    case "rejected":
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800 text-xs">
          Rejected
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-xs">
          {status}
        </Badge>
      );
  }
};

// Common units for suggestions
const COMMON_UNITS = [
  "bags", "kg", "g", "gm", "ton", "mm", "cm", "m", "km",
  "nos", "pieces", "pcs", "liters", "l", "ml", "sqft", "sqm",
  "cft", "cum", "boxes", "cartons", "bundles", "rolls", "sheets", "units",
];

// Get related units based on selected item's unit
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
  if (unit === "cft" || unit === "cubic feet") {
    return ["cft", "cum", "l"];
  }
  if (unit === "cum" || unit === "cubic meter" || unit === "cubic metre") {
    return ["cum", "cft", "l"];
  }
  if (unit === "sqft" || unit === "square feet" || unit === "sq ft") {
    return ["sqft", "sqm", "acre"];
  }
  if (unit === "sqm" || unit === "square meter" || unit === "square metre") {
    return ["sqm", "sqft", "acre"];
  }
  if (unit === "nos" || unit === "number" || unit === "numbers") {
    return ["nos", "pcs", "pieces", "units"];
  }
  if (unit === "pcs" || unit === "pieces" || unit === "piece") {
    return ["pcs", "pieces", "nos", "units"];
  }
  if (unit === "units" || unit === "unit") {
    return ["units", "nos", "pcs", "pieces"];
  }
  if (unit === "bags" || unit === "bag") {
    return ["bags", "kg", "ton"];
  }
  if (unit === "boxes" || unit === "box") {
    return ["boxes", "cartons", "nos", "pcs"];
  }
  if (unit === "cartons" || unit === "carton") {
    return ["cartons", "boxes", "nos"];
  }
  if (unit === "bundles" || unit === "bundle") {
    return ["bundles", "nos", "pcs"];
  }
  if (unit === "rolls" || unit === "roll") {
    return ["rolls", "nos", "m", "ft"];
  }
  if (unit === "sheets" || unit === "sheet") {
    return ["sheets", "nos", "sqft", "sqm"];
  }
  return [unit, ...COMMON_UNITS.filter(u => u !== unit).slice(0, 5)];
};

// Generate quantity+unit suggestions
const generateQuantitySuggestions = (input: string, itemUnit?: string): string[] => {
  const trimmedInput = input.trim();

  // Don't show suggestions for very short inputs or inputs that look like typing mistakes
  if (trimmedInput.length < 1) return [];

  // Handle negative numbers, decimals, and sequences like "-23-4-"
  const numberMatch = trimmedInput.match(/^(-?\d+(?:\.\d+)?)/);
  if (numberMatch) {
    const number = numberMatch[1];
    const numberValue = Math.abs(parseFloat(number)); // Use absolute value for suggestions
    const afterNumber = trimmedInput.substring(numberMatch[0].length).trim();
    const unitPart = afterNumber.replace(/[^\w\s]/g, '').trim().toLowerCase(); // Remove special chars from unit part

    const selectedItemUnit = itemUnit ? itemUnit.replace(/[^\w\s]/g, '').trim().toLowerCase() : "";
    const relatedUnits = selectedItemUnit ? getRelatedUnits(selectedItemUnit) : [];

    if (unitPart.length === 0) {
      // No unit part yet - show suggestions based on number
      if (relatedUnits.length > 0) {
        const suggestions = [
          ...relatedUnits.slice(0, 6),
          ...COMMON_UNITS.filter(u => !relatedUnits.includes(u)).slice(0, 3)
        ];
        return suggestions.map(unit => `${number} ${unit}`);
      }
      const smartUnits = numberValue < 100
        ? ["g", "gm", "ml", "mm", "cm", "nos", "pcs", "pieces", "units"]
        : numberValue < 1000
        ? ["kg", "l", "m", "bags", "boxes", "bundles", "rolls", "sheets"]
        : ["cartons", "boxes", "bags", "ton", "kg", "cft", "cum", "sqft", "sqm"];
      return smartUnits.map(unit => `${number} ${unit}`);
    } else {
      // Unit part exists - find matching units
      const allUnits = relatedUnits.length > 0
        ? [...relatedUnits, ...COMMON_UNITS.filter(u => !relatedUnits.includes(u))]
        : COMMON_UNITS;

      const exactMatches = allUnits.filter(unit => unit.toLowerCase() === unitPart);
      const startsWithMatches = allUnits.filter(unit =>
        unit.toLowerCase().startsWith(unitPart) && unit.toLowerCase() !== unitPart
      );
      const containsMatches = allUnits.filter(unit =>
        unit.toLowerCase().includes(unitPart) &&
        !unit.toLowerCase().startsWith(unitPart) &&
        unit.toLowerCase() !== unitPart
      );

      const prioritizeRelated = (matches: string[]) => {
        const related = matches.filter(u => relatedUnits.includes(u));
        const others = matches.filter(u => !relatedUnits.includes(u));
        return [...related, ...others];
      };

      const allMatches = prioritizeRelated([...exactMatches, ...startsWithMatches, ...containsMatches]);
      if (allMatches.length > 0) {
        return allMatches.map(unit => `${number} ${unit}`);
      }
    }
  }

  // If no number found, don't show suggestions to avoid cursor UI issues
  return [];
};

// Parse quantity input
const parseQuantityInput = (input: string): { quantity: number; unit: string } => {
  const trimmedInput = input.trim();
  // Match negative numbers, decimals, and handle special characters
  const numberMatch = trimmedInput.match(/^(-?\d+(?:\.\d+)?)/);
  if (numberMatch) {
    const quantity = parseFloat(numberMatch[1]) || 0;
    const afterNumber = trimmedInput.substring(numberMatch[0].length).trim();
    const unit = afterNumber.replace(/[^\w\s]/g, '').trim(); // Remove special characters from unit
    return { quantity, unit };
  }
  return { quantity: 0, unit: "" };
};

export function PurchaseRequestGroupCard({
  requestNumber,
  items,
  firstItem,
  statusInfo,
  hasMultipleItems,
  urgentCount,
  onViewDetails,
  onOpenCC,
  onSiteClick,
  onItemClick,
  canEditVendor = true
}: PurchaseRequestGroupCardProps) {
  const StatusIcon = statusInfo.icon;

  // Vendor queries
  const vendors = useQuery(api.vendors.getAllVendors);
  const updateRequestDetails = useMutation(api.requests.updateRequestDetails);

  // State for vendor editing
  const [editingItemId, setEditingItemId] = useState<Id<"requests"> | null>(null);
  const [itemsWithVendor, setItemsWithVendor] = useState<ItemWithVendor[]>([]);
  const [vendorSearchQuery, setVendorSearchQuery] = useState("");

  // Initialize items with vendor data
  useEffect(() => {
    const itemsWithVendorData: ItemWithVendor[] = items.map(item => ({
      ...item,
      selectedVendorId: "",
      vendorQuantity: item.quantity.toString(),
      vendorUnit: item.unit || "",
      vendorQuantityInput: item.unit ? `${item.quantity} ${item.unit}` : item.quantity.toString(),
      vendorNotes: "",
      showVendorSuggestions: false,
      showVendorQuantitySuggestions: false,
    }));
    setItemsWithVendor(itemsWithVendorData);
  }, [items]);

  // Filter vendors based on search query
  const filteredVendors = vendors?.filter(vendor =>
    vendor.companyName.toLowerCase().includes(vendorSearchQuery.toLowerCase()) ||
    vendor.email.toLowerCase().includes(vendorSearchQuery.toLowerCase()) ||
    (vendor.phone && vendor.phone.toLowerCase().includes(vendorSearchQuery.toLowerCase()))
  ) || [];

  // Update item with vendor data
  const updateItemWithVendor = (itemId: Id<"requests">, updates: Partial<ItemWithVendor>) => {
    setItemsWithVendor(prev =>
      prev.map(item => item._id === itemId ? { ...item, ...updates } : item)
    );
  };

  // Handle vendor quantity input change
  const handleVendorQuantityInputChange = (itemId: Id<"requests">, value: string) => {
    const parsed = parseQuantityInput(value);
    updateItemWithVendor(itemId, {
      vendorQuantityInput: value,
      vendorQuantity: parsed.quantity.toString(),
      vendorUnit: parsed.unit,
      showVendorQuantitySuggestions: value.length > 0,
    });
  };

  // Handle vendor quantity suggestion select
  const handleVendorQuantitySelect = (itemId: Id<"requests">, suggestion: string) => {
    const parsed = parseQuantityInput(suggestion);
    updateItemWithVendor(itemId, {
      vendorQuantityInput: suggestion,
      vendorQuantity: parsed.quantity.toString(),
      vendorUnit: parsed.unit,
      showVendorQuantitySuggestions: false,
    });
  };

  // Save vendor details
  const handleSaveVendorDetails = async (itemId: Id<"requests">) => {
    const item = itemsWithVendor.find(i => i._id === itemId);
    if (!item) return;

    const quantity = parseFloat(item.vendorQuantity || "0");
    if (isNaN(quantity) || quantity <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    try {
      await updateRequestDetails({
        requestId: itemId,
        quantity,
        unit: item.vendorUnit?.trim() || undefined,
      });
      toast.success("Vendor details saved");
      setEditingItemId(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to save vendor details");
    }
  };

  // Get vendor name by ID
  const getVendorName = (vendorId: Id<"vendors">) => {
    return vendors?.find(v => v._id === vendorId)?.companyName || "";
  };

  return (
    <div className="border rounded-lg p-3 sm:p-4 bg-card shadow-sm grouped-card-hover touch-manipulation transition-all duration-200 hover:shadow-md">
      {/* Card Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-nowrap overflow-x-auto">
            <span className="font-mono text-xs font-semibold text-primary flex-shrink-0">
              #{requestNumber}
            </span>
            <Badge variant={statusInfo.variant} className="text-xs flex-shrink-0">
              <StatusIcon className="h-3 w-3 mr-1" />
              {statusInfo.label}
            </Badge>
            {urgentCount > 0 && (
              <Badge variant="destructive" className="flex items-center gap-1 text-xs flex-shrink-0">
                <AlertCircle className="h-3 w-3" />
                {urgentCount}/{items.length} urgent{urgentCount > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {firstItem.site?.address && (
                <button
                  onClick={() => handleOpenInMap(firstItem.site?.address || '')}
                  className="text-primary hover:text-primary/80 hover:bg-primary/10 rounded-full p-2 transition-colors shrink-0 border border-primary/20 hover:border-primary/40"
                  title="Open in Maps"
                >
                  <MapPin className="h-3.5 w-3.5" />
                </button>
              )}
              {firstItem.site ? (
                onSiteClick && firstItem.site._id ? (
                  <button
                    onClick={() => onSiteClick(firstItem.site!._id)}
                    className="font-semibold text-sm text-foreground hover:text-primary hover:bg-muted/50 rounded-full px-3 py-1.5 -mx-2 -my-1 transition-colors cursor-pointer text-left truncate flex-1 border border-transparent hover:border-primary/20"
                  >
                    {firstItem.site.name}
                    {firstItem.site.code && <span className="text-muted-foreground ml-1">({firstItem.site.code})</span>}
                  </button>
                ) : (
                  <span className="font-semibold text-sm truncate flex-1">
                    {firstItem.site.name}
                    {firstItem.site.code && <span className="text-muted-foreground ml-1">({firstItem.site.code})</span>}
                  </span>
                )
              ) : (
                "—"
              )}
            </div>
          </div>
        </div>
        {hasMultipleItems && (
          <Badge variant="secondary" className="text-xs px-1.5 py-0.5 h-5 flex-shrink-0">
            {items.length} items
          </Badge>
        )}
      </div>

      {/* Items List */}
      <div className="space-y-3 mb-3">
        {itemsWithVendor.map((item, idx) => {
          const displayNumber = item.itemOrder ?? (items.length - idx);
          const itemPhotos = getItemPhotos(item);
          const isEditing = editingItemId === item._id;

          return (
            <div
              key={item._id}
              className={cn(
                "p-3 rounded-lg border shadow-sm",
                item.status === "approved" && "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800",
                item.status === "rejected" && "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800",
                item.status === "cc_rejected" && "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800",
                !["approved", "rejected", "cc_rejected"].includes(item.status) && "bg-card/50"
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs px-1.5 py-0.5 h-5 min-w-[24px] flex items-center justify-center flex-shrink-0">
                      {displayNumber}
                    </Badge>
                    <div className="space-y-1 text-sm flex-1 min-w-0">
                      <div className="break-words">
                        <span className="font-medium text-muted-foreground">Item:</span>{" "}
                        {onItemClick ? (
                          <button
                            onClick={() => onItemClick(item.itemName)}
                            className="font-semibold text-sm text-foreground hover:text-primary hover:bg-muted/50 rounded-full px-3 py-1.5 -mx-2 -my-1 transition-colors cursor-pointer text-left border border-transparent hover:border-primary/20 whitespace-normal"
                          >
                            {item.itemName}
                          </button>
                        ) : (
                          <span className="font-semibold text-sm">{item.itemName}</span>
                        )}
                      </div>
                      {item.description && (
                        <div className="text-xs text-muted-foreground break-words whitespace-normal">
                          <span className="font-medium">Dis:</span> {item.description}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-2">
                        <span><span className="font-medium">Quantity:</span> {item.quantity} {item.unit}</span>
                        {item.specsBrand && (
                          <span className="text-primary">• {item.specsBrand}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {itemPhotos.length > 0 && (
                    <CompactImageGallery
                      images={itemPhotos}
                      maxDisplay={itemPhotos.length > 1 ? 2 : 1}
                      size="md"
                    />
                  )}
                </div>
              </div>

              {/* Vendor Details Section */}
              {canEditVendor && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Building className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground">Vendor Details</span>
                    </div>
                    {!isEditing ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingItemId(item._id)}
                        className="h-6 text-xs px-2"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    ) : (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingItemId(null)}
                          className="h-6 text-xs px-2"
                        >
                          <X className="h-3 w-3 mr-1" />
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSaveVendorDetails(item._id)}
                          className="h-6 text-xs px-2"
                        >
                          <Save className="h-3 w-3 mr-1" />
                          Save
                        </Button>
                      </div>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-3">
                      {/* Vendor Selection */}
                      <div className="space-y-2">
                        <Label className="text-xs font-medium flex items-center gap-1.5">
                          <Building className="h-3.5 w-3.5" />
                          Select Vendor
                        </Label>
                        <div className="relative">
                          <Select
                            value={item.selectedVendorId || ""}
                            onValueChange={(value) => updateItemWithVendor(item._id, { selectedVendorId: value as Id<"vendors"> || "" })}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Choose vendor..." />
                            </SelectTrigger>
                            <SelectContent>
                              <div className="p-2 border-b">
                                <div className="relative">
                                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                                  <Input
                                    placeholder="Search vendors..."
                                    value={vendorSearchQuery}
                                    onChange={(e) => setVendorSearchQuery(e.target.value)}
                                    className="pl-8 h-7 text-xs"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                </div>
                              </div>
                              {filteredVendors.map((vendor) => (
                                <SelectItem key={vendor._id} value={vendor._id} className="text-xs">
                                  <div className="flex items-center gap-2">
                                    <span>{vendor.companyName}</span>
                                    <span className="text-muted-foreground">• {vendor.email}</span>
                                  </div>
                                </SelectItem>
                              ))}
                              {filteredVendors.length === 0 && vendorSearchQuery && (
                                <div className="px-2 py-4 text-center text-xs text-muted-foreground">
                                  No vendors found
                                </div>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Quantity & Unit with Suggestions */}
                      <div className="space-y-2">
                        <Label className="text-xs font-medium flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5" />
                          Quantity & Unit
                        </Label>
                        <div className="relative">
                          <Input
                            type="text"
                            value={item.vendorQuantityInput || ""}
                            onChange={(e) => handleVendorQuantityInputChange(item._id, e.target.value)}
                            onFocus={() => updateItemWithVendor(item._id, { showVendorQuantitySuggestions: true })}
                            placeholder="e.g., 10 bags, 5 kg, 20 nos"
                            className="h-8 text-xs pr-8"
                          />
                          {item.vendorQuantityInput && (
                            <button
                              onClick={() => updateItemWithVendor(item._id, {
                                vendorQuantityInput: "",
                                vendorQuantity: "",
                                vendorUnit: "",
                                showVendorQuantitySuggestions: false
                              })}
                              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}

                          {/* Quantity Suggestions Dropdown */}
                          {item.showVendorQuantitySuggestions && item.vendorQuantityInput && (
                            <div
                              className="absolute top-full left-0 right-0 z-50 bg-popover border border-border rounded-md shadow-md max-h-48 overflow-y-auto"
                              style={{ marginTop: '2px' }}
                            >
                              {generateQuantitySuggestions(item.vendorQuantityInput, item.unit).map((suggestion, index) => (
                                <button
                                  key={index}
                                  onClick={() => handleVendorQuantitySelect(item._id, suggestion)}
                                  className="w-full text-left px-3 py-2 text-xs hover:bg-accent hover:text-accent-foreground first:rounded-t-md last:rounded-b-md"
                                >
                                  {suggestion}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Vendor Notes */}
                      <div className="space-y-2">
                        <Label className="text-xs font-medium flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5" />
                          Vendor Notes <span className="text-muted-foreground font-normal">(Optional)</span>
                        </Label>
                        <Textarea
                          value={item.vendorNotes || ""}
                          onChange={(e) => updateItemWithVendor(item._id, { vendorNotes: e.target.value })}
                          placeholder="Additional notes for vendor..."
                          className="min-h-[60px] text-xs"
                          rows={2}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground space-y-1">
                      {item.selectedVendorId ? (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Vendor:</span>
                            <span>{getVendorName(item.selectedVendorId as Id<"vendors">)}</span>
                          </div>
                          {(item.vendorQuantityInput || item.vendorNotes) && (
                            <div className="flex items-center gap-2">
                              {item.vendorQuantityInput && (
                                <span className="font-medium">Qty:</span>
                              )}
                              {item.vendorQuantityInput && (
                                <span>{item.vendorQuantityInput}</span>
                              )}
                              {item.vendorNotes && (
                                <>
                                  {item.vendorQuantityInput && <span>•</span>}
                                  <span className="font-medium">Notes:</span>
                                  <span className="truncate">{item.vendorNotes}</span>
                                </>
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="italic">No vendor selected</span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Status badges on new line */}
              <div className="flex items-center justify-between pt-2 border-t mt-2">
                <div className="flex items-center gap-2">
                  {item.isUrgent && (
                    <Badge variant="destructive" className="text-xs flex-shrink-0">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Urgent
                    </Badge>
                  )}
                  {(item.status === 'approved' || item.status === 'cc_approved') && (
                    <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-white text-xs flex-shrink-0">
                      ✓ Approved
                    </Badge>
                  )}
                  {(item.status === 'rejected' || item.status === 'cc_rejected') && (
                    <Badge variant="destructive" className="text-xs flex-shrink-0">
                      ✗ Rejected
                    </Badge>
                  )}
                  {item.status !== 'approved' && item.status !== 'rejected' && item.status !== 'cc_approved' && item.status !== 'cc_rejected' && getStatusBadge(item.status)}
                </div>
                <div className="flex items-center gap-2">
                  {item.status === "ready_for_cc" && onOpenCC && (
                    <Button
                      size="sm"
                      onClick={() => onOpenCC(item._id)}
                      className="text-xs h-7 px-2"
                    >
                      <FileText className="h-3 w-3 mr-1" />
                      CC
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewDetails(item._id)}
                    className="text-xs h-7 px-2"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
