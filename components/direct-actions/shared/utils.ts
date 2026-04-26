/**
 * Shared Utilities for Direct Actions Module
 * 
 * Common functions for formatting, filtering, and data transformation
 */

import type { DirectActionItem, DirectActionFilters, CostComparison, PurchaseOrder, DeliveryChallan } from "./types";
import { format } from "date-fns";
import { getGlobalIDCache } from "./id-cache";
import { getGlobalFilterCache } from "./memoization";
import { sortByDateOptimized } from "./sorting-optimization";

/**
 * Generate standardized document ID with prefix and sequential numbering
 * Returns formatted ID like CC-001, PO-002, DC-003 based on creation order
 */
export function generateStandardizedId(
  items: Array<{ createdAt: number; _id: string }>,
  currentItem: { createdAt: number; _id: string },
  type: "cc" | "dc" | "po"
): string {
  // Sort all items by creation timestamp (oldest first)
  const sortedItems = [...items].sort((a, b) => a.createdAt - b.createdAt);
  
  // Find the index of the current item in the sorted list
  const index = sortedItems.findIndex(item => item._id === currentItem._id);
  
  // Generate sequential number with 3-digit padding
  const sequentialNumber = (index + 1).toString().padStart(3, '0');
  
  // Return formatted ID with prefix
  switch (type) {
    case "cc":
      return `CC-${sequentialNumber}`;
    case "po":
      return `PO-${sequentialNumber}`;
    case "dc":
      return `DC-${sequentialNumber}`;
    default:
      return `UNK-${sequentialNumber}`;
  }
}

/**
 * Format ID display with standardized document format
 * CC → CC-001, CC-002, CC-003...
 * DC → DC-001, DC-002, DC-003...
 * PO → PO-001, PO-002, PO-003...
 * 
 * Uses caching to reduce database queries and improve performance
 */
export function formatEntityId(
  entity: any, 
  type: "cc" | "dc" | "po", 
  allItems?: Array<{ createdAt: number; _id: string }>
): string {
  // Check cache first
  const idCache = getGlobalIDCache();
  const cachedId = idCache.get(entity._id, type);
  
  if (cachedId) {
    return cachedId;
  }
  
  // If allItems is provided, use standardized ID system
  if (allItems) {
    const formattedId = generateStandardizedId(allItems, entity, type);
    // Store in cache for future use
    idCache.set(entity._id, type, formattedId);
    return formattedId;
  }
  
  // Fallback to old system if allItems not provided (should not happen in new implementation)
  switch (type) {
    case "cc":
      return "CC-???";
    case "dc":
      return "DC-???";
    case "po":
      return "PO-???";
    default:
      return "???";
  }
}

/**
 * Determine if an item is editable based on its type and status
 */
export function isItemEditable(item: DirectActionItem): boolean {
  switch (item.type) {
    case "cc":
      // CC is editable only if it's in draft status
      return item.status === "draft";
    
    case "dc":
      // DC is editable only if it's in draft or pending status
      // Once marked as "delivered" (finalized), it becomes read-only
      return item.status === "pending" || item.status === "draft";
    
    case "po":
      // PO is NEVER editable - always view only as per specification
      return false;
    
    default:
      return false;
  }
}

/**
 * Get the appropriate action button type for an item
 */
export function getActionButtonType(item: DirectActionItem): "edit" | "view" {
  return isItemEditable(item) ? "edit" : "view";
}

/**
 * Get status badge color based on status
 */
export function getStatusColor(status: string, type: "cc" | "dc" | "po"): string {
  // CC statuses
  if (type === "cc") {
    switch (status) {
      case "draft":
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
      case "cc_pending":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "cc_approved":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "cc_rejected":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800";
    }
  }

  // DC statuses
  if (type === "dc") {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "delivered":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800";
    }
  }

  // PO statuses
  if (type === "po") {
    switch (status) {
      case "pending_approval":
      case "sign_pending":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "approved":
      case "ordered":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "delivered":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200";
      case "rejected":
      case "cancelled":
      case "closed":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800";
    }
  }

  return "bg-gray-100 text-gray-800";
}

/**
 * Get status label for display
 */
export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    // CC
    draft: "Draft",
    cc_pending: "Pending Approval",
    cc_approved: "Approved",
    cc_rejected: "Rejected",
    // DC
    pending: "Out for Delivery",
    delivered: "Delivered",
    cancelled: "Cancelled",
    // PO
    pending_approval: "Pending Approval",
    sign_pending: "Awaiting Signature",
    approved: "Approved",
    ordered: "Ordered",
    rejected: "Rejected",
    closed: "Closed",
  };
  return labels[status] || status;
}

/**
 * Determine if entity is direct action (not request-based)
 */
export function isDirect(entity: any, type: "cc" | "dc" | "po"): boolean {
  switch (type) {
    case "po":
      return entity.isDirect === true || !entity.requestId;
    case "dc":
      return !entity.poId; // Direct delivery without PO
    case "cc":
      return !entity.requestId; // Direct CC if no requestId
    default:
      return false;
  }
}

/**
 * Filter items based on criteria
 * Uses memoization to avoid re-filtering identical datasets
 */
export function filterDirectActions(
  items: DirectActionItem[],
  filters: DirectActionFilters
): DirectActionItem[] {
  // Check memoization cache first
  const filterCache = getGlobalFilterCache();
  const cachedResult = filterCache.get(items, filters);
  
  if (cachedResult) {
    return cachedResult;
  }
  
  // Perform filtering
  const result = items.filter((item) => {
    // Entity type filter
    if (filters.entityType !== "all" && item.type !== filters.entityType) {
      return false;
    }

    // Action type filter
    if (filters.actionType !== "all") {
      const isDirectItem = isDirect(item.rawData, item.type);
      if (filters.actionType === "direct" && !isDirectItem) {
        return false;
      }
      if (filters.actionType === "request-based" && isDirectItem) {
        return false;
      }
    }

    // Search query filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const fullTitle = item.customTitle 
        ? `${item.displayId} | ${item.customTitle}`
        : item.displayId;
      
      if (
        !fullTitle.toLowerCase().includes(query) &&
        !item.displayId.toLowerCase().includes(query)
      ) {
        return false;
      }
    }

    // Status filter
    if (filters.statusFilter && item.status !== filters.statusFilter) {
      return false;
    }

    return true;
  });
  
  // Store in cache for future use
  filterCache.set(items, filters, result);
  
  return result;
}

/**
 * Sort items by creation date (newest first)
 * Uses optimized sorting with memoization for large datasets
 */
export function sortByDate(items: DirectActionItem[]): DirectActionItem[] {
  return sortByDateOptimized(items);
}

/**
 * Format date for display
 */
export function formatDate(timestamp: number): string {
  return format(new Date(timestamp), "MMM dd, yyyy");
}

/**
 * Format date and time for display
 */
export function formatDateTime(timestamp: number): string {
  return format(new Date(timestamp), "MMM dd, yyyy HH:mm");
}

/**
 * Get entity type label
 */
export function getEntityLabel(type: "cc" | "dc" | "po"): string {
  switch (type) {
    case "cc":
      return "Cost Comparison";
    case "dc":
      return "Delivery Challan";
    case "po":
      return "Purchase Order";
    default:
      return "Unknown";
  }
}
