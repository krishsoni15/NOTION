/**
 * Material Requests Management Functions
 * 
 * Handles CRUD operations for material requests.
 * Site Engineers can create requests.
 * Managers can approve/reject requests.
 * Site Engineers can mark deliveries.
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "./_generated/dataModel";

// Helper function to get current user
async function getCurrentUser(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new Error("Not authenticated");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_user_id", (q: any) => q.eq("clerkUserId", userId))
    .unique();

  if (!user) {
    throw new Error("User not found");
  }

  return user;
}

// ============================================================================
// Queries
// ============================================================================

/**
 * Get sites assigned to current user
 * Returns empty array if user has no assigned sites
 */
export const getUserAssignedSites = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q: any) => q.eq("clerkUserId", userId))
      .unique();

    if (!currentUser) return [];

    if (!currentUser.assignedSites || currentUser.assignedSites.length === 0) {
      return [];
    }

    // Fetch site details for assigned sites
    const sites = await Promise.all(
      currentUser.assignedSites.map(async (siteId: Id<"sites">) => {
        const site = await ctx.db.get(siteId);
        return site;
      })
    );

    // Filter out inactive sites and null values
    return sites.filter((site) => site && site.isActive);
  },
});

/**
 * Get inventory items for autocomplete suggestions
 * Returns all active inventory items with their names and units
 */
export const getInventoryItemsForAutocomplete = query({
  args: {
    searchQuery: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q: any) => q.eq("clerkUserId", userId))
      .unique();

    if (!currentUser) return [];

    // All roles can view inventory for autocomplete
    let items = await ctx.db
      .query("inventory")
      .withIndex("by_is_active", (q) => q.eq("isActive", true))
      .collect();

    // Filter by search query if provided
    if (args.searchQuery && args.searchQuery.trim()) {
      const query = args.searchQuery.toLowerCase().trim();
      items = items.filter((item) =>
        item.itemName.toLowerCase().includes(query)
      );
    }

    // Return simplified item data for autocomplete
    return items.map((item) => ({
      _id: item._id,
      itemName: item.itemName,
      unit: item.unit || "",
      centralStock: item.centralStock || 0,
    }));
  },
});

/**
 * Get all requests created by current user (Site Engineer)
 */
export const getUserRequests = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q: any) => q.eq("clerkUserId", userId))
      .unique();

    if (!currentUser) return [];

    const requests = await ctx.db
      .query("requests")
      .withIndex("by_created_by", (q) => q.eq("createdBy", currentUser._id))
      .order("desc")
      .collect();

    // Fetch related data (site, creator, approver)
    const requestsWithDetails = await Promise.all(
      requests.map(async (request) => {
        const site = await ctx.db.get(request.siteId);
        const creator = await ctx.db.get(request.createdBy);
        const approver = request.approvedBy
          ? await ctx.db.get(request.approvedBy)
          : null;

        return {
          ...request,
          site: site
            ? {
                _id: site._id,
                name: site.name,
                code: site.code,
                address: site.address,
              }
            : null,
          creator: creator
            ? {
                _id: creator._id,
                fullName: creator.fullName,
              }
            : null,
          approver: approver
            ? {
                _id: approver._id,
                fullName: approver.fullName,
              }
            : null,
        };
      })
    );

    return requestsWithDetails;
  },
});

/**
 * Get requests ready for cost comparison (Purchase Officer view)
 */
export const getRequestsReadyForCC = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q: any) => q.eq("clerkUserId", userId))
      .unique();

    if (!currentUser) return [];

    // Only purchase officers can view these requests
    if (currentUser.role !== "purchase_officer") {
      return [];
    }

    const requests = await ctx.db
      .query("requests")
      .withIndex("by_status", (q) => q.eq("status", "ready_for_cc"))
      .order("desc")
      .collect();

    // Fetch related data
    const requestsWithDetails = await Promise.all(
      requests.map(async (request) => {
        const site = await ctx.db.get(request.siteId);
        const creator = await ctx.db.get(request.createdBy);
        const approver = request.approvedBy
          ? await ctx.db.get(request.approvedBy)
          : null;

        return {
          ...request,
          site: site
            ? {
                _id: site._id,
                name: site.name,
                code: site.code,
                address: site.address,
              }
            : null,
          creator: creator
            ? {
                _id: creator._id,
                fullName: creator.fullName,
              }
            : null,
          approver: approver
            ? {
                _id: approver._id,
                fullName: approver.fullName,
              }
            : null,
        };
      })
    );

    return requestsWithDetails;
  },
});

/**
 * Get requests by status for purchase officer dashboard
 */
export const getPurchaseRequestsByStatus = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("ready_for_cc"),
        v.literal("cc_pending"),
        v.literal("cc_approved"),
        v.literal("ready_for_po"),
        v.literal("delivery_stage")
      )
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q: any) => q.eq("clerkUserId", userId))
      .unique();

    if (!currentUser) return [];

    // Only purchase officers can view these requests
    if (currentUser.role !== "purchase_officer") {
      return [];
    }

    let requests;
    if (args.status) {
      // TypeScript guard: ensure status is defined before using it
      const status = args.status;
      requests = await ctx.db
        .query("requests")
        .withIndex("by_status", (q) => q.eq("status", status))
        .order("desc")
        .collect();
    } else {
      // Get all purchase-related requests
      requests = await ctx.db
        .query("requests")
        .collect();
      
      requests = requests.filter((r) =>
        ["ready_for_cc", "cc_rejected", "cc_pending", "cc_approved", "ready_for_po", "delivery_stage"].includes(r.status)
      );
    }

    // Fetch related data
    const requestsWithDetails = await Promise.all(
      requests.map(async (request) => {
        const site = await ctx.db.get(request.siteId);
        const creator = await ctx.db.get(request.createdBy);
        const approver = request.approvedBy
          ? await ctx.db.get(request.approvedBy)
          : null;

        return {
          ...request,
          site: site
            ? {
                _id: site._id,
                name: site.name,
                code: site.code,
                address: site.address,
              }
            : null,
          creator: creator
            ? {
                _id: creator._id,
                fullName: creator.fullName,
              }
            : null,
          approver: approver
            ? {
                _id: approver._id,
                fullName: approver.fullName,
              }
            : null,
        };
      })
    );

    return requestsWithDetails;
  },
});

/**
 * Get all requests (Manager view)
 */
export const getAllRequests = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q: any) => q.eq("clerkUserId", userId))
      .unique();

    if (!currentUser) return [];

    // Only managers can view all requests
    if (currentUser.role !== "manager") {
      return [];
    }

    const requests = await ctx.db
      .query("requests")
      .withIndex("by_created_at")
      .order("desc")
      .collect();

    // Fetch related data (site, creator, approver)
    const requestsWithDetails = await Promise.all(
      requests.map(async (request) => {
        const site = await ctx.db.get(request.siteId);
        const creator = await ctx.db.get(request.createdBy);
        const approver = request.approvedBy
          ? await ctx.db.get(request.approvedBy)
          : null;

        return {
          ...request,
          site: site
            ? {
                _id: site._id,
                name: site.name,
                code: site.code,
                address: site.address,
              }
            : null,
          creator: creator
            ? {
                _id: creator._id,
                fullName: creator.fullName,
              }
            : null,
          approver: approver
            ? {
                _id: approver._id,
                fullName: approver.fullName,
              }
            : null,
        };
      })
    );

    return requestsWithDetails;
  },
});

/**
 * Get single request by ID
 */
export const getRequestById = query({
  args: { requestId: v.id("requests") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q: any) => q.eq("clerkUserId", userId))
      .unique();

    if (!currentUser) return null;

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      return null;
    }

    // Check permissions: Site engineers can only view their own requests
    // Managers can view all requests
    if (
      currentUser.role === "site_engineer" &&
      request.createdBy !== currentUser._id
    ) {
      return null;
    }

    // Fetch related data
    const site = await ctx.db.get(request.siteId);
    const creator = await ctx.db.get(request.createdBy);
    const approver = request.approvedBy
      ? await ctx.db.get(request.approvedBy)
      : null;

    return {
      ...request,
      site: site
        ? {
            _id: site._id,
            name: site.name,
            code: site.code,
            address: site.address,
          }
        : null,
      creator: creator
        ? {
            _id: creator._id,
            fullName: creator.fullName,
          }
        : null,
      approver: approver
        ? {
            _id: approver._id,
            fullName: approver.fullName,
          }
        : null,
    };
  },
});

// ============================================================================
// Mutations
// ============================================================================

/**
 * Create a new material request (Site Engineer only)
 */
export const createMaterialRequest = mutation({
  args: {
    siteId: v.id("sites"),
    itemName: v.string(),
    description: v.string(),
    specsBrand: v.optional(v.string()),
    quantity: v.number(),
    unit: v.string(),
    requiredBy: v.number(),
    isUrgent: v.boolean(),
    photo: v.optional(
      v.object({
        imageUrl: v.string(),
        imageKey: v.string(),
      })
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);

    // Only site engineers can create requests
    if (currentUser.role !== "site_engineer") {
      throw new Error("Unauthorized: Only site engineers can create requests");
    }

    // Verify site exists and is assigned to user
    const site = await ctx.db.get(args.siteId);
    if (!site || !site.isActive) {
      throw new Error("Site not found or inactive");
    }

    if (
      !currentUser.assignedSites ||
      !currentUser.assignedSites.includes(args.siteId)
    ) {
      throw new Error("Unauthorized: Site not assigned to you");
    }

    // Generate unique sequential request number (001, 002, 003, etc.)
    const allRequests = await ctx.db.query("requests").collect();
    
    // Find the highest existing request number (if in numeric format)
    let maxNumber = 0;
    for (const request of allRequests) {
      // Try to parse as a 3-digit number (001, 002, etc.)
      const numMatch = request.requestNumber.match(/^(\d{3})$/);
      if (numMatch) {
        const num = parseInt(numMatch[1], 10);
        if (num > maxNumber) {
          maxNumber = num;
        }
      }
    }
    
    // Generate next sequential number with leading zeros
    const nextNumber = maxNumber + 1;
    const requestNumber = nextNumber.toString().padStart(3, "0");

    const now = Date.now();

    // Create request
    const requestId = await ctx.db.insert("requests", {
      requestNumber,
      createdBy: currentUser._id,
      siteId: args.siteId,
      itemName: args.itemName,
      description: args.description,
      specsBrand: args.specsBrand,
      quantity: args.quantity,
      unit: args.unit,
      requiredBy: args.requiredBy,
      isUrgent: args.isUrgent,
      photo: args.photo,
      status: "pending",
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });

    return requestId;
  },
});

/**
 * Update request status (approve/reject) - Manager only
 */
export const updateRequestStatus = mutation({
  args: {
    requestId: v.id("requests"),
    status: v.union(v.literal("approved"), v.literal("rejected"), v.literal("direct_po")),
    rejectionReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);

    // Only managers can approve/reject requests
    if (currentUser.role !== "manager") {
      throw new Error("Unauthorized: Only managers can update request status");
    }

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Request not found");
    }

    if (request.status !== "pending") {
      throw new Error("Request status can only be updated from pending");
    }

    const now = Date.now();

    // Determine new status based on action
    let newStatus: "ready_for_cc" | "ready_for_po" | "rejected";
    if (args.status === "approved") {
      newStatus = "ready_for_cc"; // Normal approval goes to cost comparison
    } else if (args.status === "direct_po") {
      newStatus = "ready_for_po"; // Direct PO bypasses cost comparison
    } else {
      newStatus = "rejected"; // Rejected stays rejected
    }

    // Update request
    await ctx.db.patch(args.requestId, {
      status: newStatus,
      approvedBy: currentUser._id,
      approvedAt: now,
      rejectionReason:
        args.status === "rejected" ? args.rejectionReason : undefined,
      updatedAt: now,
    });

    return { success: true };
  },
});

/**
 * Mark request as delivered - Site Engineer only
 */
export const markDelivery = mutation({
  args: {
    requestId: v.id("requests"),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);

    // Only site engineers can mark delivery
    if (currentUser.role !== "site_engineer") {
      throw new Error("Unauthorized: Only site engineers can mark delivery");
    }

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Request not found");
    }

    // Check if user created this request
    if (request.createdBy !== currentUser._id) {
      throw new Error("Unauthorized: You can only mark your own requests as delivered");
    }

    // Only requests in delivery_stage can be marked as delivered
    if (request.status !== "delivery_stage") {
      throw new Error("Only requests in delivery stage can be marked as delivered");
    }

    const now = Date.now();

    // Auto-update inventory if item exists
    const allInventoryItems = await ctx.db
      .query("inventory")
      .withIndex("by_is_active", (q) => q.eq("isActive", true))
      .collect();
    
    const inventoryItem = allInventoryItems.find(
      (item) => item.itemName.toLowerCase() === request.itemName.toLowerCase()
    );

    if (inventoryItem) {
      // Update inventory stock
      const currentStock = inventoryItem.centralStock || 0;
      await ctx.db.patch(inventoryItem._id, {
        centralStock: currentStock + request.quantity,
        updatedAt: now,
      });
    } else {
      // Create new inventory item if it doesn't exist
      await ctx.db.insert("inventory", {
        itemName: request.itemName,
        unit: request.unit,
        centralStock: request.quantity,
        isActive: true,
        createdBy: currentUser._id,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Update request
    await ctx.db.patch(args.requestId, {
      status: "delivered",
      deliveryMarkedAt: now,
      updatedAt: now,
    });

    return { success: true };
  },
});

/**
 * Update request status for purchase workflow - Purchase Officer only
 */
export const updatePurchaseRequestStatus = mutation({
  args: {
    requestId: v.id("requests"),
    status: v.union(
      v.literal("cc_pending"),
      v.literal("cc_approved"),
      v.literal("ready_for_po"),
      v.literal("delivery_stage")
    ),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);

    // Only purchase officers can update purchase request status
    if (currentUser.role !== "purchase_officer") {
      throw new Error("Unauthorized: Only purchase officers can update purchase request status");
    }

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Request not found");
    }

    // Validate status transitions
    const validTransitions: Record<string, string[]> = {
      ready_for_cc: ["cc_pending"],
      cc_pending: ["cc_approved", "ready_for_cc"], // Can go back if needed
      cc_approved: ["ready_for_po"],
      ready_for_po: ["delivery_stage"],
      delivery_stage: ["delivery_stage"], // Can stay in delivery stage
    };

    const currentStatus = request.status;
    const allowedStatuses = validTransitions[currentStatus] || [];
    
    if (!allowedStatuses.includes(args.status)) {
      throw new Error(`Invalid status transition from ${currentStatus} to ${args.status}`);
    }

    const now = Date.now();

    await ctx.db.patch(args.requestId, {
      status: args.status,
      updatedAt: now,
    });

    return { success: true };
  },
});

