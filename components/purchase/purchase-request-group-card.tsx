"use client";

/**
 * Purchase Request Group Card - Shows all items within a request number
 *
 * Matches the manager page layout exactly for consistency.
 */

import { useState, useRef, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Eye, FileText, MapPin, Search, X, Sparkles, Building, Plus, Save, Edit, Check, Truck, Package, PackageX, NotebookPen, ShoppingCart, ChevronDown, ChevronRight, CheckCircle, PieChart, RotateCw, CheckSquare, Square } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { CompactImageGallery } from "@/components/ui/image-gallery";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { NotesTimelineDialog } from "@/components/requests/notes-timeline-dialog";
import { CreateDeliveryDialog } from "@/components/purchase/create-delivery-dialog";
import { EditPOQuantityDialog } from "@/components/purchase/edit-po-quantity-dialog";
import { ViewDCDialog } from "@/components/purchase/view-dc-dialog";
import { format } from "date-fns";
import type { Id } from "@/convex/_generated/dataModel";

import { useUserRole } from "@/hooks/use-user-role";
import { ROLES } from "@/lib/auth/roles";

interface RequestItem {
  _id: Id<"requests">;
  requestNumber: string;
  itemName: string;
  quantity: number;
  unit: string;
  description?: string;
  specsBrand?: string;
  isUrgent: boolean;
  requiredBy?: number;
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
  selectedVendorId?: Id<"vendors"> | null;
  vendorQuotes?: Array<{
    vendorId: Id<"vendors">;
    unitPrice: number;
    amount?: number;
    unit?: string;
  }>;
  notesCount?: number;
  isSplitApproved?: boolean;
  directAction?: "po" | "delivery" | "all";
  rejectionReason?: string;
  poId?: Id<"purchaseOrders">;
  deliveryId?: Id<"deliveries">;
}

interface Vendor {
  _id: Id<"vendors">;
  companyName: string;
  email: string;
  phone?: string;
}

interface ItemWithVendor extends RequestItem {
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
  onDirectPO?: (requestId: Id<"requests">) => void;
  onDirectDelivery?: (requestId: Id<"requests">) => void;

  onMoveToCC?: (requestId: Id<"requests">) => void;
  onCheck?: (requestId: Id<"requests">) => void;
  onCreatePO?: (requestId: Id<"requests">) => void;
  onCreateBulkPO?: (requestIds: Id<"requests">[]) => void;
  onViewPDF?: (poNumber: string) => void;
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
    case "recheck":
      return (
        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800 text-xs">
          Recheck
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
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800 text-xs">
          CC Pending
        </Badge>
      );
    case "cc_approved":
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800 text-xs">
          CC Approved
        </Badge>
      );
    case "cc_rejected":
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800 text-xs">
          CC Rejected
        </Badge>
      );
    case "ready_for_po":
      return (
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800 text-xs">
          Ready for PO
        </Badge>
      );
    case "pending_po":
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800 text-xs">
          Pending PO
        </Badge>
      );
    case "rejected_po":
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800 text-xs">
          PO Rejected
        </Badge>
      );
    case "ready_for_delivery":
      return (
        <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800 text-xs">
          Ready for Delivery
        </Badge>
      );
    case "delivered":
      return (
        <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-950 dark:text-slate-300 dark:border-slate-800 text-xs">
          Delivered
        </Badge>
      );
    case "delivery_processing":
    case "delivery_stage":
      return (
        <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800 text-xs">
          Out for Delivery
        </Badge>
      );
    case "rejected":
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800 text-xs">
          Rejected
        </Badge>
      );
    case "sign_pending":
      return (
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800 text-xs">
          Sign Pending
        </Badge>
      );
    case "sign_rejected":
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800 text-xs">
          Sign Rejected
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

// Expandable Text Component
const ExpandableText = ({ text, className, limit = 100 }: { text: string, className?: string, limit?: number }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!text) return null;

  // Simple check for "long" text
  const isLong = text.length > limit;

  return (
    <div className={cn("relative", className)}>
      <div className={cn(
        "text-sm text-foreground/80 leading-relaxed font-medium",
        !isExpanded && isLong && "line-clamp-1"
      )}>
        {text}
      </div>
      {isLong && (
        <button
          onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
          className="text-[10px] font-bold text-primary hover:underline mt-0.5 inline-flex items-center gap-0.5"
        >
          {isExpanded ? "Show Less" : "Read More"}
        </button>
      )}
    </div>
  );
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
  canEditVendor = true,
  onDirectPO,
  onDirectDelivery,
  onMoveToCC,
  onCheck,
  onCreatePO,
  onCreateBulkPO,
  onViewPDF,
}: PurchaseRequestGroupCardProps) {
  const userRole = useUserRole();
  const isManager = userRole === "manager";
  const StatusIcon = statusInfo.icon;

  // Vendor queries
  const vendors = useQuery(api.vendors.getAllVendors);
  const updateRequestDetails = useMutation(api.requests.updateRequestDetails);
  const confirmDeliveryMutation = useMutation(api.deliveries.confirmDelivery);

  // Collect all unique item names from items
  const uniqueItemNames = useMemo(() => {
    const names = new Set<string>();
    items.forEach((item) => names.add(item.itemName));
    return Array.from(names);
  }, [items]);

  // Query inventory status for all items
  const inventoryStatus = useQuery(
    api.inventory.getInventoryStatusForItems,
    uniqueItemNames.length > 0 ? { itemNames: uniqueItemNames } : "skip"
  );

  // Helper function to get inventory status badge for an item
  const getInventoryStatusBadge = (itemName: string, requestedQuantity: number, unit: string) => {
    if (!inventoryStatus) return null;

    const status = inventoryStatus[itemName];
    if (!status) return null;

    if (status.status === "new_item") {
      return (
        <Badge
          variant="outline"
          className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800 text-[10px] px-1.5 py-0.5 h-5 gap-1"
        >
          <Sparkles className="h-3 w-3" />
          New Item
        </Badge>
      );
    }

    if (status.status === "out_of_stock") {
      return (
        <Badge
          variant="outline"
          className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800 text-[10px] px-1.5 py-0.5 h-5 gap-1"
        >
          <PackageX className="h-3 w-3" />
          Out of Stock
        </Badge>
      );
    }

    // In stock - show remaining quantity
    const stockAvailable = status.centralStock;
    const remaining = stockAvailable - requestedQuantity;
    const stockUnit = status.unit || unit;

    // Determine color based on how much stock remains
    const isLowStock = remaining < 0 || (stockAvailable > 0 && remaining < stockAvailable * 0.2);
    const isSufficientStock = remaining >= 0;

    if (!isSufficientStock) {
      // Requested more than available
      return (
        <Badge
          variant="outline"
          className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800 text-[10px] px-1.5 py-0.5 h-5 gap-1"
        >
          <Package className="h-3 w-3" />
          {stockAvailable}/{requestedQuantity} {stockUnit}
        </Badge>
      );
    }

    return (
      <Badge
        variant="outline"
        className={cn(
          "text-[10px] px-1.5 py-0.5 h-5 gap-1",
          isLowStock
            ? "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800"
            : "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800"
        )}
      >
        <Package className="h-3 w-3" />
        {stockAvailable} {stockUnit}
      </Badge>
    );
  };

  // State for vendor editing
  const [editingItemId, setEditingItemId] = useState<Id<"requests"> | null>(null);
  const [itemsWithVendor, setItemsWithVendor] = useState<ItemWithVendor[]>([]);
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [vendorSearchQuery, setVendorSearchQuery] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [showReadyForCCConfirm, setShowReadyForCCConfirm] = useState<Id<"requests"> | null>(null);
  const [showReadyForPOConfirm, setShowReadyForPOConfirm] = useState<Id<"requests"> | null>(null);

  const [showReadyForDeliveryConfirm, setShowReadyForDeliveryConfirm] = useState<Id<"requests"> | null>(null);

  const [markDeliveryItem, setMarkDeliveryItem] = useState<{ id: Id<"requests">; poId?: Id<"purchaseOrders">; quantity: number; name: string; unit: string } | null>(null);
  const [editQuantityItem, setEditQuantityItem] = useState<{ id: Id<"requests">; quantity: number; name: string; unit: string } | null>(null);
  const [viewDCId, setViewDCId] = useState<Id<"deliveries"> | null>(null);
  const [showConfirmDelivery, setShowConfirmDelivery] = useState<Id<"requests"> | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Handle individual selection
  const toggleSelection = (requestId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(requestId)) {
      newSelected.delete(requestId);
    } else {
      newSelected.add(requestId);
    }
    setSelectedItems(newSelected);
  };

  // Handle confirm delivery
  const handleConfirmDelivery = async (requestId: Id<"requests">) => {
    try {
      await confirmDeliveryMutation({ requestId });
      toast.success("Delivery confirmed successfully");
      setShowConfirmDelivery(null);
    } catch (error) {
      console.error("Failed to confirm delivery:", error);
      toast.error("Failed to confirm delivery");
    }
  };

  // Handle select all
  const toggleSelectAll = () => {
    const validItems = items.filter(item => item.status === "ready_for_po");
    if (selectedItems.size === validItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(validItems.map(i => i._id)));
    }
  };

  const validItemsCount = items.filter(item => item.status === "ready_for_po").length;
  const isAllSelected = validItemsCount > 0 && selectedItems.size === validItemsCount;

  // Initialize items with vendor data
  useEffect(() => {
    const itemsWithVendorData: ItemWithVendor[] = items.map(item => ({
      ...item,
      selectedVendorId: null,
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

  // Helper to get item-specific background color based on status - LIGHTER & SUBTLE
  // Helper to get item-specific background color based on status - LIGHTER & SUBTLE
  const getItemStatusBgColor = (status: string) => {
    if (status === "draft") return "bg-slate-50/50 dark:bg-slate-900/10 border-slate-200 dark:border-slate-800";
    if (["pending", "sign_pending"].includes(status)) return "bg-amber-50/50 dark:bg-amber-950/10 border-amber-200 dark:border-amber-800";
    if (status === "approved") return "bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-800";
    if (status === "recheck") return "bg-indigo-50/50 dark:bg-indigo-950/10 border-indigo-200 dark:border-indigo-800";
    if (status === "ready_for_cc") return "bg-blue-50/50 dark:bg-blue-950/10 border-blue-200 dark:border-blue-800";
    if (status === "cc_pending") return "bg-purple-50/50 dark:bg-purple-950/10 border-purple-200 dark:border-purple-800";
    if (["cc_approved", "ready_for_po"].includes(status)) return "bg-teal-50/50 dark:bg-teal-950/10 border-teal-200 dark:border-teal-800";
    if (["pending_po", "direct_po"].includes(status)) return "bg-orange-50/50 dark:bg-orange-950/10 border-orange-200 dark:border-orange-800";
    if (["ready_for_delivery", "out_for_delivery", "delivery_processing", "delivery_stage"].includes(status)) return "bg-sky-50/50 dark:bg-sky-950/10 border-sky-200 dark:border-sky-800";
    if (status === "delivered") return "bg-green-50/30 dark:bg-green-900/10 border-green-200 dark:border-green-800";
    if (["rejected", "sign_rejected", "cc_rejected", "rejected_po"].includes(status)) return "bg-rose-50/50 dark:bg-rose-950/10 border-rose-200 dark:border-rose-800";
    return "bg-card border-border";
  };

  // Helper to get status color hex code for gradient
  const getStatusColorHex = (status: string) => {
    if (status === "draft") return "#94a3b8"; // slate-400
    if (["pending", "sign_pending"].includes(status)) return "#f59e0b"; // amber-500
    if (status === "approved") return "#10b981"; // emerald-500
    if (status === "delivered") return "#16a34a"; // green-600
    if (status === "recheck") return "#6366f1"; // indigo-500
    if (status === "ready_for_cc") return "#3b82f6"; // blue-500
    if (status === "cc_pending") return "#a855f7"; // purple-500
    if (status === "ready_for_po") return "#14b8a6"; // teal-500
    if (["pending_po", "direct_po"].includes(status)) return "#f97316"; // orange-500
    if (["out_for_delivery", "delivery_processing", "delivery_stage"].includes(status)) return "#0ea5e9"; // sky-500
    if (["rejected", "sign_rejected", "cc_rejected", "rejected_po"].includes(status)) return "#f43f5e"; // rose-500
    return "#e2e8f0"; // slate-200 (muted)
  };

  // Helper to generate gradient for mixed statuses (Sequence based)
  const getLeftBorderGradient = (items: RequestItem[]) => {
    if (items.length === 0) return null;

    const total = items.length;
    const segmentSize = 100 / total;
    const gradientStops: string[] = [];

    // Items are already sorted by Order (4, 3, 2, 1) or CreatedAt
    // We map them top-to-bottom
    items.forEach((item, index) => {
      const color = getStatusColorHex(item.status);
      const start = index * segmentSize;
      const end = (index + 1) * segmentSize;

      gradientStops.push(`${color} ${start}%`);
      gradientStops.push(`${color} ${end}%`);
    });

    return `linear-gradient(to bottom, ${gradientStops.join(", ")})`;
  };

  // Determine Overall Status for Card Background
  const allItemsHaveSameStatus = items.length > 0
    ? items.every((item) => item.status === items[0].status)
    : true;
  const overallStatus = allItemsHaveSameStatus ? items[0].status : "mixed";

  // Get status background color for the Card Header/Container
  // Get status background color for the Card Header/Container
  const getCardStatusBgColor = (status: string) => {
    // Revised to provide "Status Big Theme Color" - using subtle tints of the status color in dark mode
    if (status === "draft") return "bg-slate-50/50 dark:bg-slate-900/50";
    if (["pending", "sign_pending"].includes(status)) return "bg-amber-50/50 dark:bg-amber-950/20";
    if (status === "approved") return "bg-emerald-50/50 dark:bg-emerald-950/20";
    if (status === "recheck") return "bg-indigo-50/50 dark:bg-indigo-950/20";
    if (status === "ready_for_cc") return "bg-blue-50/50 dark:bg-blue-950/20";
    if (status === "cc_pending") return "bg-purple-50/50 dark:bg-purple-950/20";
    if (["cc_approved", "ready_for_po"].includes(status)) return "bg-teal-50/50 dark:bg-teal-950/20";
    if (["pending_po", "direct_po"].includes(status)) return "bg-orange-50/50 dark:bg-orange-950/20";
    if (["ready_for_delivery", "out_for_delivery", "delivery_processing", "delivery_stage"].includes(status)) return "bg-sky-50/50 dark:bg-sky-950/20";
    if (status === "delivered") return "bg-green-50/50 dark:bg-green-950/20";
    if (["rejected", "sign_rejected", "cc_rejected", "rejected_po"].includes(status)) return "bg-rose-50/50 dark:bg-rose-950/20";
    return "bg-card dark:bg-slate-900 hover:bg-zinc-50 dark:hover:bg-slate-800/50";
  };

  // Get status border color for single status
  const getCardStatusBorderColor = (status: string) => {
    if (status === "draft") return "border-slate-400 dark:border-slate-600";
    if (["pending", "sign_pending"].includes(status)) return "border-amber-500 dark:border-amber-600";
    if (status === "approved") return "border-emerald-500 dark:border-emerald-600";
    if (status === "recheck") return "border-indigo-500 dark:border-indigo-600";
    if (status === "ready_for_cc") return "border-blue-500 dark:border-blue-600";
    if (status === "cc_pending") return "border-purple-500 dark:border-purple-600";
    if (["cc_approved", "ready_for_po"].includes(status)) return "border-teal-500 dark:border-teal-600";
    if (["pending_po", "direct_po"].includes(status)) return "border-orange-500 dark:border-orange-600";
    if (["ready_for_delivery", "out_for_delivery", "delivery_processing", "delivery_stage"].includes(status)) return "border-sky-500 dark:border-sky-600";
    if (status === "delivered") return "border-green-600 dark:border-green-600";
    if (["rejected", "sign_rejected", "cc_rejected", "rejected_po"].includes(status)) return "border-rose-500 dark:border-rose-600";
    return "border-muted";
  };

  const leftBorderGradient = !allItemsHaveSameStatus ? getLeftBorderGradient(items) : null;
  const singleStatusBorderClass = allItemsHaveSameStatus ? getCardStatusBorderColor(overallStatus) : "border-slate-200 dark:border-slate-800";

  return (
    <div
      className={cn(
        "border rounded-xl shadow-lg hover:shadow-xl dark:shadow-black/40 transition-all duration-300 overflow-hidden",
        "!border-l-[6px]", // Force thicker left border
        !leftBorderGradient && singleStatusBorderClass, // Apply solid class if no gradient
        leftBorderGradient && "!border-l-transparent border-slate-200 dark:border-slate-800", // Only set transparent if using gradient
        getCardStatusBgColor(overallStatus)
      )}
      style={{
        backgroundImage: leftBorderGradient || undefined,
        backgroundSize: "6px 100%",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "left top",
        backgroundOrigin: "border-box"
      }}
    >
      <div className="p-3 sm:p-4">
        {/* Card Header */}
        <div className="flex items-start justify-between mb-3 gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="font-mono text-xl font-black text-blue-600 dark:text-white flex-shrink-0 tracking-tighter">
                #{requestNumber}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsNotesOpen(true)}
                className="relative h-6 w-6 p-0 rounded-full hover:bg-muted ml-2"
                title="View Notes"
              >
                <NotebookPen className="h-3.5 w-3.5 text-muted-foreground" />
                {firstItem.notesCount !== undefined && firstItem.notesCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-destructive text-[8px] text-destructive-foreground ring-1 ring-background">
                    {firstItem.notesCount}
                  </span>
                )}
              </Button>
              {/* Status Badge Hidden as per request to rely on border colors */}
            </div>
            <div className="flex items-center gap-3 mt-1">
              <div className="flex flex-col">
                <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide leading-none mb-0.5">Required</span>
                <span className={cn("text-xs font-bold leading-none", firstItem.requiredBy && new Date(firstItem.requiredBy) < new Date() ? "text-red-600" : "text-foreground")}>
                  {firstItem.requiredBy ? format(new Date(firstItem.requiredBy), "dd MMM") : "N/A"}
                </span>
              </div>
              {validItemsCount > 0 && onCreateBulkPO && (
                <div className="flex items-center gap-2 mr-2 pl-3 border-l border-border/50">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={toggleSelectAll}
                    id={`select-all-${requestNumber}`}
                  />
                  <label htmlFor={`select-all-${requestNumber}`} className="text-xs text-muted-foreground cursor-pointer select-none">
                    Select All
                  </label>
                </div>
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
                      className="font-semibold text-sm text-foreground hover:text-primary bg-transparent rounded-sm px-1 -mx-1 transition-colors cursor-pointer text-left truncate flex-1 border border-transparent hover:border-border"
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
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 text-xs h-8 px-3"
              onClick={() => onViewDetails(firstItem._id)}
            >
              <Eye className="h-3.5 w-3.5 mr-1.5" />
              View
            </Button>
            {hasMultipleItems && (
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 text-xs touch-manipulation min-h-[32px] ml-1"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <>
                    <ChevronRight className="h-4 w-4 mr-1" />
                    <span className="font-semibold">({items.length})</span>
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Bulk Action Header Button */}
          {selectedItems.size > 0 && onCreateBulkPO && (
            <Button
              size="sm"
              className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white animate-in zoom-in-95 duration-200"
              onClick={() => onCreateBulkPO(Array.from(selectedItems) as Id<"requests">[])}
            >
              <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
              Create PO ({selectedItems.size})
            </Button>
          )}
        </div>

        {/* Items List */}
        <div className="space-y-3 mb-3">
          {(isExpanded ? itemsWithVendor : itemsWithVendor.slice(0, 1)).map((item, idx) => {
            const displayNumber = item.itemOrder ?? (items.length - idx);
            const itemPhotos = getItemPhotos(item);
            const isEditing = editingItemId === item._id;

            // Check if item has partial stock (some but not enough)
            const itemInventory = inventoryStatus && inventoryStatus[item.itemName];
            const hasPartialStock = !!(
              itemInventory &&
              itemInventory.centralStock > 0 &&
              itemInventory.centralStock < item.quantity
            );
            const hasFullStock = !!(
              itemInventory &&
              itemInventory.centralStock >= item.quantity
            );
            const disableDirectActions = hasPartialStock;
            const directActionDisabledReason = hasPartialStock ? "Partial stock available - please manage via CC" : undefined;

            return (
              <div
                key={item._id}
                className={cn(
                  "p-3 rounded-lg border shadow-sm relative overflow-hidden bg-card hover:shadow-md transition-shadow",
                  "border-l-[6px]", // Force thick left border
                  getCardStatusBorderColor(item.status)
                )}
              >
                <div>
                  <div className="flex gap-3 relative">
                    {/* Image - Moved to Left */}
                    <div className="shrink-0 pt-1">
                      {itemPhotos.length > 0 && (
                        <CompactImageGallery
                          images={itemPhotos}
                          maxDisplay={1}
                          size="sm"
                        />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      {/* Top Row: Index + Item Name + Quantity */}
                      <div className="flex justify-between items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-xs px-1.5 py-0.5 h-5 min-w-[24px] flex items-center justify-center flex-shrink-0 bg-primary/5 text-primary border-primary/20">
                              #{displayNumber}
                            </Badge>
                            {/* Checkbox for Ready for PO */}
                            {item.status === "ready_for_po" && onCreateBulkPO && (
                              <div className="flex items-center justify-center h-5 w-5">
                                <Checkbox
                                  checked={selectedItems.has(item._id)}
                                  onCheckedChange={() => toggleSelection(item._id)}
                                  className="h-4 w-4"
                                />
                              </div>
                            )}
                            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Item Name</span>
                          </div>

                          <div className="break-words pr-2">
                            {onItemClick ? (
                              <button
                                onClick={() => onItemClick(item.itemName)}
                                className="font-extrabold text-xl text-foreground hover:text-primary transition-colors text-left leading-tight tracking-tight"
                              >
                                {item.itemName}
                              </button>
                            ) : (
                              <span className="font-extrabold text-xl text-foreground leading-tight tracking-tight">{item.itemName}</span>
                            )}
                          </div>
                        </div>

                        {/* Right Side: Quantity */}
                        <div className="flex flex-col items-end shrink-0">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">Quantity</span>
                          <div className="flex items-baseline gap-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded shadow-sm">
                            <span className="text-base font-black text-slate-900 dark:text-slate-100">{item.quantity}</span>
                            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">{item.unit}</span>
                          </div>
                          <div className="mt-1 flex justify-end">
                            <div
                              onClick={(e) => { e.stopPropagation(); onItemClick?.(item.itemName); }}
                              className={cn("transition-all", onItemClick && "cursor-pointer hover:opacity-80 active:scale-95")}
                              title="Click to view item details"
                            >
                              {getInventoryStatusBadge(item.itemName, item.quantity, item.unit)}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Description & Details */}
                      <div className="space-y-1 pt-2">
                        {item.description && (
                          <div className="bg-muted/10 rounded-md p-0">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground/70 tracking-wider block mb-0.5">Description</span>
                            <ExpandableText text={item.description} limit={60} />
                          </div>
                        )}
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          {item.specsBrand && (
                            <span className="text-xs font-medium text-primary bg-primary/5 px-1.5 py-0.5 rounded">
                              {item.specsBrand}
                            </span>
                          )}
                          {/* Stock status moved to Right side */}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Rejection Reason Display */}
                  {((item.status === 'rejected' || item.status === 'cc_rejected' || item.status === 'rejected_po') && item.rejectionReason) && (
                    <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-md">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5" />
                        <div className="flex-1">
                          <h4 className="text-xs font-semibold text-red-700 dark:text-red-300 mb-1">
                            Reason for Rejection:
                          </h4>
                          <p className="text-xs text-red-600 dark:text-red-400 leading-relaxed">
                            {item.rejectionReason}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Vendor Details Section */}
                  {canEditVendor && (item.selectedVendorId || (item.vendorQuotes && item.vendorQuotes.length > 0) || isEditing) && (
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Building className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs font-medium text-muted-foreground">Vendor Details</span>
                        </div>
                        {isEditing && (
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
                                onValueChange={(value) => updateItemWithVendor(item._id, { selectedVendorId: value as Id<"vendors"> || null })}
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
                          ) : item.vendorQuotes && item.vendorQuotes.length > 0 ? (
                            <>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">Vendors Quoted:</span>
                                <span>{item.vendorQuotes.length} vendor{item.vendorQuotes.length !== 1 ? 's' : ''}</span>
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                {item.vendorQuotes.slice(0, 2).map((quote, index) => (
                                  <span key={quote.vendorId}>
                                    {getVendorName(quote.vendorId)}
                                    {index < Math.min(item.vendorQuotes!.length - 1, 1) && ', '}
                                  </span>
                                ))}
                                {item.vendorQuotes.length > 2 && ` +${item.vendorQuotes.length - 2} more`}
                              </div>
                            </>
                          ) : null}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions Footer - Manager Style */}
                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/50">
                    <div className="flex items-center gap-2">
                      {item.isUrgent && (
                        <Badge variant="destructive" className="text-[10px] px-2 py-0.5h-5 gap-1 shadow-sm">
                          <AlertCircle className="h-3 w-3" />
                          URGENT
                        </Badge>
                      )}
                      {(item.status === 'approved' || item.status === 'cc_approved') && (
                        <Badge className="bg-emerald-600/10 text-emerald-600 border-emerald-200 dark:border-emerald-800 dark:text-emerald-400 text-[10px] px-2 py-0.5 h-5 shadow-sm hover:bg-emerald-600/20" variant="outline">
                          Approved
                        </Badge>
                      )}
                      {(item.status === 'rejected' || item.status === 'cc_rejected') && (
                        <Badge variant="destructive" className="text-[10px] px-2 py-0.5 h-5 shadow-sm">
                          Rejected
                        </Badge>
                      )}
                      {item.isSplitApproved && (
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] px-2 py-0.5 h-5 gap-1 shadow-sm">
                          <CheckCircle className="h-3 w-3" />
                          Split Approved
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Primary Action Buttons based on Status */}

                      {/* Ready for Delivery / PO Actions */}
                      {["recheck", "pending", "approved"].includes(item.status) && (
                        <>
                          {(item.directAction === "delivery" || item.directAction === "all") && onDirectDelivery && (
                            <Button size="sm" onClick={() => setShowReadyForDeliveryConfirm(item._id)} disabled={!hasFullStock} className="h-7 text-xs bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100 hover:text-orange-800 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800" variant="outline">
                              <Truck className="h-3.5 w-3.5 mr-1.5" /> You can Deliver
                            </Button>
                          )}
                          {(item.directAction === "po" || item.directAction === "all") && onDirectPO && (
                            <Button size="sm" onClick={() => setShowReadyForPOConfirm(item._id)} className="h-7 text-xs bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100 hover:text-teal-800 dark:bg-teal-950/30 dark:text-teal-400 dark:border-teal-800" variant="outline">
                              <ShoppingCart className="h-3.5 w-3.5 mr-1.5" /> Ready for PO
                            </Button>
                          )}
                        </>
                      )}

                      {/* Manager Actions: Ready for CC / Check */}
                      {["approved", "recheck"].includes(item.status) && (
                        <>
                          {onMoveToCC && (
                            <Button size="sm" onClick={() => setShowReadyForCCConfirm(item._id)} className="h-7 text-xs bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:text-blue-800 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800" variant="outline">
                              <FileText className="h-3.5 w-3.5 mr-1.5" /> Ready for CC
                            </Button>
                          )}
                          {onCheck && (
                            <Button size="sm" onClick={() => onCheck(item._id)} className="h-7 text-xs bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 hover:text-purple-800 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800" variant="outline">
                              <PieChart className="h-3.5 w-3.5 mr-1.5" /> Check/Split
                            </Button>
                          )}
                        </>
                      )}

                      {/* Next Stage Actions */}
                      {item.status === "ready_for_cc" && (
                        <Button size="sm" onClick={() => (onOpenCC || onCheck)?.(item._id)} className="h-7 text-xs bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:text-blue-800 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800" variant="outline">
                          <FileText className="h-3.5 w-3.5 mr-1.5" /> CC
                        </Button>
                      )}

                      {item.status === "ready_for_po" && onCreatePO && (
                        <Button size="sm" onClick={() => onCreatePO(item._id)} className="h-7 text-xs bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800" variant="outline">
                          <ShoppingCart className="h-3.5 w-3.5 mr-1.5" /> Create PO
                        </Button>
                      )}

                      {/* Universal View Button Removed as per request */}

                    </div>
                  </div>
                </div>
              </div>

            );
          })}
        </div>
      </div>
      {/* Notes Timeline Dialog */}
      <NotesTimelineDialog
        requestNumber={requestNumber}
        open={isNotesOpen}
        onOpenChange={setIsNotesOpen}
      />

      {
        markDeliveryItem && (
          <CreateDeliveryDialog
            open={!!markDeliveryItem}
            onOpenChange={(open) => !open && setMarkDeliveryItem(null)}
            requestId={markDeliveryItem.id}
            poId={markDeliveryItem.poId}
            currentQuantity={markDeliveryItem.quantity}
            itemName={markDeliveryItem.name}
            unit={markDeliveryItem.unit}
          />
        )
      }

      {/* Ready for CC Confirmation Dialog */}
      {
        showReadyForCCConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="w-full max-w-sm mx-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-2xl p-6 transform transition-all scale-100">
              <div className="flex flex-col items-center text-center gap-4 mb-6">
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center ring-8 ring-blue-50 dark:ring-blue-900/10">
                  <FileText className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                    Ready for Cost Comparison
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 max-w-[260px] mx-auto leading-relaxed">
                    Are you sure you want to mark this item as ready for cost comparison?
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowReadyForCCConfirm(null)}
                  className="w-full h-11 font-medium border-gray-200 hover:bg-gray-50 hover:text-gray-900 dark:border-gray-700 dark:hover:bg-gray-800 dark:hover:text-white transition-colors"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (onMoveToCC && showReadyForCCConfirm) {
                      onMoveToCC(showReadyForCCConfirm);
                      setShowReadyForCCConfirm(null);
                    }
                  }}
                  className="w-full h-11 font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02]"
                >
                  Confirm
                </Button>
              </div>
            </div>
          </div>
        )
      }

      {/* Ready for PO Confirmation Dialog */}
      {
        showReadyForPOConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="w-full max-w-sm mx-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-2xl p-6 transform transition-all scale-100">
              <div className="flex flex-col items-center text-center gap-4 mb-6">
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center ring-8 ring-emerald-50 dark:ring-emerald-900/10">
                  <ShoppingCart className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                    Confirm Direct PO
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 max-w-[260px] mx-auto leading-relaxed mt-2">
                    This item will be marked for <span className="font-semibold text-emerald-600 dark:text-emerald-400">Direct Purchase Order</span>.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowReadyForPOConfirm(null)}
                  className="w-full h-11 font-medium border-gray-200 hover:bg-gray-50 hover:text-gray-900 dark:border-gray-700 dark:hover:bg-gray-800 dark:hover:text-white transition-colors"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (onDirectPO && showReadyForPOConfirm) {
                      onDirectPO(showReadyForPOConfirm);
                      setShowReadyForPOConfirm(null);
                    }
                  }}
                  className="w-full h-11 font-medium bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02]"
                >
                  Confirm PO
                </Button>
              </div>
            </div>
          </div>
        )
      }

      {/* Ready for Delivery Confirmation Dialog */}
      {
        showReadyForDeliveryConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="w-full max-w-sm mx-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-2xl p-6 transform transition-all scale-100">
              <div className="flex flex-col items-center text-center gap-4 mb-6">
                <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center ring-8 ring-orange-50 dark:ring-orange-900/10">
                  <Truck className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                    Confirm Direct Delivery
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 max-w-[260px] mx-auto leading-relaxed mt-2">
                    This item will be marked for <span className="font-semibold text-orange-600 dark:text-orange-400">Direct Delivery</span> from inventory.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowReadyForDeliveryConfirm(null)}
                  className="w-full h-11 font-medium border-gray-200 hover:bg-gray-50 hover:text-gray-900 dark:border-gray-700 dark:hover:bg-gray-800 dark:hover:text-white transition-colors"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (onDirectDelivery && showReadyForDeliveryConfirm) {
                      onDirectDelivery(showReadyForDeliveryConfirm);
                      setShowReadyForDeliveryConfirm(null);
                    }
                  }}
                  className="w-full h-11 font-medium bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-500/20 transition-all hover:scale-[1.02]"
                >
                  Confirm Delivery
                </Button>
              </div>
            </div>
          </div>
        )
      }

      {/* View DC Dialog */}
      <ViewDCDialog
        open={viewDCId !== null}
        onOpenChange={(open) => !open && setViewDCId(null)}
        deliveryId={viewDCId}
      />

      {/* Confirm Delivery Dialog */}
      {
        showConfirmDelivery && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 border border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-2xl font-bold text-center mb-3 text-gray-900 dark:text-white">
                Confirm Delivery
              </h3>
              <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
                Are you sure you want to confirm this delivery? This will mark the item as delivered.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowConfirmDelivery(null)}
                  className="w-full h-11 font-medium border-gray-200 hover:bg-gray-50 hover:text-gray-900 dark:border-gray-700 dark:hover:bg-gray-800 dark:hover:text-white transition-colors"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (showConfirmDelivery) {
                      handleConfirmDelivery(showConfirmDelivery);
                    }
                  }}
                  className="w-full h-11 font-medium bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02]"
                >
                  Confirm
                </Button>
              </div>
            </div>
          </div>
        )
      }

      {/* Edit PO Quantity Dialog - Shows BEFORE Create DC for pending_po items */}
      <EditPOQuantityDialog
        open={!!editQuantityItem}
        onOpenChange={(open) => !open && setEditQuantityItem(null)}
        requestId={editQuantityItem?.id || null}
        currentQuantity={editQuantityItem?.quantity || 0}
        itemName={editQuantityItem?.name || ""}
        unit={editQuantityItem?.unit || ""}
        onSuccess={() => {
          // After marking as ready, the item will move to ready_for_delivery status
          // Data will refresh automatically via Convex reactivity
          setEditQuantityItem(null);
        }}
      />
    </div >
  );
}
