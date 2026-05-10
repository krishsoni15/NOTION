/**
 * Shared Types for Direct Actions Module
 * 
 * Unified types for CC, DC, and PO entities
 */

import type { Id } from "@/convex/_generated/dataModel";

// Entity Types
export type DirectActionEntity = "cc" | "dc" | "po";
export type DirectActionType = "all" | "direct" | "request-based";

// Cost Comparison Types
export interface CostComparison {
  _id: Id<"costComparisons">;
  requestId?: Id<"requests">; // Optional for direct CCs
  status: "draft" | "cc_pending" | "cc_approved" | "cc_rejected";
  createdBy: Id<"users">;
  createdAt: number;
  updatedAt: number;
  vendorQuotes: Array<{
    vendorId: Id<"vendors">;
    unitPrice: number;
  }>;
  selectedVendorId?: Id<"vendors">;
  managerNotes?: string;
  // Direct CC fields
  itemName?: string;
  quantity?: number;
  unit?: string;
  description?: string;
  ccTitle?: string; // User-defined title
  // Request data (populated by query)
  request?: {
    _id: Id<"requests">;
    requestNumber: string;
    itemName: string;
    quantity: number;
    unit: string;
    description: string;
  } | null;
}

// Purchase Order Types
export interface PurchaseOrder {
  _id: Id<"purchaseOrders">;
  poNumber: string;
  requestId?: Id<"requests">;
  deliverySiteId?: Id<"sites">;
  vendorId: Id<"vendors">;
  status: "pending_approval" | "sign_pending" | "approved" | "ordered" | "delivered" | "cancelled" | "closed";
  createdBy: Id<"users">;
  createdAt: number;
  updatedAt: number;
  isDirect?: boolean;
  itemDescription: string;
  customTitle?: string; // User-defined title
  quantity: number;
  unit: string;
  totalAmount: number;
}

// Delivery Challan Types
export interface DeliveryChallan {
  _id: Id<"deliveries">;
  deliveryId: string;
  poId?: Id<"purchaseOrders">;
  status: "pending" | "delivered" | "cancelled";
  createdBy: Id<"users">;
  createdAt: number;
  updatedAt: number;
  deliveryType: "private" | "public" | "vendor";
  deliveryPerson?: string;
  receiverName: string;
  customTitle?: string; // User-defined title
}

// Unified Direct Action Item
export interface DirectActionItem {
  id: string; // Unique ID (CC-001, DC-XXXX, PO-001)
  type: DirectActionEntity;
  displayId: string; // Just the ID part (CC-001)
  customTitle?: string; // User-defined title
  status: string;
  createdDate: number;
  createdBy: Id<"users">;
  requestId?: Id<"requests">;
  isDirect: boolean; // Is this a direct action (not request-based)
  rawData: CostComparison | PurchaseOrder | DeliveryChallan;
  // Merged CC support
  mergedRequestIds?: Id<"requests">[]; // All request IDs in a merged CC group
  mergedCount?: number; // Number of items in merged CC
  mergedItemNames?: string[]; // Item names in merged CC
}

// Filter Options
export interface DirectActionFilters {
  entityType: "all" | DirectActionEntity;
  actionType: DirectActionType;
  searchQuery?: string;
  statusFilter?: string;
}

// Table Column Data
export interface TableRow {
  id: string;
  displayId: string;
  customTitle?: string;
  status: string;
  createdDate: string;
  type: DirectActionEntity;
  rawData: any;
}
