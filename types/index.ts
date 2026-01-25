/**
 * Shared TypeScript Types
 */

import { Role } from "@/lib/auth/roles";
import { Id } from "@/convex/_generated/dataModel";

// ============================================================================
// User Types
// ============================================================================

export interface User {
  _id: Id<"users">;
  clerkUserId: string;
  username: string;
  fullName: string;
  phoneNumber: string;
  address: string;
  role: Role;
  isActive: boolean;
  createdBy?: Id<"users">; // undefined for first manager
  _creationTime: number; // Convex built-in field
  createdAt: number;
  updatedAt: number;
}

export interface CreateUserInput {
  username: string;
  fullName: string;
  phoneNumber: string;
  address: string;
  role: Role;
  password: string; // Will be handled by Clerk
}

export interface UpdateUserInput {
  userId: Id<"users">;
  fullName?: string;
  phoneNumber?: string;
  address?: string;
  role?: Role;
  isActive?: boolean;
}

// ============================================================================
// Request Types
// ============================================================================

export type RequestStatus =
  | "draft"
  | "pending"
  | "sign_pending"
  | "approved"
  | "rejected"
  | "sign_rejected"
  | "recheck"
  | "ready_for_cc"
  | "cc_pending"
  | "cc_approved"
  | "cc_rejected"
  | "ready_for_po"
  | "pending_po"
  | "rejected_po"
  | "ready_for_delivery"
  | "delivery_processing"
  | "delivered"
  | "recheck_requested"
  | "partially_processed"
  | "direct_po"
  | "ordered"
  | "out_for_delivery"
  | "delivery_stage"
  | "po_rejected";

export interface RequestItem {
  name: string;
  quantity: number;
  unit: string;
  description?: string;
}

export interface Request {
  _id: Id<"requests">;
  requestNumber: string;
  createdBy: Id<"users">;
  items: RequestItem[];
  status: RequestStatus;
  approvedBy?: Id<"users">;
  approvedAt?: number;
  rejectionReason?: string;
  deliveryMarkedAt?: number;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface CreateRequestInput {
  items: RequestItem[];
  notes?: string;
}

export interface ApproveRequestInput {
  requestId: Id<"requests">;
}

export interface RejectRequestInput {
  requestId: Id<"requests">;
  rejectionReason: string;
}

export interface MarkDeliveryInput {
  requestId: Id<"requests">;
}

// ============================================================================
// Purchase Order Types
// ============================================================================

export type POStatus = "draft" | "sent" | "received" | "completed";

export interface POItem {
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
}

export interface PurchaseOrder {
  _id: Id<"purchaseOrders">;
  poNumber: string;
  requestId: Id<"requests">;
  vendorId: Id<"vendors">;
  createdBy: Id<"users">;
  items: POItem[];
  totalAmount: number;
  status: POStatus;
  expectedDeliveryDate: number;
  actualDeliveryDate?: number;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface CreatePOInput {
  requestId: Id<"requests">;
  vendorId: Id<"vendors">;
  items: POItem[];
  expectedDeliveryDate: number;
  notes?: string;
}

// ============================================================================
// Vendor Types
// ============================================================================

export interface Vendor {
  _id: Id<"vendors">;
  name: string;
  contactPerson: string;
  phoneNumber: string;
  email?: string;
  address: string;
  isActive: boolean;
  createdBy: Id<"users">;
  createdAt: number;
  updatedAt: number;
}

export interface CreateVendorInput {
  name: string;
  contactPerson: string;
  phoneNumber: string;
  email?: string;
  address: string;
}

export interface UpdateVendorInput {
  vendorId: Id<"vendors">;
  name?: string;
  contactPerson?: string;
  phoneNumber?: string;
  email?: string;
  address?: string;
  isActive?: boolean;
}

