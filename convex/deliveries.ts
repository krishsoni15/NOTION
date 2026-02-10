import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Generate Delivery ID (DC-YYYYMMDD-XXXX)
const generateDeliveryId = async (ctx: any) => {
    const date = new Date();
    const dateStr = date.toISOString().split("T")[0].replace(/-/g, ""); // YYYYMMDD

    // Find last delivery created today to increment counter
    const lastDelivery = await ctx.db
        .query("deliveries")
        .withIndex("by_created_at", (q: any) => q.gt("createdAt", new Date().setHours(0, 0, 0, 0)))
        .order("desc")
        .first();

    let nextSequence = 1;
    if (lastDelivery) {
        const parts = lastDelivery.deliveryId.split("-");
        const lastSeq = parseInt(parts[2] || "0");
        nextSequence = lastSeq + 1;
    }

    return `DC-${dateStr}-${nextSequence.toString().padStart(4, "0")}`;
};

export const createDelivery = mutation({
    args: {
        poId: v.id("purchaseOrders"),
        // Request Items for this delivery (quantities)
        items: v.array(v.object({
            requestId: v.id("requests"),
            quantity: v.number(), // Delivery quantity
        })),

        // Delivery Details
        deliveryType: v.union(v.literal("private"), v.literal("public"), v.literal("vendor")),
        deliveryPerson: v.optional(v.string()),
        deliveryContact: v.optional(v.string()),
        vehicleNumber: v.optional(v.string()),
        transportName: v.optional(v.string()), // For vendor
        transportId: v.optional(v.string()), // For vendor

        receiverName: v.string(),
        purchaserName: v.string(),

        loadingPhoto: v.optional(v.object({
            imageUrl: v.string(),
            imageKey: v.string(),
        })),
        invoicePhoto: v.optional(v.object({
            imageUrl: v.string(),
            imageKey: v.string(),
        })),
        receiptPhoto: v.optional(v.object({
            imageUrl: v.string(),
            imageKey: v.string(),
        })),

        approvedByRole: v.optional(v.union(v.literal("manager"), v.literal("pe"))),
        paymentAmount: v.optional(v.number()),
        paymentStatus: v.optional(v.union(v.literal("pending"), v.literal("paid"), v.literal("partial"))),
    },
    handler: async (ctx, args) => {
        const user = await ctx.auth.getUserIdentity();
        if (!user) {
            throw new Error("Not authenticated");
        }

        const officer = await ctx.db
            .query("users")
            .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", user.subject))
            .first();

        if (!officer) {
            throw new Error("User not found");
        }

        const { items, ...deliveryData } = args;
        const now = Date.now();

        // 1. Create Delivery Record
        const deliveryIdStr = await generateDeliveryId(ctx);

        const deliveryId = await ctx.db.insert("deliveries", {
            ...deliveryData,
            deliveryId: deliveryIdStr,
            status: "pending",
            createdBy: officer._id,
            createdAt: now,
            updatedAt: now,
        });

        // 2. Update Items (Requests) linked to this delivery
        // Logic: 
        // - Check if partial or full delivery for each item.
        // - If Item Status is 'pending_po' or 'ordered', we might need to split it if handled here.
        // - User asked to "create delivery linked to pending PO". 
        // - If the quantity matches the PO/Request quantity, we just update status to 'delivered' (or 'delivery_stage').
        // - If partial, we split the request (if not already split by `markReadyForDelivery`).
        // Assuming `markReadyForDelivery` was the PRECURSOR step (splitting items to 'ready_for_delivery'), 
        // OR this dialog handles the split itself.
        // Note: The user said "Delivery Creation from Pending PO... Support for creating multiple deliveries (partial)".
        // This implies getting items which are in 'ordered'/'pending_po' status (technically 'ordered' creates the PO).
        // Let's assume the items passed are capable of being delivered.

        // Simplest approach: Update status to 'delivered' or 'delivery_stage' and link to deliveryId? 
        // Schema for Requests doesn't have `deliveryId` link directly, but we can rely on `poId`.
        // Actually, `requests` don't have `deliveryId`.
        // Maybe we should store `items` in the `deliveries` table if we need to know WHICH items were in this DC?
        // Wait, `deliveries` table I defined doesn't have `items`. It links to `poId`.
        // But a PO can have multiple deliveries.
        // So distinct items need to be tracked.
        // I should add `items` array to `deliveries` table OR a join table.
        // Or, assume simpler flow: Updates status of Requests. If request is split, new request has `deliveryId`?
        // Current Request Schema doesn't have `deliveryId`.
        // I should add `deliveryId` to `requests` table to link specific request chunks to a DC.

        // Let's UPDATE SCHEMA first if I want to link Requests to Delivery Challans accurately.
        // Re-reading Schema: `deliveryChallans` had `requestId` (singular).
        // My new `deliveries` has `poId`.
        // If a DC covers multiple items, `poId` is good for grouping, but strictly, we want to know WHICH items.
        // Adding `deliveryId` to `requests` table is logical.

        for (const item of items) {
            const request = await ctx.db.get(item.requestId);
            if (!request) continue;

            // Handle splitting if quantity < request.quantity
            if (item.quantity < request.quantity) {
                // SPLIT logic similar to markReadyForDelivery
                // 1. Create new Request for Delivered portion
                // 2. Reduce qty of original (Pending) request

                await ctx.db.insert("requests", {
                    ...request, // Copy fields
                    quantity: item.quantity,
                    status: "out_for_delivery", // Set to processing stage
                    deliveryMarkedAt: now,
                    deliveryId: deliveryId, // Link to delivery
                    createdAt: now,
                    updatedAt: now,
                    requestNumber: request.requestNumber // Keep same group
                });

                // Update original
                await ctx.db.patch(request._id, {
                    quantity: request.quantity - item.quantity,
                    updatedAt: now,
                });

            } else {
                // Full delivery of this request item
                await ctx.db.patch(request._id, {
                    status: "out_for_delivery", // Set to processing stage
                    updatedAt: now,
                    deliveryMarkedAt: now,
                    deliveryId: deliveryId, // Link to delivery
                });
            }
        }

        return deliveryId;
    },
});

export const getDeliveriesByPO = query({
    args: { poId: v.id("purchaseOrders") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("deliveries")
            .withIndex("by_po_id", (q) => q.eq("poId", args.poId))
            .order("desc")
            .collect();
    },
});

export const getDeliveryById = query({
    args: { deliveryId: v.id("deliveries") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.deliveryId);
    },
});

// Get all items (requests) linked to a specific delivery
export const getDeliveryItems = query({
    args: { deliveryId: v.id("deliveries") },
    handler: async (ctx, args) => {
        // Query all requests that have this deliveryId
        const items = await ctx.db
            .query("requests")
            .collect();

        // Filter by deliveryId (since there's no index for it)
        return items.filter(item => item.deliveryId === args.deliveryId);
    },
});

// Get full delivery details with items
export const getDeliveryWithItems = query({
    args: { deliveryId: v.id("deliveries") },
    handler: async (ctx, args) => {
        const delivery = await ctx.db.get(args.deliveryId);
        if (!delivery) return null;

        // Get the PO details
        const po = await ctx.db.get(delivery.poId);

        // Get vendor details from PO
        const vendor = po ? await ctx.db.get(po.vendorId) : null;

        // Get all requests linked to this delivery
        const allRequests = await ctx.db
            .query("requests")
            .collect();

        const items = allRequests
            .filter(item => item.deliveryId === args.deliveryId)
            .map(item => ({
                _id: item._id,
                itemName: item.itemName,
                quantity: item.quantity,
                unit: item.unit,
                description: item.description,
                status: item.status,
                deliveryPhotos: item.deliveryPhotos,
                deliveryNotes: item.deliveryNotes,
            }));

        // Get creator details
        const creator = await ctx.db.get(delivery.createdBy);

        return {
            ...delivery,
            items,
            po: po ? {
                poNumber: po.poNumber,
                vendorId: po.vendorId,
            } : null,
            vendor: vendor ? {
                companyName: vendor.companyName,
                contactName: vendor.contactName,
                phone: vendor.phone,
            } : null,
            creator: creator ? {
                fullName: creator.fullName,
            } : null,
        };
    },
});

export const confirmDelivery = mutation({
    args: {
        requestId: v.id("requests"),
        deliveryPhotos: v.optional(v.array(v.object({
            imageUrl: v.string(),
            imageKey: v.string(),
        }))),
    },
    handler: async (ctx, args) => {
        const request = await ctx.db.get(args.requestId);
        if (!request) {
            throw new Error("Request not found");
        }

        // If already delivered, just return success
        if (request.status === "delivered") {
            return { success: true };
        }

        // Allow confirming from pending_po, delivery_processing, out_for_delivery, ready_for_delivery, delivery_stage
        if (!["pending_po", "delivery_processing", "out_for_delivery", "ready_for_delivery", "delivery_stage"].includes(request.status)) {
            throw new Error(`Request is not in a deliverable state: ${request.status}`);
        }

        // Update status to delivered
        await ctx.db.patch(args.requestId, {
            status: "delivered",
            deliveryPhotos: args.deliveryPhotos,
            updatedAt: Date.now(),
        });

        return { success: true };
    },
});
