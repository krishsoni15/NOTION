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

    // Gather request numbers for efficient notes counting
    const requestNumbers = [...new Set(requests.map((r) => r.requestNumber))];
    const notesCounts = new Map<string, number>();

    await Promise.all(
      requestNumbers.map(async (num) => {
        const notes = await ctx.db
          .query("request_notes")
          .withIndex("by_request_number", (q) => q.eq("requestNumber", num))
          .collect();
        notesCounts.set(num, notes.length);
      })
    );

    // Fetch related data (site, creator, approver)
    const requestsWithDetails = await Promise.all(
      requests.map(async (request) => {
        const site = await ctx.db.get(request.siteId);
        const creator = await ctx.db.get(request.createdBy);
        const approver = request.approvedBy
          ? await ctx.db.get(request.approvedBy)
          : null;

        // Fetch vendor information from cost comparison
        let selectedVendorId: Id<"vendors"> | null = null;
        let vendorQuotes: Array<{ vendorId: Id<"vendors">, unitPrice: number, amount?: number, unit?: string }> = [];
        const costComparison = await ctx.db
          .query("costComparisons")
          .withIndex("by_request_id", (q) => q.eq("requestId", request._id))
          .unique();

        if (costComparison) {
          // If approved, use selected vendor
          if (costComparison.status === "cc_approved" && costComparison.selectedVendorId) {
            selectedVendorId = costComparison.selectedVendorId;
          }
          // If draft or pending, show first vendor from quotes
          else if (costComparison.vendorQuotes && costComparison.vendorQuotes.length > 0) {
            selectedVendorId = costComparison.vendorQuotes[0].vendorId;
            vendorQuotes = costComparison.vendorQuotes;
          }
        }

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
              role: creator.role,
            }
            : null,
          approver: approver
            ? {
              _id: approver._id,
              fullName: approver.fullName,
            }
            : null,
          selectedVendorId,
          vendorQuotes,
          notesCount: notesCounts.get(request.requestNumber) || 0,
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
    // Gather request numbers for efficient notes counting
    const requestNumbers = [...new Set(requests.map((r) => r.requestNumber))];
    const notesCounts = new Map<string, number>();

    await Promise.all(
      requestNumbers.map(async (num) => {
        const notes = await ctx.db
          .query("request_notes")
          .withIndex("by_request_number", (q) => q.eq("requestNumber", num))
          .collect();
        notesCounts.set(num, notes.length);
      })
    );

    const requestsWithDetails = await Promise.all(
      requests.map(async (request) => {
        const site = await ctx.db.get(request.siteId);
        const creator = await ctx.db.get(request.createdBy);
        const approver = request.approvedBy
          ? await ctx.db.get(request.approvedBy)
          : null;

        // Fetch vendor information from cost comparison
        let selectedVendorId: Id<"vendors"> | null = null;
        let vendorQuotes: Array<{ vendorId: Id<"vendors">, unitPrice: number, amount?: number, unit?: string }> = [];
        const costComparison = await ctx.db
          .query("costComparisons")
          .withIndex("by_request_id", (q) => q.eq("requestId", request._id))
          .unique();

        if (costComparison) {
          // If approved, use selected vendor
          if (costComparison.status === "cc_approved" && costComparison.selectedVendorId) {
            selectedVendorId = costComparison.selectedVendorId;
          }
          // If draft or pending, show first vendor from quotes
          else if (costComparison.vendorQuotes && costComparison.vendorQuotes.length > 0) {
            selectedVendorId = costComparison.vendorQuotes[0].vendorId;
            vendorQuotes = costComparison.vendorQuotes;
          }
        }

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
              role: creator.role,
            }
            : null,
          approver: approver
            ? {
              _id: approver._id,
              fullName: approver.fullName,
            }
            : null,
          selectedVendorId,
          vendorQuotes,
          notesCount: notesCounts.get(request.requestNumber) || 0,
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
        v.literal("draft"),
        v.literal("pending"),
        v.literal("rejected"),
        v.literal("recheck"),
        v.literal("ready_for_cc"),
        v.literal("cc_pending"),
        v.literal("cc_approved"),
        v.literal("cc_rejected"),
        v.literal("ready_for_po"),
        v.literal("pending_po"),
        v.literal("rejected_po"),
        v.literal("ready_for_delivery"),
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
      if (args.status === "draft") {
        // Special case for drafts: ONLY show drafts created by the Purchase Officer themselves
        requests = await ctx.db
          .query("requests")
          .withIndex("by_created_by", (q) => q.eq("createdBy", currentUser._id))
          .order("desc")
          .collect();
        requests = requests.filter((r) => r.status === "draft");
      } else {
        // TypeScript guard: ensure status is defined before using it
        const status = args.status;
        requests = await ctx.db
          .query("requests")
          .withIndex("by_status", (q) => q.eq("status", status))
          .order("desc")
          .collect();
      }
    } else {
      // Get all requests first
      const allRequests = await ctx.db
        .query("requests")
        .collect();

      // Identify "Active Purchase Groups":
      // A group is active if it contains at least one item in a purchase-relevant status
      const purchaseRelevantStatuses = new Set([
        "recheck",
        "ready_for_cc",
        "cc_rejected",
        "cc_pending",
        "cc_approved",
        "ready_for_po",
        "pending_po",
        "rejected_po",
        "ready_for_delivery",
        "delivery_stage",
        "delivered"
      ]);

      const activeRequestNumbers = new Set<string>();

      // First pass: Find all request numbers that have at least one purchase-relevant item
      // OR if it's a draft created by me
      for (const r of allRequests) {
        if (purchaseRelevantStatuses.has(r.status)) {
          activeRequestNumbers.add(r.requestNumber);
        } else if (r.status === "draft" && r.createdBy === currentUser._id) {
          activeRequestNumbers.add(r.requestNumber);
        }
      }

      // Second pass: Filter to include ALL items belonging to active groups
      // Exception: Do not show drafts created by others even if the group is active
      requests = allRequests.filter((r) => {
        if (!activeRequestNumbers.has(r.requestNumber)) return false;

        // Hide drafts from other users
        if (r.status === "draft" && r.createdBy !== currentUser._id) return false;

        return true;
      });
    }

    // Fetch related data
    // Gather request numbers for efficient notes counting
    const requestNumbers = [...new Set(requests.map((r) => r.requestNumber))];
    const notesCounts = new Map<string, number>();

    await Promise.all(
      requestNumbers.map(async (num) => {
        const notes = await ctx.db
          .query("request_notes")
          .withIndex("by_request_number", (q) => q.eq("requestNumber", num))
          .collect();
        notesCounts.set(num, notes.length);
      })
    );

    const requestsWithDetails = await Promise.all(
      requests.map(async (request) => {
        const site = await ctx.db.get(request.siteId);
        const creator = await ctx.db.get(request.createdBy);
        const approver = request.approvedBy
          ? await ctx.db.get(request.approvedBy)
          : null;

        // Fetch vendor information from cost comparison
        let selectedVendorId: Id<"vendors"> | null = null;
        let vendorQuotes: Array<{ vendorId: Id<"vendors">, unitPrice: number, amount?: number, unit?: string }> = [];
        const costComparison = await ctx.db
          .query("costComparisons")
          .withIndex("by_request_id", (q) => q.eq("requestId", request._id))
          .first();

        if (costComparison) {
          // If approved, use selected vendor
          if (costComparison.status === "cc_approved" && costComparison.selectedVendorId) {
            selectedVendorId = costComparison.selectedVendorId;
          }
          // If draft or pending, show first vendor from quotes
          else if (costComparison.vendorQuotes && costComparison.vendorQuotes.length > 0) {
            selectedVendorId = costComparison.vendorQuotes[0].vendorId;
            vendorQuotes = costComparison.vendorQuotes;
          }
        }

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
              role: creator.role,
            }
            : null,
          approver: approver
            ? {
              _id: approver._id,
              fullName: approver.fullName,
            }
            : null,
          selectedVendorId,
          vendorQuotes,
          isSplitApproved: costComparison?.managerNotes?.includes("Split Fulfillment Approved") || false,
          notesCount: notesCounts.get(request.requestNumber) || 0,
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

    // Gather request numbers for efficient notes counting
    const requestNumbers = [...new Set(requests.map((r) => r.requestNumber))];
    const notesCounts = new Map<string, number>();

    await Promise.all(
      requestNumbers.map(async (num) => {
        const notes = await ctx.db
          .query("request_notes")
          .withIndex("by_request_number", (q) => q.eq("requestNumber", num))
          .collect();
        notesCounts.set(num, notes.length);
      })
    );

    // Fetch related data (site, creator, approver)
    const requestsWithDetails = await Promise.all(
      requests.map(async (request) => {
        const site = await ctx.db.get(request.siteId);
        const creator = await ctx.db.get(request.createdBy);
        const approver = request.approvedBy
          ? await ctx.db.get(request.approvedBy)
          : null;

        // Fetch vendor information from cost comparison
        let selectedVendorId: Id<"vendors"> | null = null;
        let vendorQuotes: Array<{ vendorId: Id<"vendors">, unitPrice: number, amount?: number, unit?: string }> = [];
        const costComparison = await ctx.db
          .query("costComparisons")
          .withIndex("by_request_id", (q) => q.eq("requestId", request._id))
          .unique();

        if (costComparison) {
          // If approved, use selected vendor
          if (costComparison.status === "cc_approved" && costComparison.selectedVendorId) {
            selectedVendorId = costComparison.selectedVendorId;
          }
          // If draft or pending, show first vendor from quotes
          else if (costComparison.vendorQuotes && costComparison.vendorQuotes.length > 0) {
            selectedVendorId = costComparison.vendorQuotes[0].vendorId;
            vendorQuotes = costComparison.vendorQuotes;
          }
        }

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
              role: creator.role,
            }
            : null,
          approver: approver
            ? {
              _id: approver._id,
              fullName: approver.fullName,
            }
            : null,
          selectedVendorId,
          vendorQuotes,
          isSplitApproved: costComparison?.managerNotes?.includes("Split Fulfillment Approved") || false,
          notesCount: notesCounts.get(request.requestNumber) || 0,
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

        // Fetch cost comparison to check for split approval and vendor quotes
        const costComparison = await ctx.db
          .query("costComparisons")
          .withIndex("by_request_id", (q) => q.eq("requestId", request._id))
          .unique();

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
          vendorQuotes: costComparison?.vendorQuotes || [],
          selectedVendorId: costComparison?.selectedVendorId || null,
          isSplitApproved: costComparison?.managerNotes?.includes("Split Fulfillment Approved") || false,
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
    orderNote: v.optional(v.string()),
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

    // Create order note if provided
    if (args.orderNote && args.orderNote.trim().length > 0) {
      await ctx.db.insert("request_notes", {
        requestNumber,
        userId: currentUser._id,
        role: currentUser.role,
        status: "pending",
        content: args.orderNote,
        createdAt: now,
      });
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
    orderNote: v.optional(v.string()), // Added orderNote
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

    // Create order note if provided
    if (args.orderNote && args.orderNote.trim().length > 0) {
      await ctx.db.insert("request_notes", {
        requestNumber,
        userId: currentUser._id,
        role: currentUser.role,
        status: "draft",
        content: args.orderNote,
        createdAt: now,
      });
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
    status: v.union(
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("direct_po"),
      v.literal("delivery_stage"),
      v.literal("ready_for_po")
    ),
    rejectionReason: v.optional(v.string()),
    directAction: v.optional(v.union(v.literal("delivery"), v.literal("po"))),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);

    // Only managers can approve/reject, Purchase Officers can mark direct PO
    if (currentUser.role !== "manager" && !(currentUser.role === "purchase_officer" && args.status === "ready_for_po")) {
      throw new Error("Unauthorized: Only managers (or Purchase Officers for Direct PO) can update request status");
    }

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Request not found");
    }

    // Status validation
    if (currentUser.role === "manager") {
      if (request.status !== "pending") throw new Error("Request status can only be updated from pending");
    } else {
      // Purchase Officer
      const allowed = ["recheck", "ready_for_cc", "cc_pending", "cc_rejected"];
      if (!allowed.includes(request.status)) throw new Error("Purchase Officer can only update from recheck/cc stages");
    }

    const now = Date.now();

    // Determine new status based on action
    let newStatus: string = args.status;
    let directAction = args.directAction;

    if (currentUser.role === "manager") {
      if (args.status === "approved") {
        newStatus = "recheck"; // Normal approval -> Recheck
      } else if (args.status === "direct_po") {
        newStatus = "recheck"; // Goes to Purchaser (Recheck) with PO flag
        directAction = "po";
      } else if (args.status === "delivery_stage") {
        newStatus = "recheck"; // Goes to Purchaser (Recheck) with Delivery flag
        directAction = "delivery";
      } else {
        newStatus = "rejected";
      }
    } else if (args.status === "ready_for_po") {
      // Purchase Officer Direct PO
      newStatus = "ready_for_po";
      if (!directAction) directAction = "po";
    }

    // Update request
    const updates: any = {
      status: newStatus,
      updatedAt: now,
    };

    if (currentUser.role === "manager") {
      updates.approvedBy = currentUser._id;
      updates.approvedAt = now;
      updates.rejectionReason = args.status === "rejected" ? args.rejectionReason : undefined;
    }

    if (directAction) {
      updates.directAction = directAction;
    }

    await ctx.db.patch(args.requestId, updates);

    // Add rejection note to timeline
    if (args.status === "rejected" && args.rejectionReason) {
      // Check if a similar note was just added to avoid duplicates if multiple calls happen quickly
      const recentNotes = await ctx.db
        .query("request_notes")
        .withIndex("by_request_number", (q) => q.eq("requestNumber", request.requestNumber))
        .order("desc")
        .take(1);

      const content = `Rejected: ${args.rejectionReason}`;
      const isDuplicate = recentNotes.length > 0 &&
        recentNotes[0].content === content &&
        (now - recentNotes[0].createdAt) < 5000;

      if (!isDuplicate) {
        await ctx.db.insert("request_notes", {
          requestNumber: request.requestNumber,
          userId: currentUser._id,
          role: currentUser.role,
          status: "rejected",
          content: content,
          createdAt: now,
        });
      }
    }

    return { success: true };
  },
});

/**
 * Bulk update request status (approve/reject multiple items) - Manager only
 */
export const bulkUpdateRequestStatus = mutation({
  args: {
    requestIds: v.array(v.id("requests")),
    status: v.union(v.literal("approved"), v.literal("rejected"), v.literal("direct_po"), v.literal("delivery_stage")), // Added delivery_stage
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

    // Determine new status and flags
    let newStatus: "recheck" | "rejected";
    let directAction: "po" | "delivery" | undefined = undefined;

    if (args.status === "approved") {
      newStatus = "recheck";
    } else if (args.status === "direct_po") {
      newStatus = "recheck";
      directAction = "po";
    } else if (args.status === "delivery_stage") {
      newStatus = "recheck";
      directAction = "delivery";
    } else {
      newStatus = "rejected";
    }

    const updates: any = {
      status: newStatus,
      approvedBy: currentUser._id,
      approvedAt: now,
      rejectionReason:
        args.status === "rejected" ? args.rejectionReason : undefined,
      updatedAt: now,
    };

    if (directAction) {
      updates.directAction = directAction;
    }

    const processedRequestNumbers = new Set<string>();

    // Process all requests in parallel
    await Promise.all(
      args.requestIds.map(async (requestId) => {
        const request = await ctx.db.get(requestId);
        if (!request || request.status !== "pending") return; // Skip invalid or non-pending

        await ctx.db.patch(requestId, updates);
        processedRequestNumbers.add(request.requestNumber);
      })
    );

    // Add rejection notes to timeline (grouped by request number)
    if (args.status === "rejected" && args.rejectionReason) {
      for (const requestNumber of processedRequestNumbers) {
        // Check for duplicates
        const recentNotes = await ctx.db
          .query("request_notes")
          .withIndex("by_request_number", (q) => q.eq("requestNumber", requestNumber))
          .order("desc")
          .take(1);

        const content = `Rejected (Bulk): ${args.rejectionReason}`;
        const isDuplicate = recentNotes.length > 0 &&
          recentNotes[0].content === content &&
          (now - recentNotes[0].createdAt) < 5000;

        if (!isDuplicate) {
          await ctx.db.insert("request_notes", {
            requestNumber: requestNumber,
            userId: currentUser._id,
            role: currentUser.role,
            status: "rejected",
            content: content,
            createdAt: now,
          });
        }
      }
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
    orderNote: v.optional(v.string()), // Optional order-level note
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

    // Migrate existing notes from draft to new request number
    const draftNotes = await ctx.db
      .query("request_notes")
      .withIndex("by_request_number", (q) => q.eq("requestNumber", args.requestNumber))
      .collect();

    for (const note of draftNotes) {
      await ctx.db.insert("request_notes", {
        requestNumber: newRequestNumber,
        userId: note.userId,
        role: note.role,
        status: note.status,
        content: note.content,
        createdAt: note.createdAt,
      });
    }

    // Create order note if provided and not a duplicate of the latest draft note
    // Sort draft notes to find the latest one (descending by createdAt)
    const latestDraftNote = draftNotes.sort((a, b) => b.createdAt - a.createdAt)[0];
    const isDuplicate = latestDraftNote && args.orderNote && latestDraftNote.content === args.orderNote;

    if (args.orderNote && args.orderNote.trim().length > 0 && !isDuplicate) {
      await ctx.db.insert("request_notes", {
        requestNumber: newRequestNumber,
        userId: currentUser._id,
        role: currentUser.role,
        status: "pending",
        content: args.orderNote,
        createdAt: now,
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
    orderNote: v.optional(v.string()), // Added orderNote
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

    // Create order note if provided
    if (args.orderNote && args.orderNote.trim().length > 0) {
      // Check for duplicate of latest note to prevent spamming history
      const existingNotes = await ctx.db
        .query("request_notes")
        .withIndex("by_request_number", (q) => q.eq("requestNumber", args.requestNumber))
        .collect();

      const latestNote = existingNotes.sort((a, b) => b.createdAt - a.createdAt)[0];

      if (!latestNote || latestNote.content !== args.orderNote) {
        await ctx.db.insert("request_notes", {
          requestNumber: args.requestNumber,
          userId: currentUser._id,
          role: currentUser.role,
          status: "draft",
          content: args.orderNote,
          createdAt: now,
        });
      }
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
/**
 * Direct to PO (skip cost comparison) - Purchase Officer only
 * Used when item is available in inventory and direct delivery is possible
 */
export const directToPO = mutation({
  args: { requestId: v.id("requests") },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);

    // Only purchase officers can use direct to PO
    if (currentUser.role !== "purchase_officer") {
      throw new Error("Unauthorized: Only purchase officers can use direct to PO");
    }

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Request not found");
    }

    // Only allow for approved requests that are ready for CC or recheck
    if (request.status !== "approved" && request.status !== "ready_for_cc" && request.status !== "recheck") {
      throw new Error("Can only use direct to PO for approved requests ready for cost comparison or recheck");
    }

    await ctx.db.patch(args.requestId, {
      status: "ready_for_po",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Update request details (quantity, description) - Purchase Officer only
 * Used during cost comparison to adjust item details
 */
export const updateRequestDetails = mutation({
  args: {
    requestId: v.id("requests"),
    quantity: v.optional(v.number()),
    unit: v.optional(v.string()),
    description: v.optional(v.string()),
    itemName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);

    // Only purchase officers can update request details
    if (currentUser.role !== "purchase_officer") {
      throw new Error("Unauthorized: Only purchase officers can update request details");
    }

    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Request not found");
    }

    // Only allow updates for approved requests that are in cost comparison, recheck, or approved stage
    if (request.status !== "approved" && request.status !== "ready_for_cc" && request.status !== "cc_pending" && request.status !== "recheck") {
      throw new Error("Can only update details for approved requests in cost comparison process");
    }

    const updates: any = {
      updatedAt: Date.now(),
    };

    if (args.quantity !== undefined) {
      updates.quantity = args.quantity;
    }

    if (args.unit !== undefined) {
      updates.unit = args.unit;
    }

    if (args.description !== undefined) {
      updates.description = args.description;
    }

    if (args.itemName !== undefined) {
      updates.itemName = args.itemName;
    }

    await ctx.db.patch(args.requestId, updates);

    return { success: true };
  },
});

export const updatePurchaseRequestStatus = mutation({
  args: {
    requestId: v.id("requests"),
    status: v.union(
      v.literal("recheck"),
      v.literal("ready_for_cc"),
      v.literal("cc_pending"),
      v.literal("cc_approved"),
      v.literal("cc_rejected"),
      v.literal("ready_for_po"),
      v.literal("pending_po"),
      v.literal("rejected_po"),
      v.literal("ready_for_delivery"),
      v.literal("delivery_stage"),
      v.literal("delivered")
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
      recheck: ["ready_for_cc", "rejected", "ready_for_po", "ready_for_delivery", "delivery_stage"],
      ready_for_cc: ["cc_pending", "cc_rejected", "ready_for_po", "delivery_stage", "ready_for_delivery"],
      cc_pending: ["cc_approved", "cc_rejected", "ready_for_cc"],
      cc_approved: ["ready_for_po"],
      cc_rejected: ["ready_for_cc"],
      ready_for_po: ["pending_po", "delivery_stage", "ready_for_delivery"],
      pending_po: ["ready_for_delivery", "rejected_po"],
      rejected_po: ["ready_for_po"],
      ready_for_delivery: ["delivered"],
      delivery_stage: ["delivered", "ready_for_delivery"],
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


/**
 * Split request and deliver inventory portion
 * Creates a new request for the inventory portion and updates original request
 */
export const splitAndDeliverInventory = mutation({
  args: {
    requestId: v.id("requests"),
    inventoryQuantity: v.number(),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);
    if (currentUser.role !== "purchase_officer") {
      throw new Error("Unauthorized");
    }

    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Request not found");

    if (args.inventoryQuantity <= 0 || args.inventoryQuantity >= request.quantity) {
      throw new Error("Invalid split quantity");
    }

    const inventoryItem = await ctx.db
      .query("inventory")
      .filter((q) => q.eq(q.field("itemName"), request.itemName))
      .first();

    if (!inventoryItem || (inventoryItem.centralStock || 0) < args.inventoryQuantity) {
      throw new Error("Insufficient inventory");
    }

    const now = Date.now();

    // 1. Deduct inventory
    await ctx.db.patch(inventoryItem._id, {
      centralStock: (inventoryItem.centralStock || 0) - args.inventoryQuantity,
      updatedAt: now,
    });

    // 2. Create new request for delivery portion
    const deliveryRequestId = await ctx.db.insert("requests", {
      ...request,
      quantity: args.inventoryQuantity,
      status: "delivery_stage",
      directAction: "delivery",
      createdAt: now,
      updatedAt: now,
    });

    // 3. Update original request (remaining quantity)
    await ctx.db.patch(request._id, {
      quantity: request.quantity - args.inventoryQuantity,
      updatedAt: now,
    });

    return { deliveryRequestId };
  },
});
