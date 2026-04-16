"use client";

/**
 * Purchase Requests Content Component
 * 
 * Client component for purchase officer to view and manage requests.
 */

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Check, CheckCircle } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DraggableDialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RequestDetailsDialog } from "@/components/requests/request-details-dialog";
import { ItemInfoDialog } from "@/components/requests/item-info-dialog";
import { LocationInfoDialog } from "@/components/locations/location-info-dialog";
import { toast } from "sonner";
import Link from "next/link";
import type { Id } from "@/convex/_generated/dataModel";
import { Clock, FileText, ShoppingCart, Truck, Search, Filter, LayoutGrid, Table as TableIcon, Eye, AlertCircle, FileText as FileTextIcon, Edit, Zap, XCircle, ChevronDown } from "lucide-react";
import { RequestCardWithCC } from "./request-card-with-cc";
import { PurchaseRequestGroupCard } from "./purchase-request-group-card";
import { CostComparisonDialog } from "./cost-comparison-dialog";
import { CompactImageGallery } from "@/components/ui/image-gallery";
import { cn } from "@/lib/utils";
import { DirectPODialog, type DirectPOInitialData } from "./direct-po-dialog";
import { DirectDCDialog } from "./direct-dc-dialog";
import { CheckDialog } from "./check-dialog";
import { useViewMode } from "@/hooks/use-view-mode";
import { RequestsTable } from "@/components/requests/requests-table";
import { PDFPreviewDialog } from "./pdf-preview-dialog";
import { ConfirmDeliveryDialog } from "@/components/requests/confirm-delivery-dialog";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { Table2, X } from "lucide-react";
import { PendingPODialog } from "./pending-po-dialog";
import { DeliveryChallanTemplate, type DCData } from "./delivery-challan-template";
import { format } from "date-fns";

// Enhanced status configuration with better visual hierarchy
const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any; color: string }> = {
  draft: { label: "Draft", variant: "outline", icon: FileTextIcon, color: "gray" },
  pending: { label: "Pending Approval", variant: "secondary", icon: Clock, color: "yellow" },
  rejected: { label: "Rejected", variant: "destructive", icon: XCircle, color: "red" },
  recheck: { label: "Recheck", variant: "default", icon: AlertCircle, color: "orange" },
  ready_for_cc: { label: "Ready for CC", variant: "default", icon: FileText, color: "blue" },
  cc_pending: { label: "CC Pending", variant: "secondary", icon: Clock, color: "amber" },
  cc_rejected: { label: "CC Rejected", variant: "destructive", icon: XCircle, color: "red" },
  ready_for_po: { label: "Ready for PO", variant: "default", icon: ShoppingCart, color: "emerald" },
  sign_pending: { label: "Sign Pending", variant: "secondary", icon: Clock, color: "amber" },
  sign_rejected: { label: "Sign Rejected", variant: "destructive", icon: XCircle, color: "red" },
  pending_po: { label: "Pending PO", variant: "secondary", icon: Clock, color: "amber" },
  // Delivery statuses grouped at the end
  ready_for_delivery: { label: "Ready for Delivery", variant: "default", icon: Truck, color: "indigo" },
  delivery_processing: { label: "Out for Delivery", variant: "secondary", icon: Truck, color: "blue" },
  delivery_stage: { label: "Out for Delivery", variant: "secondary", icon: Truck, color: "blue" }, // Legacy support
  delivered: { label: "Delivered", variant: "secondary", icon: CheckCircle, color: "green" },
};



// Color mapping for filter items
const colorMap: Record<string, { checkboxActive: string; checkboxBorder: string; text: string; bgHover: string }> = {
  gray: { checkboxActive: "bg-slate-500 border-slate-500 text-white", checkboxBorder: "border-slate-400", text: "text-slate-700 dark:text-slate-300", bgHover: "data-[selected=true]:bg-slate-100 dark:data-[selected=true]:bg-slate-800" },
  yellow: { checkboxActive: "bg-yellow-500 border-yellow-500 text-white", checkboxBorder: "border-yellow-500", text: "text-yellow-700 dark:text-yellow-400", bgHover: "data-[selected=true]:bg-yellow-50 dark:data-[selected=true]:bg-yellow-900/20" },
  red: { checkboxActive: "bg-red-600 border-red-600 text-white", checkboxBorder: "border-red-500", text: "text-red-700 dark:text-red-400", bgHover: "data-[selected=true]:bg-red-50 dark:data-[selected=true]:bg-red-900/20" },
  orange: { checkboxActive: "bg-orange-500 border-orange-500 text-white", checkboxBorder: "border-orange-500", text: "text-orange-700 dark:text-orange-400", bgHover: "data-[selected=true]:bg-orange-50 dark:data-[selected=true]:bg-orange-900/20" },
  blue: { checkboxActive: "bg-blue-500 border-blue-500 text-white", checkboxBorder: "border-blue-500", text: "text-blue-700 dark:text-blue-400", bgHover: "data-[selected=true]:bg-blue-50 dark:data-[selected=true]:bg-blue-900/20" },
  amber: { checkboxActive: "bg-amber-500 border-amber-500 text-white", checkboxBorder: "border-amber-500", text: "text-amber-700 dark:text-amber-400", bgHover: "data-[selected=true]:bg-amber-50 dark:data-[selected=true]:bg-amber-900/20" },
  emerald: { checkboxActive: "bg-emerald-500 border-emerald-500 text-white", checkboxBorder: "border-emerald-500", text: "text-emerald-700 dark:text-emerald-400", bgHover: "data-[selected=true]:bg-emerald-50 dark:data-[selected=true]:bg-emerald-900/20" },
  indigo: { checkboxActive: "bg-indigo-500 border-indigo-500 text-white", checkboxBorder: "border-indigo-500", text: "text-indigo-700 dark:text-indigo-400", bgHover: "data-[selected=true]:bg-indigo-50 dark:data-[selected=true]:bg-indigo-900/20" },
  green: { checkboxActive: "bg-green-600 border-green-600 text-white", checkboxBorder: "border-green-600", text: "text-green-700 dark:text-green-400", bgHover: "data-[selected=true]:bg-green-50 dark:data-[selected=true]:bg-green-900/20" },
};

export function PurchaseRequestsContent() {

  const [selectedRequestId, setSelectedRequestId] = useState<Id<"requests"> | null>(null);
  const [ccRequestId, setCCRequestId] = useState<Id<"requests"> | null>(null);
  const [editDirectCCId, setEditDirectCCId] = useState<Id<"costComparisons"> | null>(null);
  const [checkRequestId, setCheckRequestId] = useState<Id<"requests"> | null>(null);
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const { viewMode, toggleViewMode } = useViewMode();
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedItemName, setSelectedItemName] = useState<string | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState<Id<"sites"> | null>(null);
  const [showDirectPODialog, setShowDirectPODialog] = useState(false);
  const [directPOMode, setDirectPOMode] = useState<"standard" | "direct">("standard");
  const [directPOInitialData, setDirectPOInitialData] = useState<DirectPOInitialData | null>(null);
  const [pdfPreviewPoNumber, setPdfPreviewPoNumber] = useState<string | null>(null);
  const [pdfPreviewRequestId, setPdfPreviewRequestId] = useState<string | null>(null);
  const [showPendingPODialog, setShowPendingPODialog] = useState(false);
  const [showDirectDCDialog, setShowDirectDCDialog] = useState(false);
  const [showDirectCCDialog, setShowDirectCCDialog] = useState(false);
  const [viewDCData, setViewDCData] = useState<DCData | null>(null);
  const [entryTypeFilter, setEntryTypeFilter] = useState<"all" | "request" | "direct">("all");
  const searchParams = useSearchParams();
  const router = useRouter();

  // Split button dropdown state
  const [splitDropdownOpen, setSplitDropdownOpen] = useState(false);
  const splitBtnRef = useRef<HTMLDivElement>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load page size from localStorage after hydration (client-side only)
  useEffect(() => {
    setIsHydrated(true);
    const saved = localStorage.getItem('purchaseRequestsPageSize');
    if (saved) {
      setPageSize(Number(saved));
    }
  }, []);

  // Save page size to localStorage
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem('purchaseRequestsPageSize', pageSize.toString());
    }
  }, [pageSize, isHydrated]);

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterStatus.length, viewMode, entryTypeFilter]);

  // Handle URL view parameters
  useEffect(() => {
    const view = searchParams.get("view");
    if (view === "cc") {
      setFilterStatus(["ready_for_cc", "cc_pending", "cc_approved"]);
      setEntryTypeFilter("all");
    } else if (view === "po") {
      setFilterStatus(["ready_for_po", "cc_approved", "cc_rejected", "ready_for_delivery", "pending_po", "direct_po", "ordered"]);
      setEntryTypeFilter("all");
    } else if (view === "dc") {
      setFilterStatus(["delivery_processing", "out_for_delivery", "delivered", "ready_for_delivery"]);
      setEntryTypeFilter("all");
    }
  }, [searchParams]);

  // Debounced search (optional but good for consistency)
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const allRequests = useQuery(api.requests.getPurchaseRequestsByStatus, {});
  const vendors = useQuery(api.vendors.getAllVendors);
  const directDCDeliveries = useQuery(api.deliveries.getDirectDCDeliveries);
  const directCCs = useQuery(api.costComparisons.getDirectCostComparisons);
  const convex = useConvex();

  // Enhanced filtering with search - group by requestNumber like manager pages
  const filteredRequestGroups = useMemo(() => {
    if (!allRequests) return [];

    let filtered = allRequests;

    // Filter by Entry Type (Request vs Direct)
    if (entryTypeFilter === "direct") {
      filtered = []; // Will only show Direct DC/CC below
    } else {
      // Real requests (Entry type "all" or "request")
      // Filter by status dropdown
      // Special handling for legacy 'delivery_stage' mapping to 'delivery_processing'
      if (filterStatus.length > 0) {
        filtered = filtered.filter((r) => {
          if (filterStatus.includes("delivery_processing") && r.status === "delivery_stage") return true;
          return filterStatus.includes(r.status);
        });
      }
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((request) => {
        const matchesRequestNumber = request.requestNumber.toLowerCase().includes(query);
        const matchesItemName = request.itemName.toLowerCase().includes(query);
        const matchesSiteName = request.site?.name.toLowerCase().includes(query);
        const matchesCreatorName = request.creator?.fullName.toLowerCase().includes(query);
        const matchesDescription = request.description?.toLowerCase().includes(query);

        return matchesRequestNumber || matchesItemName || matchesSiteName || matchesCreatorName || matchesDescription;
      });
    }

    // Group by requestNumber like manager pages
    const groupedRequests = new Map<string, typeof filtered>();

    filtered.forEach((request) => {
      const group = groupedRequests.get(request.requestNumber) || [];
      group.push(request);
      groupedRequests.set(request.requestNumber, group);
    });

    // Convert to array and sort like manager pages
    const groupedRequestsArray = Array.from(groupedRequests.entries())
      .map(([requestNumber, items]) => {
        // Sort items within group by itemOrder or createdAt
        const sortedItems = items.sort((a, b) => {
          const orderA = a.itemOrder ?? a.createdAt;
          const orderB = b.itemOrder ?? b.createdAt;
          return orderA - orderB; // Ascending order
        });
        return {
          requestNumber,
          items: sortedItems,
          firstItem: sortedItems[0], // Use first item for shared data
        };
      })
      .sort((a, b) => {
        // Sort groups by the newest item's updatedAt
        const aLatest = Math.max(...a.items.map((i) => i.updatedAt || i.createdAt));
        const bLatest = Math.max(...b.items.map((i) => i.updatedAt || i.createdAt));
        return bLatest - aLatest;
      });
    // ── Merge Direct CCs as virtual groups ──
    const directCCGroups: any[] = (directCCs || []).filter(cc => cc.isDirect).map(cc => {
      // Apply search filter
      if (debouncedSearchQuery.trim()) {
        const q = debouncedSearchQuery.toLowerCase();
        const matchesName = (cc.directItem?.itemName || "").toLowerCase().includes(q);
        const matchesDesc = (cc.directItem?.description || "").toLowerCase().includes(q);
        if (!matchesName && !matchesDesc) return null;
      }
      
      // Apply status filter
      if (filterStatus.length > 0) {
        if (!filterStatus.includes(cc.status)) return null;
      }
      
      const dummyItem = {
        _id: cc._id, // use CC id
        requestNumber: "Direct CC",
        itemName: cc.directItem?.itemName || "Direct CC",
        description: cc.directItem?.description || "",
        quantity: cc.directItem?.quantity || 1,
        unit: cc.directItem?.unit || "nos",
        status: cc.status,
        createdAt: cc.createdAt,
        updatedAt: cc.updatedAt,
        requiredBy: cc.createdAt,
        isUrgent: false,
        directAction: null,
        site: null,
        creator: null,
        createdBy: cc.createdBy,
        isDirectCC: true,
      };
      
      return {
        requestNumber: "Direct CC",
        items: [dummyItem],
        firstItem: dummyItem,
      };
    }).filter(Boolean);

    // ── Merge Direct DC deliveries as virtual groups ──
    // Direct DCs are standalone (no request linkage) but appear in the same list
    const directDCGroups: any[] = (directDCDeliveries || []).map((dc) => {
      // Apply search filter to Direct DCs too
      if (debouncedSearchQuery.trim()) {
        const q = debouncedSearchQuery.toLowerCase();
        const matchesDCId = dc.deliveryId.toLowerCase().includes(q);
        const matchesVendor = dc.vendor?.companyName?.toLowerCase().includes(q);
        const matchesItems = (dc.directItems || []).some((item: any) =>
          item.itemName.toLowerCase().includes(q) ||
          (item.description || "").toLowerCase().includes(q)
        );
        const matchesReceiver = dc.receiverName?.toLowerCase().includes(q);
        if (!matchesDCId && !matchesVendor && !matchesItems && !matchesReceiver) return null;
      }

      // Apply status filter: map DC status to request-compatible filter values
      if (filterStatus.length > 0) {
        const dcStatusMap: Record<string, string[]> = {
          pending: ["delivery_processing", "out_for_delivery"],
          delivered: ["delivered"],
          cancelled: [],
        };
        const mappedStatuses = dcStatusMap[dc.status] || [];
        if (!mappedStatuses.some((s) => filterStatus.includes(s))) return null;
      }

      // Create a dummy firstItem so pagination/stats work
      const dummyItem = {
        _id: dc._id,
        requestNumber: dc.deliveryId,
        itemName: (dc.directItems || [])[0]?.itemName || "Direct DC",
        description: (dc.directItems || [])[0]?.description || "",
        quantity: (dc.directItems || [])[0]?.quantity || 0,
        unit: (dc.directItems || [])[0]?.unit || "",
        status: dc.status === "delivered" ? "delivered" : "approved", // Direct DCs don't go through request-based confirm flow
        createdAt: dc.createdAt,
        updatedAt: dc.updatedAt,
        requiredBy: dc.createdAt,
        isUrgent: false,
        directAction: null,
        site: null,
        creator: dc.creator,
        createdBy: dc.createdBy,
        deliveryId: dc._id, // Must be the internal Id<"deliveries">, not string
        approver: null,
        selectedVendorId: dc.vendorId || null,
        vendorQuotes: [],
        notesCount: 0,
      };

      return {
        requestNumber: dc.deliveryId,
        items: [dummyItem],
        firstItem: dummyItem,
        isDirectDC: true,
        dcData: dc,
      };
    }).filter(Boolean);

    const merged = [...groupedRequestsArray, ...directDCGroups, ...directCCGroups];
    
    // Final sort by latest update
    return merged.sort((a, b) => {
      const aLatest = a.isDirectDC
        ? a.dcData.createdAt
        : Math.max(...a.items.map((i: any) => i.updatedAt || i.createdAt));
      const bLatest = b.isDirectDC
        ? b.dcData.createdAt
        : Math.max(...b.items.map((i: any) => i.updatedAt || i.createdAt));
      return bLatest - aLatest;
    });
  }, [allRequests, filterStatus, debouncedSearchQuery, directDCDeliveries, directCCs, entryTypeFilter]);

  // Pagination Logic
  const totalItems = filteredRequestGroups.length;
  const totalPages = Math.ceil(totalItems / pageSize);

  const paginatedGroups = filteredRequestGroups.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const paginatedRequests = paginatedGroups.flatMap(group => group.items);

  const directToPO = useMutation(api.requests.directToPO);
  const updatePurchaseStatus = useMutation(api.requests.updatePurchaseRequestStatus);
  const [showConfirmDelivery, setShowConfirmDelivery] = useState<Id<"requests"> | null>(null);

  // Safe confirm-delivery handler: only allow real request IDs, never deliveries IDs from Direct DC rows
  const handleConfirmDelivery = (id: Id<"requests">) => {
    // Check if this ID belongs to a Direct DC virtual row (would be an Id<"deliveries">)
    const isDirectDCRow = directDCDeliveries?.some((dc: any) => dc._id === id);
    if (isDirectDCRow) {
      // Direct DCs don't use request-based confirmation — silently ignore
      return;
    }
    setShowConfirmDelivery(id);
  };

  const handleDirectPO = async (requestId: Id<"requests">) => {
    try {
      await directToPO({ requestId });
      toast.success("Request moved to Ready for PO");
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const handleDirectDelivery = async (requestId: Id<"requests">) => {
    try {
      await updatePurchaseStatus({ requestId, status: "ready_for_delivery" });
      toast.success("Request moved to Out for Delivery");
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const handleMoveToCC = async (requestId: Id<"requests">) => {
    try {
      await updatePurchaseStatus({ requestId, status: "ready_for_cc" });
      toast.success("Request moved to Ready for CC");
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const handleCheck = (requestId: Id<"requests">) => {
    setCheckRequestId(requestId);
  };

  const handleCreatePO = async (requestId: Id<"requests">) => {
    const toastId = toast.loading("Checking history...");
    let rejectedPO = null;

    try {
      const allPOs = await convex.query(api.purchaseOrders.getAllPurchaseOrders);
      const request = allRequests?.find(r => r._id === requestId);

      // Sort POs by creation time to get the latest rejection
      const sortedPOs = allPOs?.slice().sort((a: any, b: any) => b._creationTime - a._creationTime);

      // Try to find existing rejected PO for this request to restore full data
      rejectedPO = sortedPOs?.find((po: any) =>
        ['rejected', 'sign_rejected'].includes(po.status) &&
        (
          po.items?.some((i: any) => String(i.requestId) === String(requestId)) ||
          (request && po.requestNumber && po.requestNumber === request.requestNumber)
        )
      );
    } catch (error) {
      console.error("Failed to fetch PO history:", error);
      // Continue without restoration if fetch fails
    }

    toast.dismiss(toastId);

    if (rejectedPO) {
      // Restore from Rejected PO
      setDirectPOInitialData({
        requestNumber: undefined, // Create new number
        vendorId: rejectedPO.vendor?._id,
        deliverySiteId: rejectedPO.site?._id,
        deliverySiteName: rejectedPO.site?.name,
        items: (rejectedPO as any).items.map((item: any) => {
          // Extract GST rate and split into SGST/CGST
          const gstRate = item.gstTaxRate || 0;
          return {
            requestId: item.requestId,
            itemDescription: item.itemDescription || item.itemName || "",
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitRate || item.unitPrice,
            discountPercent: item.discountPercent || 0,
            sgst: gstRate / 2,
            cgst: gstRate / 2,
            hsnCode: item.hsnSacCode || item.hsnCode
          };
        }),
        vendorDetails: rejectedPO.vendor ? {
          name: rejectedPO.vendor.companyName,
          email: rejectedPO.vendor.email,
          phone: rejectedPO.vendor.phone,
          contactName: rejectedPO.vendor.contactName,
          gstNumber: rejectedPO.vendor.gstNumber,
          address: rejectedPO.vendor.address
        } : undefined,
        notes: rejectedPO.rejectionReason ? `[Rejection Reason: ${rejectedPO.rejectionReason}]\n${rejectedPO.notes || ''}` : rejectedPO.notes,
        validTill: rejectedPO.validTill ? new Date(rejectedPO.validTill).toISOString().split('T')[0] : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      });
      toast.success("Restored rejected draft details");
      setDirectPOMode("standard");
      setShowDirectPODialog(true);
      return;
    }

    const request = allRequests?.find(r => r._id === requestId);
    if (request) {
      let unitPrice = 0;
      let discountPercent = 0;
      let sgst = 0;
      let cgst = 0;
      const vendorId = request.selectedVendorId;

      // Try to find price from selected vendor quote
      if (vendorId && request.vendorQuotes) {
        const quote = request.vendorQuotes.find(q => q.vendorId === vendorId);
        if (quote) {
          unitPrice = quote.unitPrice || 0;
          discountPercent = (quote as any).discountPercent || 0;
          const gst = (quote as any).gstPercent || 0;
          sgst = gst ? gst / 2 : 0;
          cgst = gst ? gst / 2 : 0;
        }
      }

      setDirectPOInitialData({
        requestNumber: request.requestNumber,
        vendorId: vendorId || undefined,
        deliverySiteId: request.site?._id,
        deliverySiteName: request.site?.name,
        items: [{
          requestId: request._id,
          itemDescription: request.itemName,
          description: request.description,
          quantity: request.quantity,
          unit: request.unit,
          unitPrice: unitPrice,
          discountPercent: discountPercent,
          sgst: sgst,
          cgst: cgst,
        }],
        vendorDetails: (vendorId && vendors) ? (() => {
          const v = vendors.find(v => v._id === vendorId);
          return v ? {
            name: v.companyName,
            email: v.email,
            phone: v.phone,
            contactName: v.contactName,
            gstNumber: v.gstNumber,
            address: v.address
          } : undefined;
        })() : undefined,
        notes: (request as any).rejectionReason ? `[Rejection Reason: ${(request as any).rejectionReason}]` : undefined,
      });
    } else {
      setDirectPOInitialData(null);
    }

    setDirectPOMode("standard");
    setShowDirectPODialog(true);
  };

  const handleCreateBulkPO = async (requestIds: Id<"requests">[]) => {
    if (!requestIds.length) return;

    const toastId = toast.loading("Preparing PO...");

    // Get all request objects
    const requests = allRequests?.filter(r => requestIds.includes(r._id)) || [];
    if (requests.length === 0) {
      toast.dismiss(toastId);
      return;
    }

    // Try to find existing rejected PO for these requests to restore full data
    let rejectedPO = null;
    try {
      const allPOs = await convex.query(api.purchaseOrders.getAllPurchaseOrders);
      // Sort POs by creation time to get the latest rejection
      const sortedPOs = allPOs?.slice().sort((a: any, b: any) => b._creationTime - a._creationTime);

      // Try to find a rejected PO that matches any of these request IDs
      rejectedPO = sortedPOs?.find((po: any) =>
        ['rejected', 'sign_rejected'].includes(po.status) &&
        (
          po.items?.some((i: any) => requestIds.includes(i.requestId)) ||
          requestIds.some(rid => {
            const req = requests.find(r => r._id === rid);
            return req && po.requestNumber && po.requestNumber === req.requestNumber;
          })
        )
      );
    } catch (error) {
      console.error("Failed to fetch PO history:", error);
    }

    toast.dismiss(toastId);

    // If we found a rejected PO, restore all its data
    if (rejectedPO) {
      const rpo = rejectedPO as any;
      setDirectPOInitialData({
        requestNumber: undefined, // Create new PO number
        vendorId: rpo.vendorId || rpo.vendor?._id,
        deliverySiteId: rpo.deliverySiteId || rpo.site?._id,
        deliverySiteName: rpo.deliverySite?.name || rpo.site?.name || rpo.deliveryAddress,
        items: rpo.items?.map((item: any) => {
          // Extract GST rate and split into SGST/CGST
          const gstRate = item.gstTaxRate || 0;
          return {
            requestId: item.requestId,
            itemDescription: item.itemDescription || item.itemName || "",
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitRate || item.unitPrice || 0,
            discountPercent: item.discountPercent || 0,
            sgst: gstRate / 2,
            cgst: gstRate / 2,
            hsnCode: item.hsnSacCode || item.hsnCode
          };
        }) || requests.map(req => ({
          requestId: req._id,
          itemDescription: req.itemName,
          description: req.description,
          quantity: req.quantity,
          unit: req.unit,
          unitPrice: 0,
          discountPercent: 0,
          sgst: 0,
          cgst: 0,
        })),
        vendorDetails: rpo.vendor ? {
          name: rpo.vendor.companyName,
          email: rpo.vendor.email,
          phone: rpo.vendor.phone,
          contactName: rpo.vendor.contactName,
          gstNumber: rpo.vendor.gstNumber,
          address: rpo.vendor.address
        } : undefined,
        notes: rpo.rejectionReason ? `[Rejection Reason: ${rpo.rejectionReason}]\n${rpo.notes || ''}` : rpo.notes,
        validTill: rpo.validTill ? new Date(rpo.validTill).toISOString().split('T')[0] : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      });
      toast.success("Restored rejected PO details");
      setDirectPOMode("standard");
      setShowDirectPODialog(true);
      return;
    }

    // No rejected PO found, create new from request data
    // Use the first request to determine common fields (Site, Vendor)
    const firstRequest = requests[0];
    const commonVendorId = firstRequest.selectedVendorId;
    const commonSiteId = firstRequest.site?._id;

    // Check for mixed vendors/sites?
    const mixedVendors = requests.some(r => r.selectedVendorId !== commonVendorId);
    const mixedSites = requests.some(r => r.site?._id !== commonSiteId);

    if (mixedSites) {
      toast.warning("Selected items have different delivery sites. Using site from first item.");
    }

    if (mixedVendors) {
      toast.warning("Selected items have different assigned vendors. Using vendor from first item.");
    }

    // Map items
    const items = await Promise.all(requests.map(async (req) => {
      let quantity = req.quantity;

      // Fetch Cost Comparison to get "purchaseQuantity" (Buffer/Extra) if available
      // We try/catch to ensure one failure doesn't block the whole PO creation
      try {
        const cc = await convex.query(api.costComparisons.getCostComparisonByRequestId, { requestId: req._id });
        if (cc && cc.purchaseQuantity) {
          quantity = cc.purchaseQuantity;
        }
      } catch (e) {
        console.error("Failed to fetch CC for request", req._id, e);
      }

      let unitPrice = 0;
      let discountPercent = 0;
      let sgst = 0;
      let cgst = 0;
      if (req.selectedVendorId && req.vendorQuotes) {
        const quote = req.vendorQuotes.find(q => q.vendorId === req.selectedVendorId);
        if (quote) {
          unitPrice = quote.unitPrice || 0;
          discountPercent = (quote as any).discountPercent || 0;
          const gst = (quote as any).gstPercent || 0;
          sgst = gst ? gst / 2 : 0;
          cgst = gst ? gst / 2 : 0;
        }
      }
      return {
        requestId: req._id,
        itemDescription: req.itemName,
        description: req.description,
        quantity: quantity,
        originalQuantity: req.quantity,
        unit: req.unit,
        unitPrice: unitPrice,
        discountPercent: discountPercent,
        sgst: sgst,
        cgst: cgst,
      };
    }));

    // Fetch vendor details if we have a vendor ID
    let vendorDetails = undefined;
    if (commonVendorId && vendors) {
      const v = vendors.find(v => v._id === commonVendorId);
      if (v) {
        vendorDetails = {
          name: v.companyName,
          email: v.email,
          phone: v.phone,
          contactName: v.contactName,
          gstNumber: v.gstNumber,
          address: v.address
        };
      }
    }

    setDirectPOInitialData({
      requestNumber: firstRequest.requestNumber,
      vendorId: commonVendorId || undefined,
      deliverySiteId: commonSiteId,
      deliverySiteName: firstRequest.site?.name,
      items: items,
      vendorDetails: vendorDetails,
      notes: undefined,
      validTill: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    });

    setDirectPOMode("standard");
    setShowDirectPODialog(true);
  };

  const handleOpenDirectPO = () => {
    setDirectPOMode("direct");
    setDirectPOInitialData(null);
    setShowDirectPODialog(true);
  };

  // General CC open handler (distinguishes direct CCs from request CCs)
  const handleOpenCC = (id: string) => {
    const isDirectCC = directCCs?.some(cc => cc._id === id);
    if (isDirectCC) {
      setEditDirectCCId(id as Id<"costComparisons">);
    } else {
      setCCRequestId(id as Id<"requests">);
    }
  };

  // Direct CC handler
  const handleOpenDirectCC = () => {
    setShowDirectCCDialog(true);
  };

  // Direct DC handler
  const handleOpenDirectDC = () => {
    setShowDirectDCDialog(true);
  };

  const handleSafeViewDetails = (id: Id<"requests"> | string) => {
    // Primary check: see if this ID belongs to a known Direct DC delivery record
    const directDC = directDCDeliveries?.find(dc => dc._id === id);
    if (directDC) {
      // Build DCData for preview
      const dcPreview: DCData = {
        deliveryId: directDC.deliveryId,
        createdAt: directDC.dcDate || directDC.createdAt,
        deliveryType: directDC.deliveryType,
        deliveryPerson: directDC.deliveryPerson,
        deliveryContact: directDC.deliveryContact,
        vehicleNumber: directDC.vehicleNumber,
        receiverName: directDC.receiverName,
        po: null,
        vendor: directDC.vendor,
        items: (directDC.directItems || []).map((item: any, i: number) => ({
          _id: `dc-item-${i}`,
          itemName: item.itemName,
          quantity: item.quantity,
          unit: item.unit,
          description: item.description,
          hsnSacCode: item.hsnSacCode,
        })),
        creator: directDC.creator,
      };
      setViewDCData(dcPreview as any);
      return;
    }

    // Secondary check: fallback when directDCDeliveries hasn't loaded yet.
    // A Direct DC virtual row always has _id from the deliveries table.
    // We detect this by checking our current paginated groups for isDirectDC flag.
    const isDCVirtualRow = paginatedGroups.some(
      (g: any) => g.isDirectDC && g.firstItem?._id === id
    );
    if (isDCVirtualRow) {
      // DC deliveries not loaded yet — show a toast instead of crashing
      toast.info("Loading DC preview, please try again in a moment.");
      return;
    }

    setSelectedRequestId(id as Id<"requests">);
  };

  // Close split dropdown on outside click
  useEffect(() => {
    if (!splitDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (splitBtnRef.current && !splitBtnRef.current.contains(e.target as Node)) {
        setSplitDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [splitDropdownOpen]);

  return (
    <>
      {/* ── Pending PO full-page view (replaces main table) ── */}
      {showPendingPODialog && (
        <div className="space-y-6">
          <PendingPODialog
            onBack={() => setShowPendingPODialog(false)}
            onViewPO={(poNumber, requestId) => {
              setPdfPreviewPoNumber(poNumber);
              setPdfPreviewRequestId(requestId);
            }}
            onCreateDirectPO={() => {
              setShowPendingPODialog(false);
              handleOpenDirectPO();
            }}
          />
          {/* Keep PDF preview dialog mounted */}
          <PDFPreviewDialog
            open={!!pdfPreviewPoNumber}
            onOpenChange={(open) => { if (!open) { setPdfPreviewPoNumber(null); setPdfPreviewRequestId(null); } }}
            poNumber={pdfPreviewPoNumber}
            requestId={pdfPreviewRequestId}
          />
          <DirectPODialog
            open={showDirectPODialog}
            onOpenChange={(open) => {
              setShowDirectPODialog(open);
              if (!open) setDirectPOInitialData(null);
            }}
            initialData={directPOInitialData}
            mode={directPOMode}
          />
        </div>
      )}

      {/* ── Normal requests view ── */}
      {!showPendingPODialog && (
        <div className="space-y-6">


          {/* Controls: Search, View, Filter, Actions */}
          <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
            {/* Row 1: Search and View Toggle */}
            <div className="flex gap-2">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by request number, item, site, or requester..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`pl-9 pr-9 h-9 sm:h-10 text-base w-full ${searchQuery.trim() ? 'ring-2 ring-blue-500/50 border-blue-500' : ''}`}
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-muted"
                    title="Clear search"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={toggleViewMode}
                className="h-9 sm:h-10 w-9 sm:w-10 flex-shrink-0"
                title={`Switch to ${viewMode === "card" ? "table" : "card"} view`}
              >
                {viewMode === "card" ? (
                  <Table2 className="h-4 w-4" />
                ) : (
                  <LayoutGrid className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Row 2: Entry Type, Status Filter and Action Buttons */}
            <div className="flex flex-wrap gap-2 items-center">
              {/* Entry Type Filter */}
              <Tabs
                value={entryTypeFilter}
                onValueChange={(v) => setEntryTypeFilter(v as any)}
                className="h-9 sm:h-10"
              >
                <TabsList className="bg-muted/50 border h-full">
                  <TabsTrigger value="all" className="px-3 py-1 text-xs">All</TabsTrigger>
                  <TabsTrigger value="request" className="px-3 py-1 text-xs">Request</TabsTrigger>
                  <TabsTrigger value="direct" className="px-3 py-1 text-xs">Direct</TabsTrigger>
                </TabsList>
              </Tabs>
              {/* Status Filter */}
              <div className="flex-1 sm:flex-none sm:w-[250px]">
                {isHydrated ? (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between h-9 sm:h-10"
                      >
                        {filterStatus.length > 0
                          ? `${filterStatus.length} selected`
                          : "Filter by status"}
                        <Filter className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search status..." />
                        <CommandList className="max-h-[600px] overflow-y-auto">
                          <CommandEmpty>No status found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              onSelect={() => setFilterStatus([])}
                              className="font-medium h-auto py-3 items-start"
                            >
                              <div
                                className={cn(
                                  "mr-2 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-primary mt-0.5",
                                  filterStatus.length === 0
                                    ? "bg-primary text-primary-foreground"
                                    : "opacity-50 [&_svg]:invisible"
                                )}
                              >
                                <Check className={cn("h-4 w-4")} />
                              </div>
                              <span className="flex-1 whitespace-normal break-words leading-tight">All Statuses</span>
                            </CommandItem>
                            {/* Draft (My Drafts) Special Case */}
                            <CommandItem
                              onSelect={() => {
                                setFilterStatus((prev) =>
                                  prev.includes("draft")
                                    ? prev.filter((s) => s !== "draft")
                                    : [...prev, "draft"]
                                );
                              }}
                              className={cn("h-auto py-3 items-start", colorMap.gray.bgHover)}
                            >
                              <div
                                className={cn(
                                  "mr-2 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border mt-0.5",
                                  filterStatus.includes("draft")
                                    ? colorMap.gray.checkboxActive
                                    : cn(colorMap.gray.checkboxBorder, "opacity-50 [&_svg]:invisible")
                                )}
                              >
                                <Check className={cn("h-4 w-4")} />
                              </div>
                              <span className={cn("flex-1 whitespace-normal break-words leading-tight", colorMap.gray.text)}>Draft (My Drafts)</span>
                            </CommandItem>
                            {Object.entries(statusConfig)
                              .filter(([key]) => key !== "draft" && key !== "delivery_stage")
                              .map(([key, config]) => (
                                <CommandItem
                                  key={key}
                                  onSelect={() => {
                                    setFilterStatus((prev) =>
                                      prev.includes(key)
                                        ? prev.filter((s) => s !== key)
                                        : [...prev, key]
                                    );
                                  }}
                                  className={cn("h-auto py-3 items-start", (colorMap[config.color] || colorMap.gray).bgHover)}
                                >
                                  <div
                                    className={cn(
                                      "mr-2 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border mt-0.5",
                                      filterStatus.includes(key)
                                        ? (colorMap[config.color] || colorMap.gray).checkboxActive
                                        : cn((colorMap[config.color] || colorMap.gray).checkboxBorder, "opacity-50 [&_svg]:invisible")
                                    )}
                                  >
                                    <Check className={cn("h-4 w-4")} />
                                  </div>
                                  <span className={cn("flex-1 whitespace-normal break-words leading-tight", (colorMap[config.color] || colorMap.gray).text)}>{config.label}</span>
                                </CommandItem>
                              ))}
                          </CommandGroup>
                          {filterStatus.length > 0 && (
                            <>
                              <CommandSeparator />
                              <CommandGroup>
                                <CommandItem
                                  onSelect={() => setFilterStatus([])}
                                  className="justify-center text-center"
                                >
                                  Clear filters
                                </CommandItem>
                              </CommandGroup>
                            </>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full justify-between h-9 sm:h-10 opacity-50"
                    disabled
                  >
                    Filter by status
                    <Filter className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                )}
              </div>

              <Button
                variant="outline"
                onClick={() => setShowPendingPODialog(true)}
                className={cn(
                  "h-9 sm:h-10 transition-all",
                  "border-amber-500/60 text-amber-600 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-500 dark:hover:bg-amber-900/20 dark:text-amber-400 dark:border-amber-500/50"
                )}
              >
                <Clock className="h-4 w-4 mr-2" />
                Pending PO
              </Button>

              {/* Split Action Button: Create Direct PO + Dropdown */}
              <div className="relative ml-auto" ref={splitBtnRef}>
                <div className="flex items-stretch">
                  {/* Main Button */}
                  <Button
                    onClick={handleOpenDirectPO}
                    className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 h-9 sm:h-10 rounded-r-none border-r border-white/20"
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Create Direct PO
                  </Button>
                  {/* Dropdown Arrow */}
                  <Button
                    onClick={() => setSplitDropdownOpen((v) => !v)}
                    className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 h-9 sm:h-10 rounded-l-none px-2 min-w-0"
                    aria-label="More direct actions"
                  >
                    <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", splitDropdownOpen && "rotate-180")} />
                  </Button>
                </div>
                {/* Dropdown Menu */}
                {splitDropdownOpen && (
                  <div className="absolute right-0 top-full mt-1 z-50 min-w-[160px] bg-popover border border-border rounded-md shadow-lg py-1 animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-150">
                    <button
                      onClick={() => { setSplitDropdownOpen(false); handleOpenDirectCC(); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors flex items-center gap-2"
                    >
                      <FileText className="h-4 w-4 text-blue-500" />
                      Direct CC
                    </button>
                    <button
                      onClick={() => { setSplitDropdownOpen(false); handleOpenDirectDC(); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors flex items-center gap-2"
                    >
                      <Truck className="h-4 w-4 text-green-500" />
                      Direct DC
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Pagination - Top */}
          <div className="mb-3">
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
              totalItems={totalItems}
              pageSizeOptions={[10, 25, 50, 100]}
              itemCount={paginatedRequests.length}
            />
          </div>

          {/* Requests Display */}
          {filteredRequestGroups.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center space-y-3">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted">
                    <FileText className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">No requests found</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {searchQuery
                        ? "Try adjusting your search criteria"
                        : "No requests found with current status filter"
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : viewMode === "table" ? (
            <RequestsTable
              requests={paginatedRequests as any}
              viewMode="table"
              onViewDetails={handleSafeViewDetails}
              onOpenCC={(requestId, requestIds) => handleOpenCC(requestId)}
              onDirectPO={handleDirectPO}
              onDirectDelivery={handleDirectDelivery}
              onCheck={handleCheck}
              onCreatePO={handleCreatePO}
              onMoveToCC={handleMoveToCC}
              onConfirmDelivery={handleConfirmDelivery}
              onViewPDF={(poNumber, requestId) => { setPdfPreviewPoNumber(poNumber); setPdfPreviewRequestId(requestId); }}
              showCreator={true}
            />
          ) : (
            <div className="space-y-8">
              {paginatedGroups.map((group) => {
                // ── Direct DC virtual card ─────────────────────────
                if ((group as any).isDirectDC) {
                  const dc = (group as any).dcData;
                  return (
                    <div key={group.requestNumber} className="border rounded-xl bg-card shadow-sm overflow-hidden">
                      {/* Header */}
                      <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-700 font-semibold text-xs">
                            <Truck className="h-3 w-3 mr-1" /> Direct DC
                          </Badge>
                          <span className="font-mono font-semibold text-sm">{dc.deliveryId}</span>
                          <span className="text-xs text-muted-foreground">{format(new Date(dc.dcDate || dc.createdAt), "dd MMM yyyy")}</span>
                        </div>
                        <Badge variant={dc.status === "delivered" ? "default" : "secondary"} className={cn(
                          "text-xs",
                          dc.status === "delivered" && "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-400",
                          dc.status === "pending" && "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-400"
                        )}>
                          {dc.status === "delivered" ? "Delivered" : dc.status === "cancelled" ? "Cancelled" : "Pending"}
                        </Badge>
                      </div>
                      {/* Body */}
                      <div className="px-4 py-3 space-y-2">
                        {/* Vendor info */}
                        {dc.vendor && (
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">Vendor:</span>
                            <span className="font-medium">{dc.vendor.companyName}</span>
                            {dc.vendor.phone && <span className="text-xs text-muted-foreground">({dc.vendor.phone})</span>}
                          </div>
                        )}
                        {/* Items list */}
                        <div className="space-y-1">
                          {(dc.directItems || []).map((item: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between text-sm py-1 px-2 rounded bg-muted/40">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono text-muted-foreground w-5">{idx + 1}.</span>
                                <span className="font-medium">{item.itemName}</span>
                                {item.description && <span className="text-xs text-muted-foreground truncate max-w-[200px]">— {item.description}</span>}
                              </div>
                              <span className="font-semibold text-xs">{item.quantity} {item.unit}</span>
                            </div>
                          ))}
                        </div>
                        {/* Transport info */}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                          {dc.deliveryPerson && <span>Driver: {dc.deliveryPerson}</span>}
                          {dc.vehicleNumber && <span>Vehicle: {dc.vehicleNumber}</span>}
                          {dc.receiverName && <span>Receiver: {dc.receiverName}</span>}
                        </div>
                      </div>
                      {/* Footer actions */}
                      <div className="px-4 py-2 border-t bg-muted/20 flex items-center gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs gap-1.5"
                          onClick={() => {
                            // Build DCData for preview
                            const dcPreview: DCData = {
                              deliveryId: dc.deliveryId,
                              createdAt: dc.dcDate || dc.createdAt,
                              deliveryType: dc.deliveryType,
                              deliveryPerson: dc.deliveryPerson,
                              deliveryContact: dc.deliveryContact,
                              vehicleNumber: dc.vehicleNumber,
                              receiverName: dc.receiverName,
                              po: null,
                              vendor: dc.vendor,
                              items: (dc.directItems || []).map((item: any, i: number) => ({
                                _id: `dc-item-${i}`,
                                itemName: item.itemName,
                                quantity: item.quantity,
                                unit: item.unit,
                                description: item.description,
                                hsnSacCode: item.hsnSacCode,
                              })),
                              creator: dc.creator,
                            };
                            setViewDCData(dcPreview);
                          }}
                        >
                          <Eye className="h-3.5 w-3.5" /> View DC
                        </Button>
                      </div>
                    </div>
                  );
                }

                // ── Normal request group card ─────────────────────
                const { requestNumber, items, firstItem } = group;
                const hasMultipleItems = items.length > 1;

                // Determine overall status for the group
                const allItemsHaveSameStatus = items.length > 0
                  ? items.every((item: any) => item.status === items[0].status)
                  : true;

                const overallStatus = allItemsHaveSameStatus ? items[0].status : "partially_processed";
                const statusInfo = statusConfig[overallStatus] || { label: overallStatus, variant: "outline", icon: FileText, color: "gray" };

                // Count urgent items
                const urgentCount = items.filter((item: any) => item.isUrgent && item.status !== "direct_po" && item.directAction !== "po").length;

                return (
                  <PurchaseRequestGroupCard
                    key={requestNumber}
                    requestNumber={requestNumber}
                    items={items as any}
                    firstItem={firstItem as any}
                    statusInfo={statusInfo}
                    hasMultipleItems={hasMultipleItems}
                    urgentCount={urgentCount}
                    onViewDetails={handleSafeViewDetails}
                    onOpenCC={handleOpenCC}
                    onSiteClick={setSelectedSiteId}
                    onItemClick={setSelectedItemName}
                    canEditVendor={true}
                    onDirectPO={handleDirectPO}
                    onDirectDelivery={handleDirectDelivery}
                    onMoveToCC={handleMoveToCC}
                    onCheck={handleCheck}
                    onCreatePO={handleCreatePO}
                    onCreateBulkPO={handleCreateBulkPO}
                    onViewPDF={(poNumber, requestId) => { setPdfPreviewPoNumber(poNumber); setPdfPreviewRequestId(requestId); }}
                  />
                );
              })}
            </div>
          )}

          {/* Pagination - Bottom */}
          <div className="mt-4 border-t pt-4">
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
              totalItems={totalItems}
              pageSizeOptions={[10, 25, 50, 100]}
              itemCount={paginatedRequests.length}
            />
          </div>
        </div>
      )}

      {/* Dialogs */}
      {/* Guard: only open RequestDetailsDialog for real request IDs, never for Direct DC delivery IDs */}
      <RequestDetailsDialog
        open={!!selectedRequestId && !directDCDeliveries?.some((dc: any) => dc._id === selectedRequestId)}
        onOpenChange={(open) => { if (!open) setSelectedRequestId(null); }}
        requestId={selectedRequestId}
        onCheck={handleCheck}
        onCreatePO={handleCreateBulkPO}
        onOpenCC={setCCRequestId}
      />

      {ccRequestId && (
        <CostComparisonDialog
          open={!!ccRequestId}
          onOpenChange={(open) => {
            if (!open) setCCRequestId(null);
          }}
          requestId={ccRequestId!}
        />
      )}

      <CostComparisonDialog
        open={!!editDirectCCId}
        onOpenChange={(open) => {
          if (!open) setEditDirectCCId(null);
        }}
        isDirect={true}
        directCCId={editDirectCCId || undefined}
      />

      {checkRequestId && (
        <CheckDialog
          open={!!checkRequestId}
          onOpenChange={(open) => !open && setCheckRequestId(null)}
          requestId={checkRequestId}
        />
      )}

      <ConfirmDeliveryDialog
        open={!!showConfirmDelivery}
        onOpenChange={(open) => !open && setShowConfirmDelivery(null)}
        requestId={showConfirmDelivery}
      />

      <ItemInfoDialog
        open={!!selectedItemName}
        onOpenChange={(open) => {
          if (!open) setSelectedItemName(null);
        }}
        itemName={selectedItemName}
      />

      <LocationInfoDialog
        open={!!selectedSiteId}
        onOpenChange={(open) => {
          if (!open) setSelectedSiteId(null);
        }}
        locationId={selectedSiteId}
      />

      <DirectPODialog
        open={showDirectPODialog}
        onOpenChange={(open) => {
          setShowDirectPODialog(open);
          if (!open) setDirectPOInitialData(null);
        }}
        initialData={directPOInitialData}
        mode={directPOMode}
      />

      <DirectDCDialog
        open={showDirectDCDialog}
        onOpenChange={setShowDirectDCDialog}
      />

      <PDFPreviewDialog
        open={!!pdfPreviewPoNumber}
        onOpenChange={(open) => { if (!open) { setPdfPreviewPoNumber(null); setPdfPreviewRequestId(null); } }}
        poNumber={pdfPreviewPoNumber}
        requestId={pdfPreviewRequestId}
      />

      {/* Direct CC Dialog */}
      {showDirectCCDialog && (
        <CostComparisonDialog
          open={showDirectCCDialog}
          onOpenChange={setShowDirectCCDialog}
          isDirect={true}
        />
      )}

      {/* Direct DC Preview Dialog */}
      {viewDCData && (
        <Dialog open={!!viewDCData} onOpenChange={(open) => { if (!open) setViewDCData(null); }}>
          <DraggableDialogContent className="w-[98vw] sm:w-[1200px] max-w-[100vw] h-[85vh] max-h-[90vh] flex flex-col">
            <div data-dialog-drag-handle="true" className="flex flex-col gap-2 text-center sm:text-left cursor-move select-none active:cursor-grabbing border-b pb-4">
              <DialogTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-green-600" />
                Delivery Challan — {viewDCData.deliveryId}
              </DialogTitle>
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="flex justify-center bg-gray-100 dark:bg-gray-900 p-4 border rounded-md">
                <div className="scale-[0.78] origin-top max-w-full overflow-x-auto shadow-lg bg-white">
                  <DeliveryChallanTemplate data={viewDCData} />
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-3 border-t gap-2">
              <Button variant="outline" onClick={() => setViewDCData(null)}>Close</Button>
              <Button
                onClick={() => {
                  const printWindow = window.open("", "_blank");
                  if (printWindow) {
                    const el = document.querySelector(".dc-print-area");
                    printWindow.document.write(`<html><head><title>DC - ${viewDCData.deliveryId}</title></head><body>`);
                    printWindow.document.write(document.querySelector(".scale-\\[0\\.78\\]")?.innerHTML || "");
                    printWindow.document.write("</body></html>");
                    printWindow.document.close();
                    printWindow.print();
                  }
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              >
                <FileText className="h-4 w-4" /> Print DC
              </Button>
            </div>
          </DraggableDialogContent>
        </Dialog>
      )}
    </>
  );
}
