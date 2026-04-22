/**
 * Cost Comparisons Management Functions
 * 
 * Handles CRUD operations for cost comparisons.
 * Purchase Officers create cost comparisons.
 * Managers approve/reject cost comparisons.
 */

import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "./_generated/dataModel";

// Helper function to get current user
async function getCurrentUser(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    throw new ConvexError("Not authenticated");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_user_id", (q: any) => q.eq("clerkUserId", userId))
    .first();

  if (!user) {
    throw new ConvexError("User not found");
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
  args: { requestId: v.optional(v.id("requests")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId || !args.requestId) return null;

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q: any) => q.eq("clerkUserId", userId))
      .first();

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
          perUnitBasis: quote.perUnitBasis,
          contact: quote.contact,
          reference: quote.reference,
          date: quote.date,
          deliveryPeriod: quote.deliveryPeriod,
          paymentTerms: quote.paymentTerms,
          pastPerformance: quote.pastPerformance,
          freight: quote.freight,
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
      .first();

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
        const request = cc.requestId ? await ctx.db.get(cc.requestId) : null;
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
              perUnitBasis: quote.perUnitBasis,
              contact: quote.contact,
              reference: quote.reference,
              date: quote.date,
              deliveryPeriod: quote.deliveryPeriod,
              paymentTerms: quote.paymentTerms,
              pastPerformance: quote.pastPerformance,
              freight: quote.freight,
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
          request: request && "requestNumber" in request
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
        perUnitBasis: v.optional(v.number()),
        contact: v.optional(v.string()),
        reference: v.optional(v.string()),
        date: v.optional(v.string()),
        deliveryPeriod: v.optional(v.string()),
        paymentTerms: v.optional(v.string()),
        pastPerformance: v.optional(v.string()),
        freight: v.optional(v.string()),
      })
    ),
    isDirectDelivery: v.boolean(),
    inventoryFulfillmentQuantity: v.optional(v.number()),
    purchaseQuantity: v.optional(v.number()), // Quantity to buy (may be > required for extra inventory)
    managerNotes: v.optional(v.string()),
    counterOfferPercent: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);

    // Only purchase officers can create/update cost comparisons,
    // BUT managers can also do it for split fulfillment approval flows.
    if (currentUser.role !== "purchase_officer" && currentUser.role !== "manager") {
      throw new ConvexError("Unauthorized: Only purchase officers or managers can create cost comparisons");
    }

    // Verify request exists and is in correct status
    const request = await ctx.db.get(args.requestId);
    if (!request) {
      throw new ConvexError("Request not found");
    }

    const allowedStatuses = ["approved", "ready_for_cc", "cc_pending", "cc_rejected", "recheck", "pending"];
    if (!allowedStatuses.includes(request.status)) {
      throw new ConvexError(`Request must be in one of the following statuses: ${allowedStatuses.join(", ")}`);
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
        purchaseQuantity: args.purchaseQuantity,
        managerNotes: args.managerNotes !== undefined ? args.managerNotes : existing.managerNotes,
        counterOfferPercent: args.counterOfferPercent,
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
        purchaseQuantity: args.purchaseQuantity,
        managerNotes: args.managerNotes,
        counterOfferPercent: args.counterOfferPercent,
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
      throw new ConvexError("Unauthorized: Only purchase officers can submit cost comparisons");
    }

    // Get cost comparison
    const costComparison = await ctx.db
      .query("costComparisons")
      .withIndex("by_request_id", (q) => q.eq("requestId", args.requestId))
      .first();

    if (!costComparison) {
      throw new ConvexError("Cost comparison not found");
    }

    if (costComparison.vendorQuotes.length === 0) {
      throw new ConvexError("Please add at least one vendor quote before submitting");
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

      // GRN Log
      await ctx.db.insert("request_notes", {
        requestNumber: request.requestNumber,
        userId: currentUser._id,
        role: currentUser.role,
        status: "cc_pending",
        type: "log",
        content: `[Item #${request.itemOrder ?? 1}] Cost Comparison submitted for Manager review (${costComparison.vendorQuotes.length} vendor quote(s)).`,
        createdAt: now,
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
      throw new ConvexError("Unauthorized: Only managers can review cost comparisons");
    }

    // Get cost comparison
    const costComparison = await ctx.db
      .query("costComparisons")
      .withIndex("by_request_id", (q) => q.eq("requestId", args.requestId))
      .first();

    if (!costComparison) {
      throw new ConvexError("Cost comparison not found");
    }

    if (costComparison.status !== "cc_pending") {
      throw new ConvexError("Cost comparison is not pending approval");
    }

    const now = Date.now();

    if (args.action === "approve") {
      if (!args.selectedVendorId) {
        throw new ConvexError("Please select a vendor before approving");
      }

      // Verify vendor is in quotes
      const vendorInQuotes = costComparison.vendorQuotes.some(
        (q) => q.vendorId === args.selectedVendorId
      );
      if (!vendorInQuotes) {
        throw new ConvexError("Selected vendor must be in the quotes list");
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

      // Add approval note to timeline
      const request = await ctx.db.get(args.requestId);
      if (request) {
        await ctx.db.insert("request_notes", {
          requestNumber: request.requestNumber,
          userId: currentUser._id,
          role: currentUser.role,
          status: "cc_approved",
          type: "log",
          content: `[Item #${request.itemOrder ?? 1}] CC Approved. Vendor selected. Status → Ready for PO.${args.notes ? ` Notes: ${args.notes.trim()}` : ''}`,
          createdAt: now,
        });
      }
    } else {
      // Reject - require notes
      if (!args.notes || !args.notes.trim()) {
        throw new ConvexError("Rejection reason is required");
      }

      await ctx.db.patch(costComparison._id, {
        status: "cc_rejected",
        approvedBy: currentUser._id,
        rejectedAt: now,
        managerNotes: args.notes.trim(),
        updatedAt: now,
      });

      // Update request status to cc_rejected so it appears in the rejected section
      await ctx.db.patch(args.requestId, {
        status: "cc_rejected",
        rejectionReason: args.notes.trim(),
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
          type: "log",
          content: `[Item #${request.itemOrder ?? 1}] CC Rejected: ${args.notes.trim()}`,
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
        perUnitBasis: v.optional(v.float64()),
        contact: v.optional(v.string()),
        reference: v.optional(v.string()),
        date: v.optional(v.string()),
        deliveryPeriod: v.optional(v.string()),
        paymentTerms: v.optional(v.string()),
        pastPerformance: v.optional(v.string()),
        freight: v.optional(v.string()),
      })
    ),
    isDirectDelivery: v.boolean(),
    counterOfferPercent: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);

    // Only purchase officers can resubmit
    if (currentUser.role !== "purchase_officer") {
      throw new ConvexError("Unauthorized: Only purchase officers can resubmit cost comparisons");
    }

    // Get cost comparison
    const costComparison = await ctx.db
      .query("costComparisons")
      .withIndex("by_request_id", (q) => q.eq("requestId", args.requestId))
      .first();

    if (!costComparison) {
      throw new ConvexError("Cost comparison not found");
    }

    if (costComparison.status !== "cc_rejected") {
      throw new ConvexError("Cost comparison is not rejected");
    }

    const now = Date.now();

    // Update cost comparison
    await ctx.db.patch(costComparison._id, {
      vendorQuotes: args.vendorQuotes,
      isDirectDelivery: args.isDirectDelivery,
      status: "cc_pending",
      counterOfferPercent: args.counterOfferPercent,
      updatedAt: now,
    });

    // Update request status
    await ctx.db.patch(args.requestId, {
      status: "cc_pending",
      updatedAt: now,
    });

    // GRN Log
    const request = await ctx.db.get(args.requestId);
    if (request) {
      await ctx.db.insert("request_notes", {
        requestNumber: request.requestNumber,
        userId: currentUser._id,
        role: currentUser.role,
        status: "cc_pending",
        type: "log",
        content: `[Item #${request.itemOrder ?? 1}] Cost Comparison resubmitted after rejection (${args.vendorQuotes.length} vendor quote(s)). Awaiting Manager review.`,
        createdAt: now,
      });
    }

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
    inventoryQuantity: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);

    // Only managers can review
    if (currentUser.role !== "manager") {
      throw new ConvexError("Unauthorized: Only managers can approve split fulfillment");
    }

    // Get cost comparison
    const costComparison = await ctx.db
      .query("costComparisons")
      .withIndex("by_request_id", (q) => q.eq("requestId", args.requestId))
      .first();

    if (!costComparison) {
      throw new ConvexError("Cost comparison not found");
    }

    const now = Date.now();
    const currentNotes = costComparison.managerNotes || "";
    // Append tag if not present, preserving existing notes
    const noteContent = args.notes || currentNotes;
    const finalNotes = noteContent.includes("Split Fulfillment Approved")
      ? noteContent
      : (noteContent ? `${noteContent}\n\nSplit Fulfillment Approved` : "Split Fulfillment Approved");

    // Update cost comparison with approval note
    await ctx.db.patch(costComparison._id, {
      managerNotes: finalNotes,
      approvedBy: currentUser._id,
      approvedAt: now,
      updatedAt: now,
    });

    // Add approval note to timeline
    const request = await ctx.db.get(args.requestId);
    if (request) {
      await ctx.db.insert("request_notes", {
        requestNumber: request.requestNumber,
        userId: currentUser._id,
        role: currentUser.role,
        status: "split_approved",
        type: "log",
        content: `[Item #${request.itemOrder ?? 1}] Split Fulfillment Approved: ${args.notes || "Partial inventory approved"}`,
        createdAt: now,
      });

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


/**
 * Create direct cost comparison without request context
 * Allows purchase officers to create standalone CC records
 */
export const createDirectCostComparison = mutation({
  args: {
    itemName: v.string(),
    quantity: v.number(),
    unit: v.string(),
    vendorId: v.id("vendors"),
    unitPrice: v.number(),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);

    // Only purchase officers can create direct CC
    if (currentUser.role !== "purchase_officer") {
      throw new ConvexError("Unauthorized: Only purchase officers can create cost comparisons");
    }

    const now = Date.now();

    // Create direct cost comparison without request linkage
    const costComparisonId = await ctx.db.insert("costComparisons", {
      requestId: undefined, // No request for direct CC
      createdBy: currentUser._id,
      itemName: args.itemName,
      quantity: args.quantity,
      unit: args.unit,
      vendorQuotes: [
        {
          vendorId: args.vendorId,
          unitPrice: args.unitPrice,
          amount: args.quantity,
          unit: args.unit,
        },
      ],
      status: "draft",
      isDirectDelivery: false,
      createdAt: now,
      updatedAt: now,
    });

    // Log the direct action with standardized ID
    const allCCs = await ctx.db.query("costComparisons").collect();
    const sortedCCs = allCCs.sort((a, b) => a.createdAt - b.createdAt);
    const ccIndex = sortedCCs.findIndex(cc => cc._id === costComparisonId);
    const standardizedId = `CC-${(ccIndex + 1).toString().padStart(3, '0')}`;
    
    await ctx.db.insert("request_notes", {
      requestNumber: `DIRECT-${standardizedId}`,
      userId: currentUser._id,
      role: currentUser.role,
      status: "draft",
      type: "log",
      content: `Direct Cost Comparison ${standardizedId} created: ${args.itemName} (${args.quantity} ${args.unit}) - Initial quote from vendor`,
      createdAt: now,
    });

    return costComparisonId;
  },
});

/**
 * Get all cost comparisons for Direct Actions view
 */
export const getAllCostComparisons = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q: any) => q.eq("clerkUserId", userId))
      .first();

    if (!currentUser) return [];

    // Only purchase officers and managers can view cost comparisons
    if (currentUser.role !== "purchase_officer" && currentUser.role !== "manager") {
      return [];
    }

    const costComparisons = await ctx.db
      .query("costComparisons")
      .withIndex("by_created_at")
      .order("desc")
      .collect();

    // Fetch request and vendor details - handle old documents gracefully
    const enrichedComparisons = (await Promise.all(
      costComparisons.map(async (cc) => {
        try {
          const request = cc.requestId ? await ctx.db.get(cc.requestId) : null;
          const vendorQuotes = await Promise.all(
            (cc.vendorQuotes ?? []).map(async (quote) => {
              try {
                const vendor = await ctx.db.get(quote.vendorId);
                return {
                  vendorId: quote.vendorId,
                  unitPrice: quote.unitPrice ?? 0,
                  amount: quote.amount,
                  unit: quote.unit,
                  discountPercent: quote.discountPercent,
                  gstPercent: quote.gstPercent,
                  perUnitBasis: quote.perUnitBasis,
                  contact: quote.contact,
                  reference: quote.reference,
                  date: quote.date,
                  deliveryPeriod: quote.deliveryPeriod,
                  paymentTerms: quote.paymentTerms,
                  pastPerformance: quote.pastPerformance,
                  freight: quote.freight,
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
              } catch {
                return null;
              }
            })
          );

          return {
            ...cc,
            isDirectDelivery: cc.isDirectDelivery ?? false,
            request: request && "requestNumber" in request
              ? {
                _id: request._id,
                requestNumber: request.requestNumber,
                itemName: request.itemName,
                quantity: request.quantity,
                unit: request.unit,
                description: request.description,
              }
              : null,
            vendorQuotes: vendorQuotes.filter(Boolean),
          };
        } catch {
          return null;
        }
      })
    )).filter(Boolean);

    return enrichedComparisons;
  },
});
/**
 * Update cost comparison title
 */
export const updateCostComparisonTitle = mutation({
  args: {
    ccId: v.id("costComparisons"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);

    // Only purchase officers and managers can update titles
    if (currentUser.role !== "purchase_officer" && currentUser.role !== "manager") {
      throw new ConvexError("Unauthorized: Only purchase officers and managers can update titles");
    }

    const cc = await ctx.db.get(args.ccId);
    if (!cc) {
      throw new ConvexError("Cost comparison not found");
    }

    await ctx.db.patch(args.ccId, {
      ccTitle: args.title.trim() || undefined,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});