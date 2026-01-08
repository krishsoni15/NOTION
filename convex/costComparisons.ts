/**
 * Cost Comparisons Management Functions
 * 
 * Handles CRUD operations for cost comparisons.
 * Purchase Officers create cost comparisons.
 * Managers approve/reject cost comparisons.
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
 * Get cost comparison by request ID
 */
export const getCostComparisonByRequestId = query({
  args: { requestId: v.id("requests") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q: any) => q.eq("clerkUserId", userId))
      .unique();

    if (!currentUser) return null;

    const costComparison = await ctx.db
      .query("costComparisons")
      .withIndex("by_request_id", (q) => q.eq("requestId", args.requestId))
      .first();

    if (!costComparison) return null;

    // Fetch vendor details for quotes
    const vendorQuotes = await Promise.all(
      costComparison.vendorQuotes.map(async (quote) => {
        const vendor = await ctx.db.get(quote.vendorId);
        return {
          vendorId: quote.vendorId,
          unitPrice: quote.unitPrice,
          amount: quote.amount,
          unit: quote.unit,
          discountPercent: quote.discountPercent,
          gstPercent: quote.gstPercent,
          vendor: vendor
            ? {
              _id: vendor._id,
              companyName: vendor.companyName,
              email: vendor.email,
              phone: vendor.phone,
              address: vendor.address,
            }
            : null,
        };
      })
    );

    const selectedVendor = costComparison.selectedVendorId
      ? await ctx.db.get(costComparison.selectedVendorId)
      : null;

    const approver = costComparison.approvedBy
      ? await ctx.db.get(costComparison.approvedBy)
      : null;

    return {
      ...costComparison,
      vendorQuotes,
      selectedVendor: selectedVendor
        ? {
          _id: selectedVendor._id,
          companyName: selectedVendor.companyName,
          email: selectedVendor.email,
          phone: selectedVendor.phone,
          address: selectedVendor.address,
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

/**
 * Get cost comparisons pending manager approval
 */
export const getPendingCostComparisons = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q: any) => q.eq("clerkUserId", userId))
      .unique();

    if (!currentUser) return [];

    // Only managers can view pending cost comparisons
    if (currentUser.role !== "manager") {
      return [];
    }

    const costComparisons = await ctx.db
      .query("costComparisons")
      .withIndex("by_status", (q) => q.eq("status", "cc_pending"))
      .order("desc")
      .collect();

    // Fetch request and vendor details
    const enrichedComparisons = await Promise.all(
      costComparisons.map(async (cc) => {
        const request = await ctx.db.get(cc.requestId);
        const vendorQuotes = await Promise.all(
          cc.vendorQuotes.map(async (quote) => {
            const vendor = await ctx.db.get(quote.vendorId);
            return {
              vendorId: quote.vendorId,
              unitPrice: quote.unitPrice,
              amount: quote.amount,
              unit: quote.unit,
              discountPercent: quote.discountPercent,
              gstPercent: quote.gstPercent,
              vendor: vendor
                ? {
                  _id: vendor._id,
                  companyName: vendor.companyName,
                  email: vendor.email,
                  phone: vendor.phone,
                  address: vendor.address,
                }
                : null,
            };
          })
        );

        return {
          ...cc,
          request: request
            ? {
              _id: request._id,
              requestNumber: request.requestNumber,
              itemName: request.itemName,
              quantity: request.quantity,
              unit: request.unit,
              description: request.description,
            }
            : null,
          vendorQuotes,
        };
      })
    );

    return enrichedComparisons;
  },
});

// ============================================================================
// Mutations
// ============================================================================

/**
 * Create or update cost comparison (Purchase Officer only)
 */
export const upsertCostComparison = mutation({
  args: {
    requestId: v.id("requests"),
    vendorQuotes: v.array(
      v.object({
        vendorId: v.id("vendors"),
        unitPrice: v.number(),
        amount: v.optional(v.number()),
        unit: v.optional(v.string()),
        discountPercent: v.optional(v.number()),
        gstPercent: v.optional(v.number()),
      })
    ),
    isDirectDelivery: v.boolean(),
    inventoryFulfillmentQuantity: v.optional(v.number()),
    managerNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);

    // Only purchase officers can create/update cost comparisons,
    // BUT managers can also do it for split fulfillment approval flows.
    if (currentUser.role !== "purchase_officer" && currentUser.role !== "manager") {
      throw new Error("Unauthorized: Only purchase officers or managers can create cost comparisons");
    }

    // Verify request exists and is in correct status
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new Error("Request not found");
    }

    const allowedStatuses = ["ready_for_cc", "cc_pending", "recheck", "pending"];
    if (!allowedStatuses.includes(request.status)) {
      throw new Error(`Request must be in one of the following statuses: ${allowedStatuses.join(", ")}`);
    }

    // Check if cost comparison already exists
    const existing = await ctx.db
      .query("costComparisons")
      .withIndex("by_request_id", (q) => q.eq("requestId", args.requestId))
      .first();

    const now = Date.now();

    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        vendorQuotes: args.vendorQuotes,
        isDirectDelivery: args.isDirectDelivery,
        inventoryFulfillmentQuantity: args.inventoryFulfillmentQuantity,
        managerNotes: args.managerNotes !== undefined ? args.managerNotes : existing.managerNotes,
        updatedAt: now,
      });
      return existing._id;
    } else {
      // Create new
      const costComparisonId = await ctx.db.insert("costComparisons", {
        requestId: args.requestId,
        createdBy: currentUser._id,
        vendorQuotes: args.vendorQuotes,
        status: "draft",
        isDirectDelivery: args.isDirectDelivery,
        inventoryFulfillmentQuantity: args.inventoryFulfillmentQuantity,
        managerNotes: args.managerNotes,
        createdAt: now,
        updatedAt: now,
      });
      return costComparisonId;
    }
  },
});

/**
 * Submit cost comparison for manager approval (Purchase Officer only)
 */
export const submitCostComparison = mutation({
  args: {
    requestId: v.id("requests"),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);

    // Only purchase officers can submit cost comparisons
    if (currentUser.role !== "purchase_officer") {
      throw new Error("Unauthorized: Only purchase officers can submit cost comparisons");
    }

    // Get cost comparison
    const costComparison = await ctx.db
      .query("costComparisons")
      .withIndex("by_request_id", (q) => q.eq("requestId", args.requestId))
      .first();

    if (!costComparison) {
      throw new Error("Cost comparison not found");
    }

    if (costComparison.vendorQuotes.length === 0) {
      throw new Error("Please add at least one vendor quote before submitting");
    }

    const now = Date.now();

    // Update cost comparison status
    await ctx.db.patch(costComparison._id, {
      status: "cc_pending",
      updatedAt: now,
    });

    // Update request status
    const request = await ctx.db.get(args.requestId);
    if (request) {
      await ctx.db.patch(args.requestId, {
        status: "cc_pending",
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

/**
 * Approve or reject cost comparison (Manager only)
 */
export const reviewCostComparison = mutation({
  args: {
    requestId: v.id("requests"),
    action: v.union(v.literal("approve"), v.literal("reject")),
    selectedVendorId: v.optional(v.id("vendors")), // Required if approve
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);

    // Only managers can review cost comparisons
    if (currentUser.role !== "manager") {
      throw new Error("Unauthorized: Only managers can review cost comparisons");
    }

    // Get cost comparison
    const costComparison = await ctx.db
      .query("costComparisons")
      .withIndex("by_request_id", (q) => q.eq("requestId", args.requestId))
      .first();

    if (!costComparison) {
      throw new Error("Cost comparison not found");
    }

    if (costComparison.status !== "cc_pending") {
      throw new Error("Cost comparison is not pending approval");
    }

    const now = Date.now();

    if (args.action === "approve") {
      if (!args.selectedVendorId) {
        throw new Error("Please select a vendor before approving");
      }

      // Verify vendor is in quotes
      const vendorInQuotes = costComparison.vendorQuotes.some(
        (q) => q.vendorId === args.selectedVendorId
      );
      if (!vendorInQuotes) {
        throw new Error("Selected vendor must be in the quotes list");
      }

      // Update cost comparison
      await ctx.db.patch(costComparison._id, {
        status: "cc_approved",
        selectedVendorId: args.selectedVendorId,
        approvedBy: currentUser._id,
        approvedAt: now,
        managerNotes: args.notes,
        updatedAt: now,
      });

      // Update request status
      await ctx.db.patch(args.requestId, {
        status: "ready_for_po",
        updatedAt: now,
      });

      // Add approval note to timeline if provided
      if (args.notes && args.notes.trim()) {
        const request = await ctx.db.get(args.requestId);
        if (request) {
          await ctx.db.insert("request_notes", {
            requestNumber: request.requestNumber,
            userId: currentUser._id,
            role: currentUser.role,
            status: "cc_approved",
            content: `CC Approved: ${args.notes.trim()}`,
            createdAt: now,
          });
        }
      }
    } else {
      // Reject - require notes
      if (!args.notes || !args.notes.trim()) {
        throw new Error("Rejection reason is required");
      }

      await ctx.db.patch(costComparison._id, {
        status: "cc_rejected",
        approvedBy: currentUser._id,
        rejectedAt: now,
        managerNotes: args.notes.trim(),
        updatedAt: now,
      });

      // Update request status back to ready_for_cc
      await ctx.db.patch(args.requestId, {
        status: "ready_for_cc",
        updatedAt: now,
      });

      // Add rejection note to timeline
      const request = await ctx.db.get(args.requestId);
      if (request) {
        await ctx.db.insert("request_notes", {
          requestNumber: request.requestNumber,
          userId: currentUser._id,
          role: currentUser.role,
          status: "cc_rejected",
          content: `CC Rejected: ${args.notes.trim()}`,
          createdAt: now,
        });
      }
    }

    return { success: true };
  },
});

/**
 * Resubmit rejected cost comparison (Purchase Officer only)
 */
export const resubmitCostComparison = mutation({
  args: {
    requestId: v.id("requests"),
    vendorQuotes: v.array(
      v.object({
        vendorId: v.id("vendors"),
        unitPrice: v.number(),
        amount: v.optional(v.number()),
        unit: v.optional(v.string()),
        discountPercent: v.optional(v.number()),
        gstPercent: v.optional(v.number()),
      })
    ),
    isDirectDelivery: v.boolean(),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);

    // Only purchase officers can resubmit
    if (currentUser.role !== "purchase_officer") {
      throw new Error("Unauthorized: Only purchase officers can resubmit cost comparisons");
    }

    // Get cost comparison
    const costComparison = await ctx.db
      .query("costComparisons")
      .withIndex("by_request_id", (q) => q.eq("requestId", args.requestId))
      .first();

    if (!costComparison) {
      throw new Error("Cost comparison not found");
    }

    if (costComparison.status !== "cc_rejected") {
      throw new Error("Cost comparison is not rejected");
    }

    const now = Date.now();

    // Update cost comparison
    await ctx.db.patch(costComparison._id, {
      vendorQuotes: args.vendorQuotes,
      isDirectDelivery: args.isDirectDelivery,
      status: "cc_pending",
      updatedAt: now,
    });

    // Update request status
    await ctx.db.patch(args.requestId, {
      status: "cc_pending",
      updatedAt: now,
    });

    return { success: true };
  },
});


/**
 * Approve split fulfillment plan (Manager only)
 * Sets a note in the cost comparison to indicate approval for partial inventory usage.
 */
export const approveSplitFulfillment = mutation({
  args: {
    requestId: v.id("requests"),
    inventoryQuantity: v.optional(v.number()), // Optional argument to explicitly pass the inventory quantity for immediate status calculation
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);

    // Only managers can review
    if (currentUser.role !== "manager") {
      throw new Error("Unauthorized: Only managers can approve split fulfillment");
    }

    // Get cost comparison
    const costComparison = await ctx.db
      .query("costComparisons")
      .withIndex("by_request_id", (q) => q.eq("requestId", args.requestId))
      .first();

    if (!costComparison) {
      throw new Error("Cost comparison not found");
    }

    const now = Date.now();
    const currentNotes = costComparison.managerNotes || "";
    // Append tag if not present, preserving existing notes
    const newNotes = currentNotes.includes("Split Fulfillment Approved")
      ? currentNotes
      : (currentNotes ? `${currentNotes}\n\nSplit Fulfillment Approved` : "Split Fulfillment Approved");

    // Update cost comparison with approval note
    await ctx.db.patch(costComparison._id, {
      managerNotes: newNotes,
      approvedBy: currentUser._id,
      approvedAt: now,
      updatedAt: now,
    });

    // Update request status based on fulfillment logic
    const request = await ctx.db.get(args.requestId);
    if (request) {
      // Use provided quantity or fallback to DB value
      const inventoryQty = args.inventoryQuantity !== undefined
        ? args.inventoryQuantity
        : (costComparison.inventoryFulfillmentQuantity || 0);

      // If fully fulfilled from inventory, move to delivery stage
      if (inventoryQty >= request.quantity) {
        await ctx.db.patch(args.requestId, {
          status: "delivery_stage",
          updatedAt: now,
        });
      } else {
        // If partial or no inventory (mixed fulfillment), move to Recheck
        // This is the standard "Manager Approved" state, handing it over to Purchase Officers
        await ctx.db.patch(args.requestId, {
          status: "recheck",
          updatedAt: now,
        });
      }
    }

    return { success: true };
  },
});
