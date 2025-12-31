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
 * Get all requests by request number (for drafts with multiple items)
 */
export const getRequestsByRequestNumber = query({
  args: { requestNumber: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q: any) => q.eq("clerkUserId", userId))
      .unique();

    if (!currentUser) return [];

    const requests = await ctx.db
      .query("requests")
      .withIndex("by_request_number", (q) => q.eq("requestNumber", args.requestNumber))
      .collect();

    // Check permissions: Site engineers can only view their own requests
    if (
      currentUser.role === "site_engineer" &&
      requests.length > 0 &&
      requests[0].createdBy !== currentUser._id
    ) {
      return [];
    }

    // Sort by itemOrder (1, 2, 3...) or createdAt as fallback
    requests.sort((a, b) => {
      const orderA = a.itemOrder ?? a.createdAt;
      const orderB = b.itemOrder ?? b.createdAt;
      return orderA - orderB;
    });

    // Fetch related data
    const requestsWithDetails = await Promise.all(
      requests.map(async (request) => {
        const site = await ctx.db.get(request.siteId);
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
    photos: v.optional(
      v.array(
        v.object({
          imageUrl: v.string(),
          imageKey: v.string(),
        })
      )
    ),
    notes: v.optional(v.string()),
    requestNumber: v.optional(v.string()), // Optional: if provided, use this request number
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

    // Use provided request number or generate a new one
    let requestNumber: string;
    if (args.requestNumber) {
      requestNumber = args.requestNumber;
    } else {
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
      requestNumber = nextNumber.toString().padStart(3, "0");
    }

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
      photos: args.photos,
      status: "pending",
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });

    return { requestId, requestNumber };
  },
});

/**
 * Create multiple material requests with the same request number (Site Engineer only)
 */
export const createMultipleMaterialRequests = mutation({
  args: {
    siteId: v.id("sites"),
    requiredBy: v.number(),
    items: v.array(
      v.object({
        itemName: v.string(),
        description: v.string(),
        quantity: v.number(),
        unit: v.string(),
        notes: v.optional(v.string()),
        isUrgent: v.boolean(),
        photos: v.optional(
          v.array(
            v.object({
              imageUrl: v.string(),
              imageKey: v.string(),
            })
          )
        ),
      })
    ),
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

    if (args.items.length === 0) {
      throw new Error("At least one item is required");
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
    const requestIds: Id<"requests">[] = [];

    // Create all requests with the same request number
    for (let i = 0; i < args.items.length; i++) {
      const item = args.items[i];
      const requestId = await ctx.db.insert("requests", {
        requestNumber,
        createdBy: currentUser._id,
        siteId: args.siteId,
        itemName: item.itemName,
        description: item.description,
        specsBrand: undefined,
        quantity: item.quantity,
        unit: item.unit,
        requiredBy: args.requiredBy,
        isUrgent: item.isUrgent,
        photos: item.photos,
        itemOrder: i + 1, // Sequential order: 1, 2, 3...
        status: "pending",
        notes: item.notes,
        createdAt: now,
        updatedAt: now,
      });
      requestIds.push(requestId);
    }

    return { requestIds, requestNumber };
  },
});

/**
 * Save multiple material requests as draft (Site Engineer only)
 */
export const saveMultipleMaterialRequestsAsDraft = mutation({
  args: {
    siteId: v.id("sites"),
    requiredBy: v.number(),
    items: v.array(
      v.object({
        itemName: v.string(),
        description: v.string(),
        quantity: v.number(),
        unit: v.string(),
        notes: v.optional(v.string()),
        isUrgent: v.boolean(),
        photos: v.optional(
          v.array(
            v.object({
              imageUrl: v.string(),
              imageKey: v.string(),
            })
          )
        ),
      })
    ),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);

    // Only site engineers can save drafts
    if (currentUser.role !== "site_engineer") {
      throw new Error("Unauthorized: Only site engineers can save drafts");
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

    if (args.items.length === 0) {
      throw new Error("At least one item is required");
    }

    // Generate temporary draft ID (DRAFT-001, DRAFT-002, etc.)
    // Only count other drafts to generate sequential draft numbers
    const allDrafts = await ctx.db
      .query("requests")
      .withIndex("by_status", (q) => q.eq("status", "draft"))
      .collect();
    
    let maxDraftNumber = 0;
    for (const draft of allDrafts) {
      const draftMatch = draft.requestNumber.match(/^DRAFT-(\d{3})$/);
      if (draftMatch) {
        const num = parseInt(draftMatch[1], 10);
        if (num > maxDraftNumber) {
          maxDraftNumber = num;
        }
      }
    }
    
    const nextDraftNumber = maxDraftNumber + 1;
    const requestNumber = `DRAFT-${nextDraftNumber.toString().padStart(3, "0")}`;

    const now = Date.now();
    const requestIds: Id<"requests">[] = [];

    // Create all requests with draft status
    for (let i = 0; i < args.items.length; i++) {
      const item = args.items[i];
      const requestId = await ctx.db.insert("requests", {
        requestNumber,
        createdBy: currentUser._id,
        siteId: args.siteId,
        itemName: item.itemName,
        description: item.description,
        specsBrand: undefined,
        quantity: item.quantity,
        unit: item.unit,
        requiredBy: args.requiredBy,
        isUrgent: item.isUrgent,
        photos: item.photos,
        itemOrder: i + 1, // Sequential order: 1, 2, 3...
        status: "draft",
        notes: item.notes,
        createdAt: now,
        updatedAt: now,
      });
      requestIds.push(requestId);
    }

    return { requestIds, requestNumber };
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
 * Bulk update request status (approve/reject multiple items) - Manager only
 */
export const bulkUpdateRequestStatus = mutation({
  args: {
    requestIds: v.array(v.id("requests")),
    status: v.union(v.literal("approved"), v.literal("rejected"), v.literal("direct_po")),
    rejectionReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);

    // Only managers can approve/reject requests
    if (currentUser.role !== "manager") {
      throw new Error("Unauthorized: Only managers can update request status");
    }

    if (args.requestIds.length === 0) {
      throw new Error("No requests selected");
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

    // Update all requests
    const results = await Promise.allSettled(
      args.requestIds.map(async (requestId) => {
        const request = await ctx.db.get(requestId);
        if (!request) {
          throw new Error(`Request ${requestId} not found`);
        }

        if (request.status !== "pending") {
          throw new Error(`Request ${requestId} status can only be updated from pending`);
        }

        await ctx.db.patch(requestId, {
          status: newStatus,
          approvedBy: currentUser._id,
          approvedAt: now,
          rejectionReason:
            args.status === "rejected" ? args.rejectionReason : undefined,
          updatedAt: now,
        });
      })
    );

    // Check for errors
    const errors = results
      .map((result, index) => {
        if (result.status === "rejected") {
          return `Request ${args.requestIds[index]}: ${result.reason}`;
        }
        return null;
      })
      .filter((error) => error !== null);

    if (errors.length > 0) {
      throw new Error(`Some requests failed to update: ${errors.join(", ")}`);
    }

    return { success: true, updatedCount: args.requestIds.length };
  },
});

/**
 * Send draft request (convert to pending with proper request number) - Site Engineer only
 */
export const sendDraftRequest = mutation({
  args: {
    requestNumber: v.string(), // Draft request number (DRAFT-001, etc.)
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);

    // Only site engineers can send their own draft requests
    if (currentUser.role !== "site_engineer") {
      throw new Error("Unauthorized: Only site engineers can send draft requests");
    }

    // Get all requests with this draft request number
    const requests = await ctx.db
      .query("requests")
      .withIndex("by_request_number", (q) => q.eq("requestNumber", args.requestNumber))
      .collect();

    if (requests.length === 0) {
      throw new Error("Draft request not found");
    }

    // Check if all requests are in draft status and created by current user
    const allDrafts = requests.every((req) => req.status === "draft" && req.createdBy === currentUser._id);
    if (!allDrafts) {
      throw new Error("All requests must be in draft status and created by you");
    }

    // Generate next sequential request number (only count non-draft requests)
    const allRequests = await ctx.db.query("requests").collect();
    
    let maxNumber = 0;
    for (const request of allRequests) {
      // Only count non-draft requests (001, 002, etc.)
      const numMatch = request.requestNumber.match(/^(\d{3})$/);
      if (numMatch) {
        const num = parseInt(numMatch[1], 10);
        if (num > maxNumber) {
          maxNumber = num;
        }
      }
    }
    
    // Generate next sequential number
    const nextNumber = maxNumber + 1;
    const newRequestNumber = nextNumber.toString().padStart(3, "0");

    const now = Date.now();

    // Update all requests to pending with new request number
    for (const request of requests) {
      await ctx.db.patch(request._id, {
        requestNumber: newRequestNumber,
        status: "pending",
        updatedAt: now,
      });
    }

    return { success: true, requestNumber: newRequestNumber };
  },
});

/**
 * Delete draft request - Site Engineer only (can delete their own drafts)
 */
export const deleteDraftRequest = mutation({
  args: {
    requestNumber: v.string(), // Draft request number
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);

    // Only site engineers can delete their own drafts
    if (currentUser.role !== "site_engineer") {
      throw new Error("Unauthorized: Only site engineers can delete their own drafts");
    }

    // Get all requests with this request number
    const requests = await ctx.db
      .query("requests")
      .withIndex("by_request_number", (q) => q.eq("requestNumber", args.requestNumber))
      .collect();

    if (requests.length === 0) {
      throw new Error("Draft request not found");
    }

    // Check if all requests are in draft status and created by current user
    const allDrafts = requests.every((req) => req.status === "draft" && req.createdBy === currentUser._id);
    if (!allDrafts) {
      throw new Error("Unauthorized: You can only delete your own drafts");
    }

    // Delete all requests
    for (const request of requests) {
      await ctx.db.delete(request._id);
    }

    return { success: true };
  },
});

/**
 * Update draft request - Site Engineer only (can edit their own drafts)
 */
export const updateDraftRequest = mutation({
  args: {
    requestNumber: v.string(), // Draft request number
    siteId: v.id("sites"),
    requiredBy: v.number(),
    items: v.array(
      v.object({
        itemName: v.string(),
        description: v.string(),
        quantity: v.number(),
        unit: v.string(),
        notes: v.optional(v.string()),
        isUrgent: v.boolean(),
        photos: v.optional(
          v.array(
            v.object({
              imageUrl: v.string(),
              imageKey: v.string(),
            })
          )
        ),
      })
    ),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);

    // Only site engineers can update their own drafts
    if (currentUser.role !== "site_engineer") {
      throw new Error("Unauthorized: Only site engineers can update drafts");
    }

    // Get existing draft requests
    const existingRequests = await ctx.db
      .query("requests")
      .withIndex("by_request_number", (q) => q.eq("requestNumber", args.requestNumber))
      .collect();

    if (existingRequests.length === 0) {
      throw new Error("Draft request not found");
    }

    // Check if all are drafts created by current user
    const allDrafts = existingRequests.every((req) => req.status === "draft" && req.createdBy === currentUser._id);
    if (!allDrafts) {
      throw new Error("Unauthorized: You can only update your own drafts");
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

    if (args.items.length === 0) {
      throw new Error("At least one item is required");
    }

    const now = Date.now();

    // Delete old requests
    for (const request of existingRequests) {
      await ctx.db.delete(request._id);
    }

    // Create new requests with same draft number
    const requestIds: Id<"requests">[] = [];
    for (let i = 0; i < args.items.length; i++) {
      const item = args.items[i];
      const requestId = await ctx.db.insert("requests", {
        requestNumber: args.requestNumber, // Keep same draft number
        createdBy: currentUser._id,
        siteId: args.siteId,
        itemName: item.itemName,
        description: item.description,
        specsBrand: undefined,
        quantity: item.quantity,
        unit: item.unit,
        requiredBy: args.requiredBy,
        isUrgent: item.isUrgent,
        photos: item.photos,
        itemOrder: i + 1, // Sequential order: 1, 2, 3...
        status: "draft",
        notes: item.notes,
        createdAt: existingRequests[0].createdAt, // Keep original creation time
        updatedAt: now,
      });
      requestIds.push(requestId);
    }

    return { requestIds, requestNumber: args.requestNumber };
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

