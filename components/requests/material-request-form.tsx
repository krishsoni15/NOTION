"use client";

/**
 * Material Request Form Component
 * 
 * Dialog form for creating new material requests by site engineers.
 * Supports multiple items per request with same request number.
 */

import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { CameraDialog } from "@/components/inventory/camera-dialog";
import { 
  Camera, 
  Upload, 
  X, 
  Search, 
  AlertCircle, 
  Plus, 
  Trash2, 
  MapPin, 
  Calendar, 
  Package, 
  FileText, 
  Image as ImageIcon,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Info,
  Building2,
  Check,
  Hash,
  ChevronDown,
  Save,
  Send
} from "lucide-react";
import { toast } from "sonner";
import { normalizeSearchQuery, matchesSearchQuery, matchesAnySearchQuery } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import type { Id } from "@/convex/_generated/dataModel";

interface MaterialRequestFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draftRequestNumber?: string | null; // If provided, edit this draft
}

interface RequestItem {
  id: string;
  itemName: string;
  itemSearchQuery: string;
  description: string;
  quantityInput: string;
  quantity: number;
  unit: string;
  notes: string;
  images: File[];
  imagePreviews: string[];
  selectedItemFromInventory: { itemName: string; unit: string; centralStock?: number } | null;
  showItemSuggestions: boolean;
  showQuantitySuggestions: boolean;
  isUrgent: boolean;
}

export function MaterialRequestForm({
  open,
  onOpenChange,
  draftRequestNumber,
}: MaterialRequestFormProps) {
  const createMultipleRequests = useMutation(api.requests.createMultipleMaterialRequests);
  const saveAsDraft = useMutation(api.requests.saveMultipleMaterialRequestsAsDraft);
  const updateDraft = useMutation(api.requests.updateDraftRequest);
  const sendDraft = useMutation(api.requests.sendDraftRequest);
  
  // Get draft data if editing - using getUserRequests and filtering
  const allUserRequests = useQuery(api.requests.getUserRequests);
  const draftRequests = draftRequestNumber && allUserRequests
    ? allUserRequests.filter((r) => r.requestNumber === draftRequestNumber && r.status === "draft")
    : [];
  const assignedSites = useQuery(api.requests.getUserAssignedSites);
  const inventoryItems = useQuery(
    api.requests.getInventoryItemsForAutocomplete,
    {}
  );

  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [cameraOpen, setCameraOpen] = useState<{ itemId: string; open: boolean }>({ itemId: "", open: false });
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [siteDropdownOpen, setSiteDropdownOpen] = useState(false);
  const [siteSearchQuery, setSiteSearchQuery] = useState("");
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [openSiteInfoPopover, setOpenSiteInfoPopover] = useState<string | null>(null);

  // Shared form data
  const [sharedFormData, setSharedFormData] = useState({
    siteId: "" as Id<"sites"> | "",
    requiredBy: null as Date | null,
  });
  
  // Update search query when site is selected to show site name
  useEffect(() => {
    if (sharedFormData.siteId && !siteSearchQuery) {
      const selectedSite = assignedSites?.find((s) => s?._id === sharedFormData.siteId);
      if (selectedSite) {
        setSiteSearchQuery(selectedSite.name);
      }
    }
  }, [sharedFormData.siteId, assignedSites, siteSearchQuery]);

  // Items array
  const [items, setItems] = useState<RequestItem[]>([
    {
      id: "1",
    itemName: "",
      itemSearchQuery: "",
    description: "",
      quantityInput: "",
    quantity: 0,
    unit: "",
    notes: "",
      images: [],
      imagePreviews: [],
      selectedItemFromInventory: null,
      showItemSuggestions: false,
      showQuantitySuggestions: false,
      isUrgent: false,
    },
  ]);

  // Refs for each item's inputs
  const itemRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const quantityRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // Filter inventory items based on search query
  const filteredInventoryItems = inventoryItems?.filter((item) => {
    const normalizedQuery = normalizeSearchQuery("");
    if (!normalizedQuery) return true;
    return matchesSearchQuery(item.itemName, normalizedQuery);
  }) || [];

  // Load draft data when editing
  useEffect(() => {
    // Wait for allUserRequests to load before processing draft data
    if (open && draftRequestNumber && allUserRequests !== undefined) {
      const filteredDrafts = allUserRequests.filter(
        (r) => r.requestNumber === draftRequestNumber && r.status === "draft"
      );
      
      if (filteredDrafts.length > 0) {
        const firstRequest = filteredDrafts[0];
      setSharedFormData({
        siteId: firstRequest.siteId,
        requiredBy: new Date(firstRequest.requiredBy),
      });
      
        // Convert draft requests to form items with sequential IDs (1, 2, 3...)
        const draftItems: RequestItem[] = filteredDrafts
          .sort((a, b) => {
            // Sort by itemOrder (1, 2, 3...) or createdAt as fallback
            const orderA = a.itemOrder ?? a.createdAt;
            const orderB = b.itemOrder ?? b.createdAt;
            return orderA - orderB; // Ascending: 1, 2, 3...
          })
          .map((req, index) => {
        const quantityInput = `${req.quantity} ${req.unit}`;
        return {
              id: `${index + 1}`, // Sequential IDs: 1, 2, 3...
          itemName: req.itemName,
          itemSearchQuery: req.itemName,
          description: req.description,
          quantityInput: quantityInput,
          quantity: req.quantity,
          unit: req.unit,
          notes: req.notes || "",
          images: [],
          imagePreviews: req.photo ? [req.photo.imageUrl] : [],
          selectedItemFromInventory: null,
          showItemSuggestions: false,
          showQuantitySuggestions: false,
          isUrgent: req.isUrgent,
        };
      });
      
      // Ensure items are sorted by ID before setting state
      const sortedDraftItems = draftItems.sort((a, b) => {
        const idA = parseInt(a.id, 10) || 0;
        const idB = parseInt(b.id, 10) || 0;
        return idA - idB; // Ascending: 1, 2, 3...
      });
      
      setItems(sortedDraftItems.length > 0 ? sortedDraftItems : [{
        id: "1",
        itemName: "",
        itemSearchQuery: "",
        description: "",
        quantityInput: "",
        quantity: 0,
        unit: "",
        notes: "",
        images: [],
        imagePreviews: [],
        selectedItemFromInventory: null,
        showItemSuggestions: false,
        showQuantitySuggestions: false,
        isUrgent: false,
      }]);
    }
    }
  }, [open, draftRequestNumber, allUserRequests]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setSharedFormData({
        siteId: "" as Id<"sites"> | "",
        requiredBy: null,
      });
      setItems([
        {
          id: "1",
        itemName: "",
          itemSearchQuery: "",
        description: "",
          quantityInput: "",
        quantity: 0,
        unit: "",
        notes: "",
          images: [],
          imagePreviews: [],
          selectedItemFromInventory: null,
          showItemSuggestions: false,
          showQuantitySuggestions: false,
          isUrgent: false,
        },
      ]);
      setError("");
      setShowConfirmDialog(false);
      setSiteDropdownOpen(false);
      setSiteSearchQuery("");
    }
  }, [open]);

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
    const firstNumberMatch = trimmedInput.match(/^(\d+(?:\.\d+)?)/);
    if (firstNumberMatch) {
      const number = firstNumberMatch[1];
      const numberValue = parseFloat(number);
      const afterNumber = trimmedInput.substring(firstNumberMatch[0].length).trim();
      const unitPart = afterNumber.replace(/\d+/g, '').trim().toLowerCase();
      
      const selectedItemUnit = itemUnit ? itemUnit.replace(/\d+/g, '').trim().toLowerCase() : "";
      const relatedUnits = selectedItemUnit ? getRelatedUnits(selectedItemUnit) : [];
      
      if (unitPart.length === 0) {
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
    return [];
  };

  // Parse quantity input
  const parseQuantityInput = (input: string): { quantity: number; unit: string } => {
    const trimmedInput = input.trim();
    const firstNumberMatch = trimmedInput.match(/^(\d+(?:\.\d+)?)/);
    if (firstNumberMatch) {
      const quantity = parseFloat(firstNumberMatch[1]) || 0;
      const afterNumber = trimmedInput.substring(firstNumberMatch[0].length).trim();
      const unit = afterNumber.replace(/\d+/g, '').trim();
      return { quantity, unit };
    }
    return { quantity: 0, unit: "" };
  };

  // Clean unit
  const cleanUnit = (unit: string): string => {
    if (!unit) return "";
    return unit.replace(/\d+/g, '').trim();
  };

  // Update item field
  const updateItem = (itemId: string, updates: Partial<RequestItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, ...updates } : item))
    );
  };

  // Add new item (adds to end so items appear in order: 1, 2, 3...)
  const addItem = () => {
    // Generate sequential ID based on current items
    const maxId = items.reduce((max, item) => {
      const numId = parseInt(item.id, 10);
      return isNaN(numId) ? max : Math.max(max, numId);
    }, 0);
    const newId = `${maxId + 1}`;
    
    setItems((prev) => {
      const newItem = {
        id: newId,
        itemName: "",
        itemSearchQuery: "",
        description: "",
        quantityInput: "",
        quantity: 0,
        unit: "",
        notes: "",
        images: [],
        imagePreviews: [],
        selectedItemFromInventory: null,
        showItemSuggestions: false,
        showQuantitySuggestions: false,
        isUrgent: false,
      };
      // Add to end, sort by current ID, then renumber sequentially
      const updated = [...prev, newItem];
      const sorted = updated.sort((a, b) => {
        const idA = parseInt(a.id, 10) || 0;
        const idB = parseInt(b.id, 10) || 0;
        return idA - idB; // Sort ascending: 1, 2, 3...
      });
      return sorted.map((item, idx) => ({
        ...item,
        id: `${idx + 1}`, // Sequential IDs: 1, 2, 3...
      }));
    });
    // Visual feedback
    toast.success("New item added!", { duration: 1500 });
  };

  // Remove item
  const removeItem = (itemId: string) => {
    if (items.length === 1) {
      toast.error("At least one item is required");
      return;
    }
    setItems((prev) => {
      // Remove item, sort by current ID, then renumber remaining items sequentially
      const filtered = prev.filter((item) => item.id !== itemId);
      const sorted = filtered.sort((a, b) => {
        const idA = parseInt(a.id, 10) || 0;
        const idB = parseInt(b.id, 10) || 0;
        return idA - idB; // Sort ascending: 1, 2, 3...
      });
      return sorted.map((item, idx) => ({
        ...item,
        id: `${idx + 1}`, // Sequential IDs: 1, 2, 3...
      }));
    });
  };

  // Handle item selection from autocomplete
  const handleItemSelect = (itemId: string, item: { itemName: string; unit?: string; centralStock?: number }) => {
    const cleanedUnit = cleanUnit(item.unit || "");
    updateItem(itemId, {
      itemName: item.itemName,
      itemSearchQuery: item.itemName,
      selectedItemFromInventory: {
        itemName: item.itemName,
        unit: cleanedUnit,
        centralStock: item.centralStock || 0,
      },
      showItemSuggestions: false,
    });
    itemRefs.current[itemId]?.blur();
  };

  // Handle quantity input change
  const handleQuantityInputChange = (itemId: string, value: string) => {
    const parsed = parseQuantityInput(value);
    updateItem(itemId, {
      quantityInput: value,
      quantity: parsed.quantity,
      unit: parsed.unit,
      showQuantitySuggestions: value.length > 0,
    });
  };

  // Handle quantity suggestion select
  const handleQuantitySelect = (itemId: string, suggestion: string) => {
    const parsed = parseQuantityInput(suggestion);
    updateItem(itemId, {
      quantityInput: suggestion,
      quantity: parsed.quantity,
      unit: parsed.unit,
      showQuantitySuggestions: false,
    });
    quantityRefs.current[itemId]?.blur();
  };

  // Handle image selection
  const handleImageSelect = (itemId: string, files: FileList | null) => {
    if (!files) return;
    const newFiles = Array.from(files);
    const validFiles = newFiles.filter((file) => file.type.startsWith("image/"));
    if (validFiles.length === 0) {
      toast.error("Please select image files only");
      return;
    }
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    const updatedImages = [...item.images, ...validFiles];
    const updatedPreviews = [...item.imagePreviews];

    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        updatedPreviews.push(reader.result as string);
        updateItem(itemId, { imagePreviews: [...updatedPreviews] });
      };
      reader.readAsDataURL(file);
    });
    
    updateItem(itemId, { images: updatedImages });
  };

  // Handle camera capture
  const handleCameraCapture = (file: File) => {
    if (!cameraOpen.itemId) return;
    const item = items.find((i) => i.id === cameraOpen.itemId);
    if (!item) return;
    
    const updatedImages = [...item.images, file];
    const updatedPreviews = [...item.imagePreviews];
    
    const reader = new FileReader();
    reader.onloadend = () => {
      updatedPreviews.push(reader.result as string);
      updateItem(cameraOpen.itemId, {
        images: updatedImages,
        imagePreviews: updatedPreviews,
      });
    };
    reader.readAsDataURL(file);
  };

  // Remove image
  const removeImage = (itemId: string, index: number) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return;
    updateItem(itemId, {
      images: item.images.filter((_, i) => i !== index),
      imagePreviews: item.imagePreviews.filter((_, i) => i !== index),
    });
  };

  // Upload image for an item
  const uploadImage = async (file: File): Promise<{
    imageUrl: string;
    imageKey: string;
  } | null> => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("itemId", "request-photo");

      const response = await fetch("/api/upload/image", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          error: "Upload failed",
        }));
        throw new Error(errorData.error || "Failed to upload image");
      }

      const data = await response.json();
      if (!data.imageUrl || !data.imageKey) {
        throw new Error("Invalid response from upload API");
      }

      return { imageUrl: data.imageUrl, imageKey: data.imageKey };
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  // Comprehensive validation - checks all fields
  const isFormValid = (): boolean => {
    // Check shared fields
    if (!sharedFormData.siteId || sharedFormData.siteId === "") {
      return false;
    }
    if (!sharedFormData.requiredBy || !(sharedFormData.requiredBy instanceof Date)) {
      return false;
    }

    // Check if date is valid
    if (isNaN(sharedFormData.requiredBy.getTime())) {
      return false;
    }

    // Validate each item
    for (const item of items) {
      // Item name validation
      const trimmedItemName = item.itemName.trim();
      if (!trimmedItemName || trimmedItemName.length === 0) {
        return false;
      }
      if (trimmedItemName.length > 200) {
        return false; // Reasonable max length
      }

      // Quantity validation
      if (item.quantity <= 0 || !isFinite(item.quantity)) {
        return false;
      }
      if (item.quantity > 1000000) {
        return false; // Reasonable max quantity
      }

      // Unit validation
      const trimmedUnit = item.unit.trim();
      if (!trimmedUnit || trimmedUnit.length === 0) {
        return false;
      }
      if (trimmedUnit.length > 50) {
        return false; // Reasonable max length
      }

      // Description validation (required)
      const trimmedDescription = item.description.trim();
      if (!trimmedDescription || trimmedDescription.length === 0) {
        return false;
      }
      if (trimmedDescription.length > 1000) {
        return false;
      }

      // Notes validation (optional but if provided, check length)
      if (item.notes && item.notes.length > 1000) {
        return false;
      }

      // Quantity input should be valid and match stored values
      if (!item.quantityInput.trim()) {
        return false;
      }
      const parsed = parseQuantityInput(item.quantityInput);
      // Check if parsed values match stored values (with tolerance for floating point)
      if (parsed.quantity <= 0 || !parsed.unit.trim()) {
        return false;
      }
      // Allow small floating point differences
      if (Math.abs(parsed.quantity - item.quantity) > 0.001) {
        return false;
      }
      if (parsed.unit.trim().toLowerCase() !== item.unit.trim().toLowerCase()) {
        return false;
      }
    }

    return true;
  };

  // Get validation error message
  const getValidationError = (): string | null => {
    if (!sharedFormData.siteId || sharedFormData.siteId === "") {
      return "Please select a site location";
    }
    if (!sharedFormData.requiredBy || !(sharedFormData.requiredBy instanceof Date)) {
      return "Please select a required date";
    }
    if (isNaN(sharedFormData.requiredBy.getTime())) {
      return "Please select a valid date";
    }

    // Check if date is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(sharedFormData.requiredBy);
    selectedDate.setHours(0, 0, 0, 0);
    if (selectedDate < today) {
      return "Required date cannot be in the past";
    }

    // Validate each item
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const itemNum = i + 1;

      // Item name validation
      const trimmedItemName = item.itemName.trim();
      if (!trimmedItemName || trimmedItemName.length === 0) {
        return `Item ${itemNum}: Please enter an item name`;
      }
      if (trimmedItemName.length > 200) {
        return `Item ${itemNum}: Item name is too long (max 200 characters)`;
      }

      // Quantity validation
      if (item.quantity <= 0 || !isFinite(item.quantity)) {
        return `Item ${itemNum}: Please enter a valid quantity (must be greater than 0)`;
      }
      if (item.quantity > 1000000) {
        return `Item ${itemNum}: Quantity is too large (max 1,000,000)`;
      }

      // Unit validation
      const trimmedUnit = item.unit.trim();
      if (!trimmedUnit || trimmedUnit.length === 0) {
        return `Item ${itemNum}: Please enter a unit (e.g., kg, bags, nos)`;
      }
      if (trimmedUnit.length > 50) {
        return `Item ${itemNum}: Unit is too long (max 50 characters)`;
      }

      // Description validation (required)
      const trimmedDescription = item.description.trim();
      if (!trimmedDescription || trimmedDescription.length === 0) {
        return `Item ${itemNum}: Description is required`;
      }
      if (trimmedDescription.length > 1000) {
        return `Item ${itemNum}: Description is too long (max 1000 characters)`;
      }

      // Notes validation
      if (item.notes && item.notes.length > 1000) {
        return `Item ${itemNum}: Notes are too long (max 1000 characters)`;
      }

      // Quantity input validation
      if (!item.quantityInput.trim()) {
        return `Item ${itemNum}: Please enter quantity with unit (e.g., "10 kg" or "5 bags")`;
      }
      const parsed = parseQuantityInput(item.quantityInput);
      if (parsed.quantity <= 0 || !parsed.unit.trim()) {
        return `Item ${itemNum}: Invalid quantity format. Use format like "10 kg" or "5 bags"`;
      }
      // Check if parsed quantity matches stored quantity (with small tolerance for floating point)
      if (Math.abs(parsed.quantity - item.quantity) > 0.001) {
        return `Item ${itemNum}: Quantity mismatch. Please re-enter quantity`;
      }
      if (parsed.unit.trim().toLowerCase() !== trimmedUnit.toLowerCase()) {
        return `Item ${itemNum}: Unit mismatch. Please re-enter quantity with correct unit`;
      }
    }

    return null;
  };

  // Handle save as draft
  const handleSaveDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Basic validation for draft (site and date required)
    if (!sharedFormData.siteId || sharedFormData.siteId === "") {
      setError("Please select a site location");
      return;
    }
    if (!sharedFormData.requiredBy || !(sharedFormData.requiredBy instanceof Date)) {
      setError("Please select a required date");
      return;
    }
    if (isNaN(sharedFormData.requiredBy.getTime())) {
      setError("Please select a valid date");
      return;
    }

    // Check if at least one item has name and quantity
    const hasValidItem = items.some((item) => {
      const trimmedItemName = item.itemName.trim();
      return trimmedItemName.length > 0 && item.quantity > 0 && item.unit.trim().length > 0;
    });

    if (!hasValidItem) {
      setError("Please add at least one item with name, quantity, and unit");
      return;
    }

    setIsLoading(true);

    try {
      // Upload images for all items first
      const itemsWithPhotos = await Promise.all(
        items.map(async (item) => {
          let photo = null;
          if (item.images.length > 0) {
            setUploadingItemId(item.id);
            try {
              photo = await uploadImage(item.images[0]);
            } finally {
              setUploadingItemId(null);
            }
          }
          return {
            itemName: item.itemName.trim() || "Draft Item",
            description: item.description.trim() || "Draft description",
            quantity: item.quantity || 1,
            unit: item.unit.trim() || "nos",
            notes: item.notes.trim() || undefined,
            photo: photo || undefined,
            isUrgent: item.isUrgent,
          };
        })
      );

      // Save or update draft
      if (draftRequestNumber) {
        // Update existing draft
        const result = await updateDraft({
          requestNumber: draftRequestNumber,
          siteId: sharedFormData.siteId as Id<"sites">,
          requiredBy: sharedFormData.requiredBy!.getTime(),
          items: itemsWithPhotos,
        });

        toast.success(
          `Draft updated successfully! Request #${result.requestNumber} has been updated.`
        );
      } else {
        // Create new draft
        const result = await saveAsDraft({
          siteId: sharedFormData.siteId as Id<"sites">,
          requiredBy: sharedFormData.requiredBy!.getTime(),
          items: itemsWithPhotos,
        });

        toast.success(
          `Draft saved successfully! Request #${result.requestNumber} has been saved.`
        );
      }
      onOpenChange(false);
    } catch (err: any) {
      console.error("Error saving draft:", err);
      setError(err.message || "Failed to save draft");
      toast.error(err.message || "Failed to save draft");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle form submission (shows confirmation first)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Double-check validation
    if (!isFormValid()) {
      const validationError = getValidationError();
      setError(validationError || "Please fill in all required fields correctly");
      return;
    }

    // Show confirmation dialog
    setShowConfirmDialog(true);
  };

  // Actually submit the form after confirmation
  const confirmSubmit = async () => {
    setShowConfirmDialog(false);
    setIsLoading(true);

    try {
      // Upload images for all items first
      const itemsWithPhotos = await Promise.all(
        items.map(async (item) => {
      let photo = null;
          if (item.images.length > 0) {
            setUploadingItemId(item.id);
            try {
              photo = await uploadImage(item.images[0]);
            } finally {
              setUploadingItemId(null);
            }
          }
          return {
            itemName: item.itemName.trim(),
            description: item.description.trim() || "",
            quantity: item.quantity,
            unit: item.unit.trim(),
            notes: item.notes.trim() || undefined,
        photo: photo || undefined,
            isUrgent: item.isUrgent,
          };
        })
      );

      // If editing a draft, update it first then send it
      if (draftRequestNumber) {
        // First update the draft
        await updateDraft({
          requestNumber: draftRequestNumber,
          siteId: sharedFormData.siteId as Id<"sites">,
          requiredBy: sharedFormData.requiredBy!.getTime(),
          items: itemsWithPhotos,
        });

        // Then send it (convert to pending)
        const result = await sendDraft({ requestNumber: draftRequestNumber });

        toast.success(
          `Draft updated and sent successfully! Request #${result.requestNumber} has been created.`
        );
      } else {
      // Create all requests with the same request number
      const result = await createMultipleRequests({
        siteId: sharedFormData.siteId as Id<"sites">,
        requiredBy: sharedFormData.requiredBy!.getTime(),
        items: itemsWithPhotos,
      });

      toast.success(
        `Successfully created request #${result.requestNumber} with ${items.length} item${items.length > 1 ? 's' : ''}`
      );
      }
      
      onOpenChange(false);
      
      // Scroll to top after a short delay to see the new request
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }, 300);
    } catch (err: any) {
      console.error("Error creating request:", err);
      setError(err.message || "Failed to create request");
      toast.error(err.message || "Failed to create request");
    } finally {
      setIsLoading(false);
      setUploadingItemId(null);
    }
  };

  // Get filtered items for autocomplete
  const getFilteredItems = (itemId: string) => {
    const item = items.find((i) => i.id === itemId);
    if (!item) return [];
    const normalizedQuery = normalizeSearchQuery(item.itemSearchQuery);
    if (!normalizedQuery) return inventoryItems || [];
    return (inventoryItems || []).filter((invItem) =>
      matchesSearchQuery(invItem.itemName, normalizedQuery)
    );
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close item suggestions
      items.forEach((item) => {
      if (
          itemRefs.current[item.id] &&
          !itemRefs.current[item.id]?.contains(event.target as Node) &&
        !(event.target as HTMLElement)?.closest('[data-item-suggestions]')
      ) {
          updateItem(item.id, { showItemSuggestions: false });
        }
      });

      // Close quantity suggestions
      items.forEach((item) => {
        if (
          quantityRefs.current[item.id] &&
          !quantityRefs.current[item.id]?.contains(event.target as Node) &&
          !(event.target as HTMLElement)?.closest('[data-quantity-suggestions]')
        ) {
          updateItem(item.id, { showQuantitySuggestions: false });
        }
      });
    };

      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
  }, [items]);

  // Clear error when form becomes valid
  useEffect(() => {
    if (error && isFormValid()) {
      setError("");
    }
  }, [sharedFormData, items, error]);

  // Real-time date validation - check if date is in the past
  useEffect(() => {
    if (!sharedFormData.requiredBy) {
      setDateError(null);
    } else if (sharedFormData.requiredBy instanceof Date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selectedDate = new Date(sharedFormData.requiredBy);
      selectedDate.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        setDateError("Required date cannot be in the past");
      } else {
        setDateError(null);
      }
    }
  }, [sharedFormData.requiredBy]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] sm:max-w-6xl lg:max-w-7xl max-h-[95vh] overflow-y-auto p-0 sm:p-0">
          <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b bg-gradient-to-r from-primary/5 to-primary/10">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Package className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <DialogTitle className="text-lg sm:text-xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                {draftRequestNumber ? "Edit Draft Request" : "New Material Request"}
              </DialogTitle>
            </div>
          </DialogHeader>
          <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 md:space-y-6 lg:space-y-8">
            {error && (
              <div className="flex items-start gap-3 p-3.5 sm:p-4 text-xs sm:text-sm text-destructive bg-destructive/10 border-l-4 border-destructive rounded-lg shadow-sm">
                <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 mt-0.5 flex-shrink-0" />
                <span className="flex-1 font-medium">{error}</span>
              </div>
            )}

            {/* Shared Fields */}
            <div className="space-y-4 sm:space-y-5 lg:space-y-6 p-4 sm:p-5 lg:p-6 bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl border shadow-sm hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center gap-2 sm:gap-2.5 pb-2 border-b border-border/50">
                <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                <h3 className="text-sm sm:text-base font-bold text-foreground">Request Details</h3>
              </div>

              {/* Two Column Layout for Desktop: Site Location and Required By */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 lg:gap-6">
                {/* Site Location */}
                <div className="space-y-2 sm:space-y-2.5">
                  <Label htmlFor="siteId" className="text-xs sm:text-sm font-semibold flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                    Site Location <span className="text-destructive">*</span>
                  </Label>
              <Popover 
                open={siteDropdownOpen} 
                onOpenChange={(open) => {
                  setSiteDropdownOpen(open);
                  if (!open) {
                    // Close info popover when site dropdown closes
                    setOpenSiteInfoPopover(null);
                  }
                }} 
                modal={false}
              >
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    id="siteId"
                    disabled={isLoading}
                    className="w-full h-10 sm:h-11 text-sm border-2 hover:border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 justify-between font-normal bg-background"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {sharedFormData.siteId ? (
                        <>
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate text-left">
                            {assignedSites?.find((s) => s?._id === sharedFormData.siteId)?.name || "Selected site"}
                          </span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">Select site location</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {sharedFormData.siteId && (
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSharedFormData((prev) => ({ ...prev, siteId: "" as Id<"sites"> | "" }));
                            setSiteSearchQuery("");
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              e.stopPropagation();
                              setSharedFormData((prev) => ({ ...prev, siteId: "" as Id<"sites"> | "" }));
                              setSiteSearchQuery("");
                            }
                          }}
                          className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
                          aria-label="Clear selection"
                        >
                          <X className="h-3.5 w-3.5" />
                        </div>
                      )}
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${siteDropdownOpen ? "rotate-180" : ""}`} />
                    </div>
                  </Button>
                </PopoverTrigger>
                <PopoverContent 
                  className="w-[var(--radix-popover-trigger-width)] p-0 z-[100]" 
                  align="start" 
                  sideOffset={4}
                  onOpenAutoFocus={(e) => e.preventDefault()}
                >
                  <div className="p-3 border-b bg-muted/30">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Search sites..."
                        value={siteSearchQuery}
                        onChange={(e) => setSiteSearchQuery(e.target.value)}
                        onFocus={(e) => e.stopPropagation()}
                        className="pl-9 h-9 text-sm"
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="max-h-[300px] overflow-y-auto">
                    {!assignedSites ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        Loading sites...
                      </div>
                    ) : (() => {
                      const filteredSites = assignedSites
                        .filter((site): site is NonNullable<typeof site> => site !== null)
                        .filter((site) => {
                          const normalizedQuery = normalizeSearchQuery(siteSearchQuery);
                          if (!normalizedQuery) return true;
                          return matchesAnySearchQuery(
                            [site.name, site.code, site.address, site.description].filter(Boolean) as string[],
                            normalizedQuery
                          );
                        });
                      
                      return filteredSites.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          {siteSearchQuery ? "No sites found" : "No sites assigned"}
                        </div>
                      ) : (
                        <div className="p-1">
                          {filteredSites.map((site) => {
                            const isSelected = sharedFormData.siteId === site._id;
                            return (
                              <div key={site._id} className="relative group">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setSharedFormData((prev) => ({ ...prev, siteId: site._id }));
                                    setSiteSearchQuery("");
                                    setSiteDropdownOpen(false);
                                  }}
                                  className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-md text-sm text-left transition-all ${
                                    isSelected
                                      ? "bg-primary/10 hover:bg-primary/15 border border-primary/20"
                                      : "hover:bg-accent pr-12"
                                  }`}
                                >
                                  <div
                                    className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                                      isSelected
                                        ? "bg-primary border-primary"
                                        : "border-input group-hover:border-primary/50"
                                    }`}
                                  >
                                    {isSelected && (
                                      <Check className="h-3 w-3 text-primary-foreground" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium truncate flex items-center gap-1.5">
                                      <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                      {site.name}
                                    </div>
                                    {site.code && (
                                      <div className="text-xs text-muted-foreground mt-0.5">
                                        Code: {site.code}
                                      </div>
                                    )}
                                    {site.address && (
                                      <div className="flex items-center gap-1 mt-0.5">
                                        <div className="text-xs text-muted-foreground truncate flex-1">
                                          {site.address}
                                        </div>
                                        <div
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const encodedAddress = encodeURIComponent(site.address || '');
                                            const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
                                            window.open(mapUrl, '_blank');
                                          }}
                                          className="text-muted-foreground hover:text-primary transition-colors p-1 rounded-full hover:bg-muted/50 shrink-0 border border-muted-foreground/20 hover:border-primary/40 cursor-pointer"
                                          title="Open in Maps"
                                        >
                                          <MapPin className="h-2.5 w-2.5" />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </button>
                                <div
                                  className="absolute right-2 top-1/2 -translate-y-1/2 shrink-0 z-10"
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Popover 
                                    open={openSiteInfoPopover === site._id} 
                                    onOpenChange={(open) => {
                                      if (open) {
                                        setOpenSiteInfoPopover(site._id);
                                      } else {
                                        setOpenSiteInfoPopover(null);
                                      }
                                    }}
                                  >
                                    <PopoverTrigger asChild>
                                      <button
                                        type="button"
                                        onMouseDown={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                        }}
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          setOpenSiteInfoPopover(openSiteInfoPopover === site._id ? null : site._id);
                                        }}
                                        className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-primary/10 active:bg-primary/20 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-primary/20 touch-manipulation"
                                        aria-label="View site details"
                                      >
                                        <Info className="h-4 w-4 text-primary" />
                                      </button>
                                    </PopoverTrigger>
                                    <PopoverContent 
                                      className="w-80 sm:w-96 p-5 z-[200]" 
                                      align="end"
                                      side="left"
                                      onPointerDownOutside={(e) => {
                                        const target = e.target as HTMLElement;
                                        // Don't close if clicking inside the site dropdown
                                        if (target.closest('[role="dialog"]') || target.closest('[data-radix-popper-content-wrapper]')) {
                                          e.preventDefault();
                                        }
                                      }}
                                      onInteractOutside={(e) => {
                                        // Prevent closing when clicking outside if it's within the site dropdown
                                        const target = e.target as HTMLElement;
                                        if (target.closest('[data-radix-popover-content]')) {
                                          e.preventDefault();
                                        }
                                      }}
                                    >
                                      <div className="space-y-4">
                                        <div className="flex items-center gap-3 pb-3 border-b-2 border-border">
                                          <div className="p-2.5 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10">
                                            <Building2 className="h-6 w-6 text-primary" />
                                          </div>
                                          <div className="flex-1">
                                            <h4 className="font-bold text-base">{site.name}</h4>
                                            {site.code && (
                                              <p className="text-xs text-muted-foreground mt-0.5">Site Code: {site.code}</p>
                                            )}
                                          </div>
                                        </div>
                                        <div className="space-y-3">
                                          {site.code && (
                                            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border">
                                              <Hash className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                              <div className="flex-1 min-w-0">
                                                <p className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Site Code</p>
                                                <p className="text-sm font-medium">{site.code}</p>
                                              </div>
                                            </div>
                                          )}
                                          {site.address ? (
                                            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border">
                                              <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                              <div className="flex-1 min-w-0">
                                                <p className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Address</p>
                                                <div className="flex items-center gap-2">
                                                  <p className="text-sm font-medium break-words flex-1">{site.address}</p>
                                                  <button
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      const encodedAddress = encodeURIComponent(site.address || '');
                                                      const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
                                                      window.open(mapUrl, '_blank');
                                                    }}
                                                    className="text-primary hover:text-primary/80 hover:bg-primary/10 rounded-full p-2 transition-colors shrink-0 border border-primary/20 hover:border-primary/40"
                                                    title="Open in Maps"
                                                  >
                                                    <MapPin className="h-3.5 w-3.5" />
                                                  </button>
                                                </div>
                                              </div>
                                            </div>
                                          ) : (
                                            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-dashed">
                                              <MapPin className="h-5 w-5 text-muted-foreground shrink-0" />
                                              <p className="text-xs text-muted-foreground italic">No address provided</p>
                                            </div>
                                          )}
                                          {site.description ? (
                                            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border">
                                              <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                              <div className="flex-1 min-w-0">
                                                <p className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">Description</p>
                                                <p className="text-sm font-medium break-words">{site.description}</p>
                                              </div>
                                            </div>
                                          ) : null}
                                        </div>
                                      </div>
                                    </PopoverContent>
                                  </Popover>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </PopoverContent>
              </Popover>
              </div>

              {/* Required By Date */}
              <div className="space-y-2 sm:space-y-2.5">
                <Label className="text-xs sm:text-sm font-semibold flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                  Required By <span className="text-destructive">*</span>
                </Label>
                <DatePicker
                  value={sharedFormData.requiredBy}
                  onChange={(date) => {
                    setSharedFormData((prev) => ({ ...prev, requiredBy: date }));
                    
                    // Real-time validation for past dates
                    if (date) {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const selectedDate = new Date(date);
                      selectedDate.setHours(0, 0, 0, 0);
                      
                      if (selectedDate < today) {
                        setDateError("Required date cannot be in the past");
                      } else {
                        setDateError(null);
                      }
                    } else {
                      setDateError(null);
                    }
                  }}
                  placeholder="DD/MM/YYYY"
                  disabled={isLoading}
                  error={!!dateError}
                />
                {dateError && (
                  <p className="text-xs text-destructive flex items-center gap-1.5 mt-1">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    {dateError}
                  </p>
                )}
              </div>
              </div>
            </div>

            {/* Items Section */}
            <div className="space-y-4 sm:space-y-5 lg:space-y-6">
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
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={addItem}
                  disabled={isLoading}
                  className="gap-1.5 sm:gap-2 text-xs sm:text-sm h-8 sm:h-9 font-semibold shadow-sm hover:shadow-lg hover:scale-105 active:scale-95 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary transition-all duration-200 focus:ring-2 focus:ring-primary/50 focus:ring-offset-2"
                >
                  <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4 transition-transform group-hover:rotate-90" />
                  <span className="hidden sm:inline">Add Item</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </div>

              {items
                .slice()
                .sort((a, b) => {
                  // Sort by ID descending to show latest items first (3, 2, 1...)
                  const idA = parseInt(a.id, 10) || 0;
                  const idB = parseInt(b.id, 10) || 0;
                  return idB - idA; // Descending: latest first
                })
                .map((item, index) => {
                // Use the item's ID directly for display (sequential: 1, 2, 3...)
                const displayNumber = parseInt(item.id, 10) || index + 1;
                return (
                  <div key={item.id} className="space-y-4 sm:space-y-5 lg:space-y-6 p-4 sm:p-5 lg:p-6 border-2 rounded-xl bg-card shadow-md hover:shadow-xl hover:border-primary/30 transition-all duration-200 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50">
                  <div className="flex items-center justify-between mb-2 sm:mb-3 pb-3 border-b-2 border-border/60">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-bold text-sm sm:text-base shadow-sm">
                        {displayNumber}
                      </div>
                      <h4 className="text-sm sm:text-base font-bold text-foreground">
                        Item {displayNumber}
                      </h4>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Urgent Checkbox per Item */}
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <Checkbox
                          id={`urgent-${item.id}`}
                          checked={item.isUrgent}
                          onCheckedChange={(checked) =>
                            updateItem(item.id, { isUrgent: checked === true })
                          }
                          disabled={isLoading}
                          className="h-4 w-4 sm:h-5 sm:w-5 border-2 data-[state=checked]:bg-destructive data-[state=checked]:border-destructive hover:border-destructive/70 focus:ring-2 focus:ring-destructive/20 transition-all duration-200"
                        />
                        <Label
                          htmlFor={`urgent-${item.id}`}
                          className="text-xs sm:text-sm font-semibold cursor-pointer text-destructive flex items-center gap-1"
                        >
                          <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                          Urgent
                        </Label>
                      </div>
                      {items.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.id)}
                          disabled={isLoading}
                          className="h-7 w-7 sm:h-8 sm:w-8 p-0 text-destructive hover:text-destructive-foreground hover:bg-destructive hover:scale-110 active:scale-95 focus:ring-2 focus:ring-destructive/20 transition-all duration-200 rounded-lg"
                        >
                          <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </Button>
                      )}
                    </div>
            </div>

                {/* Select Item and Quantity - Same Row on Desktop */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 lg:gap-6">
                  {/* Item Name with Autocomplete */}
                  <div className="space-y-2 sm:space-y-2.5">
                    <Label className="text-xs sm:text-sm font-semibold flex items-center gap-1.5">
                      <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                      Select Item <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Input
                        ref={(el) => {
                          itemRefs.current[item.id] = el;
                        }}
                        value={item.itemSearchQuery}
                        onChange={(e) => {
                          updateItem(item.id, {
                            itemSearchQuery: e.target.value,
                            itemName: e.target.value,
                            showItemSuggestions: true,
                          });
                          if (e.target.value !== item.selectedItemFromInventory?.itemName) {
                            updateItem(item.id, { selectedItemFromInventory: null });
                          }
                        }}
                        onFocus={() => updateItem(item.id, { showItemSuggestions: true })}
                        placeholder="Start typing to search items..."
                        disabled={isLoading}
                        className="w-full h-10 sm:h-11 text-sm border-2 hover:border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                      />
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      {item.showItemSuggestions &&
                        getFilteredItems(item.id).length > 0 &&
                        item.itemSearchQuery.length > 0 && (
                          <div
                            data-item-suggestions
                            className="absolute z-50 w-full mt-1 rounded-md border bg-popover text-popover-foreground shadow-md max-h-60 overflow-y-auto"
                          >
                            {getFilteredItems(item.id).map((invItem) => (
                              <button
                                key={invItem._id}
                                type="button"
                                onClick={() => handleItemSelect(item.id, invItem)}
                                className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-primary/10 hover:text-primary font-medium transition-all duration-200 hover:scale-[1.02] focus:bg-primary/10 focus:text-primary focus:outline-none"
                              >
                                {invItem.itemName}
                                {invItem.unit && (
                                  <span className="text-muted-foreground ml-2">
                                    ({invItem.unit})
                                  </span>
                                )}
                              </button>
                  ))}
                          </div>
                        )}
                    </div>
                  </div>

                  {/* Quantity with Unit */}
                  <div className="space-y-2 sm:space-y-2.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs sm:text-sm font-semibold flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                        Quantity <span className="text-destructive">*</span>
                      </Label>
                      {item.selectedItemFromInventory &&
                        item.selectedItemFromInventory.centralStock !== undefined &&
                        item.quantityInput.trim() && (
                          <div className="text-xs text-muted-foreground">
                            {(() => {
                              const requestedQty = item.quantity || 0;
                              const availableStock = item.selectedItemFromInventory.centralStock || 0;
                              if (requestedQty > 0) {
                                if (requestedQty <= availableStock) {
                                  return (
                                    <span className="text-green-600 dark:text-green-400">
                                      {requestedQty} out of {availableStock} available
                                    </span>
                                  );
                                } else {
                                  const restNeeded = requestedQty - availableStock;
                                  return (
                                    <span className="text-orange-600 dark:text-orange-400">
                                      {requestedQty} out of {availableStock} • Need to order {restNeeded} more
                                    </span>
                                  );
                                }
                              }
                              return null;
                            })()}
                          </div>
                        )}
                    </div>
                    <div className="relative">
                      <Input
                        ref={(el) => {
                          quantityRefs.current[item.id] = el;
                        }}
                        type="text"
                        value={item.quantityInput}
                        onChange={(e) => handleQuantityInputChange(item.id, e.target.value)}
                        onFocus={() => updateItem(item.id, { showQuantitySuggestions: true })}
                        placeholder="e.g., 10 bags, 5 kg, 20 nos"
                        disabled={isLoading}
                        className="w-full h-10 sm:h-11 text-sm border-2 hover:border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                      />
                      {item.showQuantitySuggestions && (
                        <div
                          data-quantity-suggestions
                          className="absolute z-50 w-full mt-1 rounded-md border bg-popover text-popover-foreground shadow-md max-h-60 overflow-y-auto"
                        >
                          <div className="p-1">
                            {generateQuantitySuggestions(
                              item.quantityInput,
                              item.selectedItemFromInventory?.unit
                            ).map((suggestion) => (
                              <button
                                key={suggestion}
                                type="button"
                                onClick={() => handleQuantitySelect(item.id, suggestion)}
                                className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-primary/10 hover:text-primary font-medium transition-all duration-200 hover:scale-[1.02] focus:bg-primary/10 focus:text-primary focus:outline-none"
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Description and Notes - Same Row on Desktop */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 lg:gap-6">
                  {/* Description */}
                  <div className="space-y-2 sm:space-y-2.5">
                    <Label className="text-xs sm:text-sm font-semibold flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                      Description <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      value={item.description}
                      onChange={(e) =>
                        updateItem(item.id, { description: e.target.value })
                      }
                      placeholder="Enter item description..."
                      disabled={isLoading}
                      rows={2}
                      className="min-h-[70px] sm:min-h-[80px] text-sm border-2 hover:border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 resize-y"
                    />
                  </div>

                  {/* Notes */}
                  <div className="space-y-2 sm:space-y-2.5">
                    <Label className="text-xs sm:text-sm font-semibold flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                      Notes <span className="text-muted-foreground font-normal">(Optional)</span>
                    </Label>
                    <Textarea
                      value={item.notes}
                      onChange={(e) => updateItem(item.id, { notes: e.target.value })}
                      placeholder="Any additional details or notes..."
                      disabled={isLoading}
                      rows={2}
                      className="min-h-[70px] sm:min-h-[80px] text-sm border-2 hover:border-primary/30 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 resize-y"
                    />
                  </div>
                </div>

                {/* Photo Upload - Compact with Drag and Drop (Desktop Only) */}
                <div className="space-y-2.5 sm:space-y-3">
                    <Label className="text-xs sm:text-sm font-semibold flex items-center gap-1.5">
                      <ImageIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                      Photo <span className="text-muted-foreground font-normal">(Optional)</span>
                    </Label>
                    
                    {/* Compact Drag and Drop Zone with Buttons - Desktop Only */}
                    <div
                      className={`hidden md:flex items-center gap-3 border-2 border-dashed rounded-lg px-4 py-3 transition-all duration-200 cursor-pointer ${
                        dragOverItemId === item.id
                          ? "border-primary bg-primary/10 scale-[1.01]"
                          : "border-muted-foreground/30 bg-muted/30 hover:border-primary/50 hover:bg-muted/40"
                      }`}
                      onClick={() => {
                        const input = document.createElement("input");
                        input.type = "file";
                        input.accept = "image/*";
                        input.multiple = false;
                        input.onchange = (e) =>
                          handleImageSelect(
                            item.id,
                            (e.target as HTMLInputElement).files
                          );
                        input.click();
                      }}
                      onDragEnter={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDragOverItemId(item.id);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDragOverItemId(item.id);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                          setDragOverItemId(null);
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDragOverItemId(null);
                        const files = e.dataTransfer.files;
                        if (files.length > 0) {
                          handleImageSelect(item.id, files);
                        }
                      }}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="p-1.5 rounded-md bg-primary/10 shrink-0">
                          <Upload className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">
                            Drag and drop images here
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            const input = document.createElement("input");
                            input.type = "file";
                            input.accept = "image/*";
                            input.multiple = false;
                            input.onchange = (e) =>
                              handleImageSelect(
                                item.id,
                                (e.target as HTMLInputElement).files
                              );
                            input.click();
                          }}
                          disabled={isLoading || (isUploading && uploadingItemId === item.id)}
                          size="sm"
                          className="h-8 px-3 text-xs font-semibold border-2 bg-background text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-200"
                        >
                          <Upload className="h-3.5 w-3.5 mr-1.5" />
                          Upload
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCameraOpen({ itemId: item.id, open: true });
                          }}
                          disabled={isLoading || (isUploading && uploadingItemId === item.id)}
                          size="sm"
                          className="h-8 px-3 text-xs font-semibold border-2 bg-background text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-200"
                        >
                          <Camera className="h-3.5 w-3.5 mr-1.5" />
                          Camera
                        </Button>
                      </div>
                    </div>

                    {/* Mobile Buttons */}
                    <div className="flex md:hidden gap-2 sm:gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          const input = document.createElement("input");
                          input.type = "file";
                          input.accept = "image/*";
                          input.multiple = false;
                          input.onchange = (e) =>
                            handleImageSelect(
                              item.id,
                              (e.target as HTMLInputElement).files
                            );
                          input.click();
                        }}
                        disabled={isLoading || (isUploading && uploadingItemId === item.id)}
                        size="sm"
                        className="flex-1 text-xs h-9 font-semibold border-2 bg-background text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-200"
                      >
                        <Upload className="h-3.5 w-3.5 mr-1.5" />
                        Choose File
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setCameraOpen({ itemId: item.id, open: true })}
                        disabled={isLoading || (isUploading && uploadingItemId === item.id)}
                        size="sm"
                        className="flex-1 text-xs h-9 font-semibold border-2 bg-background text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-200"
                      >
                        <Camera className="h-3.5 w-3.5 mr-1.5" />
                        Camera
                      </Button>
                    </div>
                    {item.imagePreviews.length > 0 && (
                      <div className="grid grid-cols-2 gap-3 sm:gap-4 mt-3 sm:mt-4">
                        {item.imagePreviews.map((preview, imgIndex) => (
                          <div key={imgIndex} className="relative group rounded-lg overflow-hidden border-2 border-border hover:border-primary/50 transition-all shadow-sm hover:shadow-md">
                      <img
                        src={preview}
                              alt={`Preview ${imgIndex + 1}`}
                              className="w-full h-28 sm:h-36 object-cover"
                      />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute top-2 right-2 h-7 w-7 sm:h-8 sm:w-8 rounded-full shadow-lg hover:scale-125 active:scale-95 hover:shadow-xl focus:ring-2 focus:ring-destructive/30 transition-all duration-200"
                              onClick={() => removeImage(item.id, imgIndex)}
                              disabled={isLoading}
                            >
                              <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            </Button>
                    </div>
                  ))}
                      </div>
                    )}
                </div>

                  {index < items.length - 1 && (
                    <div className="flex items-center gap-2 my-2 sm:my-3">
                      <Separator className="flex-1" />
                      <div className="px-2 py-1 rounded-full bg-muted text-xs text-muted-foreground font-medium">
                        Next Item
                      </div>
                      <Separator className="flex-1" />
                    </div>
                  )}
                </div>
              );
              })}
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3 lg:gap-4 pt-4 sm:pt-6 lg:pt-8 border-t px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6 lg:pb-8 -mx-4 sm:-mx-6 lg:-mx-8 bg-muted/30">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading || isUploading}
                className="w-full sm:w-auto order-3 sm:order-1 h-10 sm:h-11 text-sm font-semibold border-2 bg-background text-foreground hover:bg-destructive hover:text-destructive-foreground hover:border-destructive hover:scale-105 active:scale-95 focus:ring-2 focus:ring-destructive/20 transition-all duration-200"
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveDraft}
                disabled={isLoading || isUploading || !sharedFormData.siteId || !sharedFormData.requiredBy}
                className="w-full sm:w-auto order-2 sm:order-2 h-10 sm:h-11 text-sm font-semibold border-2 bg-background text-foreground hover:bg-secondary hover:text-secondary-foreground hover:border-secondary hover:scale-105 active:scale-95 focus:ring-2 focus:ring-secondary/20 transition-all duration-200"
                title={!sharedFormData.siteId || !sharedFormData.requiredBy ? "Please select site and date to save" : draftRequestNumber ? "Update draft" : "Save as draft"}
              >
                {isLoading || isUploading ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">⏳</span>
                    {draftRequestNumber ? "Updating..." : "Saving..."}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    {draftRequestNumber ? "Update Draft" : "Save"}
                  </span>
                )}
              </Button>
              <Button
                type="submit"
                disabled={isLoading || isUploading || !isFormValid()}
                className="w-full sm:w-auto order-1 sm:order-3 h-10 sm:h-11 text-sm font-bold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-2xl hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:scale-100 focus:ring-4 focus:ring-primary/30 transition-all duration-200"
                title={!isFormValid() ? "Please fill in all required fields" : "Send request"}
              >
                {isLoading || isUploading ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin">⏳</span>
                    Sending...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Send Request
                  </span>
                )}
              </Button>
            </DialogFooter>
          </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 rounded-full bg-primary/10">
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </div>
              <AlertDialogTitle className="text-lg sm:text-xl font-bold">Confirm & Send Request</AlertDialogTitle>
            </div>
            <div className="text-sm text-muted-foreground space-y-4 pt-2">
              <div className="p-4 rounded-lg bg-muted/50 border space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Site Location</p>
                    <p className="text-sm font-medium">
                      {assignedSites?.find((s) => s?._id === sharedFormData.siteId)?.name || "Selected site"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Required By</p>
                    <p className="text-sm font-medium">
                      {sharedFormData.requiredBy instanceof Date ? format(sharedFormData.requiredBy, "dd/MM/yyyy") : "Not set"}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Package className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Items</p>
                    <p className="text-sm font-medium">
                      {items.length} item{items.length > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>
              
              {items.filter((i) => i.isUrgent).length > 0 && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-destructive mb-1">Urgent Items</p>
                    <p className="text-sm text-destructive/90">
                      {items.filter((i) => i.isUrgent).length} item{items.filter((i) => i.isUrgent).length > 1 ? 's are' : ' is'} marked as urgent and will be prioritized.
                    </p>
                  </div>
                </div>
              )}

              <div className="pt-2 border-t">
                <p className="text-sm font-medium text-foreground">
                  Are you sure you want to send this request? This action cannot be undone.
                </p>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-3 pt-4">
            <AlertDialogCancel 
              className="w-full sm:w-auto order-2 sm:order-1 h-10 sm:h-11 text-sm font-semibold border-2"
              onClick={() => setShowConfirmDialog(false)}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmSubmit}
              className="w-full sm:w-auto order-1 sm:order-2 h-10 sm:h-11 text-sm font-bold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all"
            >
              <Send className="h-4 w-4 mr-2" />
              Confirm & Send
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CameraDialog
        open={cameraOpen.open}
        onOpenChange={(open) => setCameraOpen({ itemId: "", open })}
        onCapture={handleCameraCapture}
        multiple={false}
      />
    </>
  );
}
