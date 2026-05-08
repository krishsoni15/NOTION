import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Generate Delivery ID (DC-XXX)
const generateDeliveryId = async (ctx: any) => {
    const deliveries = await ctx.db.query("deliveries").collect();
    const nextSequence = deliveries.length + 1;
    return `DC-${nextSequence.toString().padStart(3, "0")}`;
};

export const createDelivery = mutation({
    args: {
        poId: v.optional(v.id("purchaseOrders")),
        // Request Items for this delivery (quantities/manual details)
        items: v.array(v.object({
            requestId: v.optional(v.id("requests")),
            itemName: v.optional(v.string()),
            description: v.optional(v.string()),
            quantity: v.number(), // Delivery quantity
            unit: v.optional(v.string()),
            rate: v.optional(v.number()),
        })),

        // Add status field
        status: v.optional(v.union(v.literal("pending"), v.literal("delivered"), v.literal("cancelled"))),

        // Delivery Details
        deliveryType: v.union(v.literal("private"), v.literal("public"), v.literal("vendor")),
        deliveryPerson: v.optional(v.string()),
        deliveryContact: v.optional(v.string()),
        vehicleNumber: v.optional(v.string()),
        transportName: v.optional(v.string()), // For vendor
        transportId: v.optional(v.string()), // For vendor
        vendorId: v.optional(v.id("vendors")), // Vendor for direct delivery DC

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
        directDelivery: v.optional(v.boolean()), // Added to support direct delivery
    },
    handler: async (ctx, args) => {
        const user = await ctx.auth.getUserIdentity();
        if (!user) {
            throw new ConvexError("Not authenticated");
        }

        const officer = await ctx.db
            .query("users")
            .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", user.subject))
            .first();

        if (!officer) {
            throw new ConvexError("User not found");
        }

        const { items, directDelivery, ...deliveryData } = args;
        const now = Date.now();

        // 1. Create Delivery Record
        const deliveryIdStr = await generateDeliveryId(ctx);

        const deliveryInsertData: any = {
            ...deliveryData,
            deliveryId: deliveryIdStr,
            status: args.status || "pending",
            createdBy: officer._id,
            createdAt: now,
            updatedAt: now,
        };

        if (args.directDelivery) {
            deliveryInsertData.directItems = JSON.stringify(items);
        }

        const deliveryId = await ctx.db.insert("deliveries", deliveryInsertData);

        // Log the direct action with standardized ID
        let logRequestNumber: string;
        let logContent: string;
        
        if (args.directDelivery || items.every(item => !item.requestId)) {
            // Generate standardized DC ID for logging
            const allDCs = await ctx.db.query("deliveries").collect();
            const sortedDCs = allDCs.sort((a, b) => a.createdAt - b.createdAt);
            const dcIndex = sortedDCs.findIndex(dc => dc._id === deliveryId);
            const standardizedId = `DC-${(dcIndex + 1).toString().padStart(3, '0')}`;
            
            logRequestNumber = `DIRECT-${standardizedId}`;
            logContent = `Direct Delivery Challan ${standardizedId} created - ${args.receiverName}`;
        } else {
            const firstRequestId = items.find(item => item.requestId)?.requestId;
            logRequestNumber = firstRequestId ? `REQ-${firstRequestId.slice(-6)}` : `DC-${deliveryIdStr}`;
            logContent = `Delivery Challan created: ${deliveryIdStr} for ${items.length} item(s)`;
        }
        
        await ctx.db.insert("request_notes", {
            requestNumber: logRequestNumber,
            userId: officer._id,
            role: officer.role,
            status: "pending",
            type: "log",
            content: logContent,
            createdAt: now,
        });

        // 2. Update Items (Requests) linked to this delivery
        // Only process items that have a requestId (skip direct delivery items)
        const targetStatus = args.directDelivery ? "delivered" : "out_for_delivery";

        for (const item of items) {
            // Skip items without requestId (direct delivery items)
            if (!item.requestId) continue;

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
                    status: targetStatus, // Set to processing stage
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
                    status: targetStatus, // Set to processing stage
                    updatedAt: now,
                    deliveryMarkedAt: now,
                    deliveryId: deliveryId, // Link to delivery
                });
            }
        }

        // GRN Log for each item in the delivery
        for (const item of items) {
            // Skip items without requestId (direct delivery items)
            if (!item.requestId) continue;

            const request = await ctx.db.get(item.requestId);
            if (request) {
                await ctx.db.insert("request_notes", {
                    requestNumber: request.requestNumber,
                    userId: officer._id,
                    role: officer.role,
                    status: targetStatus,
                    type: "log",
                    content: `[Item #${request.itemOrder ?? 1}] Delivery Challan created (${deliveryIdStr}). ${item.quantity} ${request.unit || 'units'} dispatched via ${args.deliveryType} transport. Vehicle: ${args.vehicleNumber || 'N/A'}.${args.directDelivery ? ' Marked as delivered directly.' : ''}`,
                    createdAt: now,
                });
            }
        }

        return deliveryId;
    },
});

export const getAllDeliveries = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db
            .query("deliveries")
            .order("desc")
            .collect();
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

        // Get the PO details if available
        let po = null;
        let vendor: any = null;

        if (delivery.poId) {
            po = await ctx.db.get(delivery.poId);
            // Get vendor details from PO
            if (po && po.vendorId) {
                vendor = await ctx.db.get(po.vendorId);
            }
        } else if ((delivery as any).vendorId) {
            // Direct DC - fetch vendor directly from stored vendorId
            try {
                vendor = await ctx.db.get((delivery as any).vendorId);
            } catch {
                // Vendor may have been deleted, ignore
            }
        }

        // Get all requests linked to this delivery
        const allRequests = await ctx.db
            .query("requests")
            .collect();

        const deliveryRequests = allRequests.filter(item => item.deliveryId === args.deliveryId);

        // Fetch PO items to get price/tax info if available
        let poItems: any[] = [];
        if (delivery.poId) {
            poItems = await ctx.db
                .query("purchaseOrders")
                .withIndex("by_po_number", (q) => q.eq("poNumber", po!.poNumber))
                .collect();
        }

        // CRITICAL: Check for direct items stored as JSON (for direct delivery edits)
        let items: any[] = [];
        
        if ((delivery as any).directItems) {
            // Parse stored direct items
            try {
                items = JSON.parse((delivery as any).directItems);
            } catch (e) {
                console.error("Failed to parse directItems:", e);
                items = [];
            }
        } else if (deliveryRequests.length > 0) {
            // Fall back to request-based items
            items = deliveryRequests.map(item => {
                // Find corresponding PO item to get financial details
                const poItem = poItems.find(p => p.requestId === item._id);

                return {
                    _id: item._id,
                    itemName: item.itemName,
                    quantity: item.quantity,
                    unit: item.unit,
                    description: item.description,
                    status: item.status,
                    deliveryPhotos: item.deliveryPhotos,
                    deliveryNotes: item.deliveryNotes,
                    hsnSacCode: poItem?.hsnSacCode || item.specsBrand, // Fallback
                    unitRate: poItem?.unitRate,
                    discountPercent: poItem?.discountPercent,
                    gstTaxRate: poItem?.gstTaxRate,
                };
            });
        }

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
                _id: vendor._id,
                companyName: vendor.companyName,
                contactName: vendor.contactName,
                phone: vendor.phone,
                address: vendor.address,
                gstNumber: vendor.gstNumber,
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
            throw new ConvexError("Request not found");
        }

        // If already delivered, just return success
        if (request.status === "delivered") {
            return { success: true };
        }

        // Allow confirming from pending_po, delivery_processing, out_for_delivery, ready_for_delivery, delivery_stage
        if (!["pending_po", "delivery_processing", "out_for_delivery", "ready_for_delivery", "delivery_stage"].includes(request.status)) {
            throw new ConvexError(`Request is not in a deliverable state: ${request.status}`);
        }

        // Update status to delivered
        await ctx.db.patch(args.requestId, {
            status: "delivered",
            deliveryPhotos: args.deliveryPhotos,
            updatedAt: Date.now(),
        });

        // GRN Log
        const user = await ctx.auth.getUserIdentity();
        if (user) {
            const dbUser = await ctx.db
                .query("users")
                .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", user.subject))
                .first();
            if (dbUser) {
                await ctx.db.insert("request_notes", {
                    requestNumber: request.requestNumber,
                    userId: dbUser._id,
                    role: dbUser.role,
                    status: "delivered",
                    type: "log",
                    content: `[Item #${request.itemOrder ?? 1}] Delivery confirmed${args.deliveryPhotos?.length ? ` with ${args.deliveryPhotos.length} photo(s)` : ''}. Item received at site.`,
                    createdAt: Date.now(),
                });
            }
        }

        return { success: true };
    },
});
/**
 * Update delivery challan (for direct delivery editing)
 * CRITICAL: This mutation stores items as a JSON array in the delivery record
 */
export const updateDelivery = mutation({
  args: {
    deliveryId: v.id("deliveries"),
    items: v.array(v.object({
      itemName: v.string(),
      description: v.optional(v.string()),
      quantity: v.number(),
      rate: v.number(),
      unit: v.string(),
    })),
    deliveryType: v.union(v.literal("private"), v.literal("public"), v.literal("vendor")),
    deliveryPerson: v.optional(v.string()),
    deliveryContact: v.string(),
    vehicleNumber: v.optional(v.string()),
    receiverName: v.string(),
    status: v.optional(v.union(v.literal("pending"), v.literal("delivered"), v.literal("cancelled"))),
    loadingPhoto: v.optional(v.object({
      imageUrl: v.string(),
      imageKey: v.string(),
    })),
    invoicePhoto: v.optional(v.object({
      imageUrl: v.string(),
      imageKey: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) {
      throw new ConvexError("Not authenticated");
    }

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", user.subject))
      .first();

    if (!currentUser) {
      throw new ConvexError("User not found");
    }

    const delivery = await ctx.db.get(args.deliveryId);
    if (!delivery) {
      throw new ConvexError("Delivery not found");
    }

    // Update delivery record with items stored as JSON
    await ctx.db.patch(args.deliveryId, {
      deliveryType: args.deliveryType,
      deliveryPerson: args.deliveryPerson || undefined,
      deliveryContact: args.deliveryContact,
      vehicleNumber: args.vehicleNumber || undefined,
      receiverName: args.receiverName,
      loadingPhoto: args.loadingPhoto || undefined,
      invoicePhoto: args.invoicePhoto || undefined,
      status: args.status || "delivered", // Default to delivered (finalized)
      // CRITICAL: Store items array as JSON to prevent data loss
      directItems: JSON.stringify(args.items),
      updatedAt: Date.now(),
    });

    // Log the update
    await ctx.db.insert("request_notes", {
      requestNumber: `DIRECT-DC-${delivery.deliveryId}`,
      userId: currentUser._id,
      role: currentUser.role,
      status: args.status || "delivered",
      type: "log",
      content: `Direct Delivery Challan updated - ${args.receiverName}. Items: ${args.items.length}. Status: ${args.status || 'delivered'}`,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Update delivery challan title
 */
export const updateDeliveryTitle = mutation({
  args: {
    deliveryId: v.id("deliveries"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) {
      throw new ConvexError("Not authenticated");
    }

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", user.subject))
      .first();

    if (!currentUser) {
      throw new ConvexError("User not found");
    }

    // Only purchase officers and managers can update titles
    if (currentUser.role !== "purchase_officer" && currentUser.role !== "manager") {
      throw new ConvexError("Unauthorized: Only purchase officers and managers can update titles");
    }

    const delivery = await ctx.db.get(args.deliveryId);
    if (!delivery) {
      throw new ConvexError("Delivery not found");
    }

    await ctx.db.patch(args.deliveryId, {
      customTitle: args.title.trim() || undefined,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});