/**
 * Purchase Orders Management Functions
 * 
 * Handles CRUD operations for purchase orders including Direct PO creation.
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

// Helper function to generate PO number
async function generatePONumber(ctx: any): Promise<string> {
    const allPOs = await ctx.db.query("purchaseOrders").collect();
    const poCount = allPOs.length + 1;
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, "0");
    return `PO-${year}${month}-${String(poCount).padStart(4, "0")}`;
}

// ============================================================================
// Queries
// ============================================================================

/**
 * Get all purchase orders
 */
export const getAllPurchaseOrders = query({
    args: {},
    handler: async (ctx) => {
        const currentUser = await getCurrentUser(ctx);

        // Only Purchase Officers and Managers can view POs
        if (
            currentUser.role !== "purchase_officer" &&
            currentUser.role !== "manager"
        ) {
            throw new Error("Unauthorized");
        }

        const pos = await ctx.db
            .query("purchaseOrders")
            .withIndex("by_created_at")
            .order("desc")
            .collect();

        // Enrich with vendor, site, and request data
        const enrichedPOs = await Promise.all(
            pos.map(async (po) => {
                const vendor = await ctx.db.get(po.vendorId);
                const site = po.deliverySiteId ? await ctx.db.get(po.deliverySiteId) : null;
                const request = po.requestId ? await ctx.db.get(po.requestId) : null;
                const creator = await ctx.db.get(po.createdBy);

                return {
                    ...po,
                    vendor,
                    site,
                    request,
                    creator,
                };
            })
        );

        return enrichedPOs;
    },
});

/**
 * Get Direct POs only
 */
export const getDirectPurchaseOrders = query({
    args: {},
    handler: async (ctx) => {
        const currentUser = await getCurrentUser(ctx);

        // Only Purchase Officers and Managers can view POs
        if (
            currentUser.role !== "purchase_officer" &&
            currentUser.role !== "manager"
        ) {
            throw new Error("Unauthorized");
        }

        const pos = await ctx.db
            .query("purchaseOrders")
            .withIndex("by_is_direct", (q) => q.eq("isDirect", true))
            .order("desc")
            .collect();

        // Enrich with vendor, site data
        const enrichedPOs = await Promise.all(
            pos.map(async (po) => {
                const vendor = await ctx.db.get(po.vendorId);
                const site = po.deliverySiteId ? await ctx.db.get(po.deliverySiteId) : null;
                const creator = await ctx.db.get(po.createdBy);

                return {
                    ...po,
                    vendor,
                    site,
                    creator,
                };
            })
        );

        return enrichedPOs;
    },
});

/**
 * Get PO by ID
 */
export const getPurchaseOrderById = query({
    args: { poId: v.id("purchaseOrders") },
    handler: async (ctx, args) => {
        const currentUser = await getCurrentUser(ctx);

        // Only Purchase Officers and Managers can view POs
        if (
            currentUser.role !== "purchase_officer" &&
            currentUser.role !== "manager"
        ) {
            throw new Error("Unauthorized");
        }

        const po = await ctx.db.get(args.poId);
        if (!po) {
            throw new Error("Purchase Order not found");
        }

        const vendor = await ctx.db.get(po.vendorId);
        const site = po.deliverySiteId ? await ctx.db.get(po.deliverySiteId) : null;
        const request = po.requestId ? await ctx.db.get(po.requestId) : null;
        const creator = await ctx.db.get(po.createdBy);

        return {
            ...po,
            vendor,
            site,
            request,
            creator,
        };
    },
});

// ============================================================================
// Mutations
// ============================================================================

/**
 * Create a Direct PO (bypasses approval workflow)
 * For emergency procurements
 */
export const createDirectPO = mutation({
    args: {
        itemDescription: v.string(),
        hsnSacCode: v.optional(v.string()),
        quantity: v.number(),
        unit: v.string(),
        deliverySiteId: v.id("sites"),
        vendorId: v.id("vendors"),
        unitRate: v.number(),
        gstTaxRate: v.number(),
        validTill: v.number(),
        notes: v.optional(v.string()),
        discountPercent: v.optional(v.number()),
        perUnitBasis: v.optional(v.number()),
        perUnitBasisUnit: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const currentUser = await getCurrentUser(ctx);

        // Only Purchase Officers can create Direct POs
        if (currentUser.role !== "purchase_officer") {
            throw new Error("Unauthorized: Only Purchase Officers can create Direct POs");
        }

        // Validate vendor exists
        const vendor = await ctx.db.get(args.vendorId);
        if (!vendor || !vendor.isActive) {
            throw new Error("Vendor not found or inactive");
        }

        // Validate site exists
        const site = await ctx.db.get(args.deliverySiteId);
        if (!site || !site.isActive) {
            throw new Error("Site not found or inactive");
        }

        // Validate inputs
        if (args.quantity <= 0) {
            throw new Error("Quantity must be greater than 0");
        }
        if (args.unitRate <= 0) {
            throw new Error("Unit rate must be greater than 0");
        }
        if (args.gstTaxRate < 0 || args.gstTaxRate > 100) {
            throw new Error("GST tax rate must be between 0 and 100");
        }

        // Calculate total amount
        const basis = args.perUnitBasis || 1;
        const discount = args.discountPercent || 0;

        // Calculate amount based on basis
        const baseAmount = (args.quantity / basis) * args.unitRate;

        // Apply discount
        const discountAmount = (baseAmount * discount) / 100;
        const taxableAmount = baseAmount - discountAmount;

        // Calculate tax
        const taxAmount = (taxableAmount * args.gstTaxRate) / 100;
        const totalAmount = taxableAmount + taxAmount;

        // Generate PO number
        const poNumber = await generatePONumber(ctx);

        const now = Date.now();
        const poId = await ctx.db.insert("purchaseOrders", {
            poNumber,
            requestId: undefined, // No linked request for Direct PO
            deliverySiteId: args.deliverySiteId,
            vendorId: args.vendorId,
            createdBy: currentUser._id,
            itemDescription: args.itemDescription,
            quantity: args.quantity,
            unit: args.unit,
            hsnSacCode: args.hsnSacCode,
            unitRate: args.unitRate,
            discountPercent: args.discountPercent,
            gstTaxRate: args.gstTaxRate,
            totalAmount,
            notes: args.notes,
            status: "pending_approval", // Direct POs now go for approval
            isDirect: true,
            validTill: args.validTill,
            perUnitBasis: args.perUnitBasis,
            perUnitBasisUnit: args.perUnitBasisUnit,
            createdAt: now,
            updatedAt: now,
        });

        return poId;
    },
});

/**
 * Update PO status
 */
export const updatePOStatus = mutation({
    args: {
        poId: v.id("purchaseOrders"),
        status: v.union(
            v.literal("ordered"),
            v.literal("delivered"),
            v.literal("cancelled")
        ),
        actualDeliveryDate: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const currentUser = await getCurrentUser(ctx);

        // Only Purchase Officers can update PO status
        if (currentUser.role !== "purchase_officer") {
            throw new Error("Unauthorized: Only Purchase Officers can update PO status");
        }

        const po = await ctx.db.get(args.poId);
        if (!po) {
            throw new Error("Purchase Order not found");
        }

        await ctx.db.patch(args.poId, {
            status: args.status,
            actualDeliveryDate: args.actualDeliveryDate,
            updatedAt: Date.now(),
        });

        return args.poId;
    },
});

/**
 * Cancel PO
 */
export const cancelPO = mutation({
    args: {
        poId: v.id("purchaseOrders"),
    },
    handler: async (ctx, args) => {
        const currentUser = await getCurrentUser(ctx);

        // Only Purchase Officers can cancel POs
        if (currentUser.role !== "purchase_officer") {
            throw new Error("Unauthorized: Only Purchase Officers can cancel POs");
        }

        const po = await ctx.db.get(args.poId);
        if (!po) {
            throw new Error("Purchase Order not found");
        }

        if (po.status === "delivered") {
            throw new Error("Cannot cancel a delivered PO");
        }

        await ctx.db.patch(args.poId, {
            status: "cancelled",
            updatedAt: Date.now(),
        });

        return args.poId;
    },
});

/**
 * Approve Direct PO
 */
export const approveDirectPO = mutation({
    args: { poId: v.id("purchaseOrders") },
    handler: async (ctx, args) => {
        const currentUser = await getCurrentUser(ctx);
        if (currentUser.role !== "manager") {
            throw new Error("Unauthorized: Only Managers can approve POs");
        }

        const po = await ctx.db.get(args.poId);
        if (!po) throw new Error("PO not found");
        if (po.status !== "pending_approval") throw new Error("PO is not pending approval");

        await ctx.db.patch(args.poId, {
            status: "ordered",
            approvedBy: currentUser._id,
            approvedAt: Date.now(),
            updatedAt: Date.now(),
        });
    },
});

/**
 * Reject Direct PO
 */
export const rejectDirectPO = mutation({
    args: { poId: v.id("purchaseOrders"), reason: v.string() },
    handler: async (ctx, args) => {
        const currentUser = await getCurrentUser(ctx);
        if (currentUser.role !== "manager") {
            throw new Error("Unauthorized: Only Managers can reject POs");
        }

        const po = await ctx.db.get(args.poId);
        if (!po) throw new Error("PO not found");
        if (po.status !== "pending_approval") throw new Error("PO is not pending approval");

        await ctx.db.patch(args.poId, {
            status: "rejected",
            rejectionReason: args.reason,
            approvedBy: currentUser._id,
            approvedAt: Date.now(),
            updatedAt: Date.now(),
        });
    },
});
