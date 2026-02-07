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


// Helper function to generate Request Number (shared sequence with Requests)
async function generateRequestNumber(ctx: any): Promise<string> {
    const allRequests = await ctx.db.query("requests").collect();

    // Find the highest existing request number
    let maxNumber = 0;
    for (const request of allRequests) {
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
    return nextNumber.toString().padStart(3, "0");
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
        return enrichedPOs;
    },
});

/**
 * Get PO details by PO Number (for PDF generation)
 */
export const getPurchaseOrderDetails = query({
    args: { poNumber: v.string() },
    handler: async (ctx, args) => {
        const currentUser = await getCurrentUser(ctx);

        // Allow authenticated users to view POs (might be site engineer seeing their site's PO, or manager/purchaser)
        // For now, strict to purchase_officer/manager, or maybe site engineer
        if (!currentUser) throw new Error("Unauthorized");

        const pos = await ctx.db
            .query("purchaseOrders")
            .withIndex("by_po_number", (q) => q.eq("poNumber", args.poNumber))
            .collect();

        if (pos.length === 0) {
            return null;
        }

        // Enrich with vendor and site data (using the first item as they should be same for the PO)
        const firstPO = pos[0];
        const vendor = await ctx.db.get(firstPO.vendorId);
        const site = firstPO.deliverySiteId ? await ctx.db.get(firstPO.deliverySiteId) : null;
        const creator = await ctx.db.get(firstPO.createdBy);

        // Fetch approver if approved
        const approver = firstPO.approvedBy ? await ctx.db.get(firstPO.approvedBy) : null;

        return {
            poNumber: firstPO.poNumber,
            createdAt: firstPO.createdAt,
            validTill: firstPO.validTill,
            status: firstPO.status,
            vendor,
            site,
            creator,
            approver: approver ? {
                fullName: approver.fullName,
                signatureUrl: approver.signatureUrl || undefined,
            } : null,
            items: pos.map(po => ({
                _id: po._id,
                itemDescription: po.itemDescription,
                quantity: po.quantity,
                unit: po.unit,
                hsnSacCode: po.hsnSacCode,
                unitRate: po.unitRate,
                amount: po.totalAmount, // This is total after tax in DB? `totalAmount` in schema line 110.
                // In createDirectPO: totalAmount = taxableAmount + taxAmount.
                // We also need taxable amount, gst etc for the table.
                // We can recalculate or store. createDirectPO calculates it but only stores totalAmount.
                // Wait, createDirectPO stores: unitRate, discountPercent, gstTaxRate.
                // We can reconstruct the details.
                discountPercent: po.discountPercent || 0,
                gstTaxRate: po.gstTaxRate,
                perUnitBasis: po.perUnitBasis,
                perUnitBasisUnit: po.perUnitBasisUnit
            }))
        };
    },
});

/**
 * Get PO details for public/vendor viewing (NO AUTH REQUIRED)
 * Only returns approved/ordered POs - not pending ones
 */
export const getPublicPODetails = query({
    args: { poNumber: v.string() },
    handler: async (ctx, args) => {
        const pos = await ctx.db
            .query("purchaseOrders")
            .withIndex("by_po_number", (q) => q.eq("poNumber", args.poNumber))
            .collect();

        if (pos.length === 0) {
            return null;
        }

        const firstPO = pos[0];

        // Only show ordered/delivered POs to public (not pending or cancelled)
        if (firstPO.status !== "ordered" && firstPO.status !== "delivered" && firstPO.status !== "sign_pending") {
            return null;
        }

        const vendor = await ctx.db.get(firstPO.vendorId);
        const site = firstPO.deliverySiteId ? await ctx.db.get(firstPO.deliverySiteId) : null;

        return {
            poNumber: firstPO.poNumber,
            createdAt: firstPO.createdAt,
            validTill: firstPO.validTill,
            status: firstPO.status,
            vendor: vendor ? {
                companyName: vendor.companyName,
                contactName: vendor.contactName,
                phone: vendor.phone,
                email: vendor.email,
                address: vendor.address,
                gstNumber: vendor.gstNumber,
            } : null,
            site: site ? {
                name: site.name,
                address: site.address,
            } : null,
            items: pos.map(po => ({
                _id: po._id,
                itemDescription: po.itemDescription,
                quantity: po.quantity,
                unit: po.unit,
                hsnSacCode: po.hsnSacCode,
                unitRate: po.unitRate,
                amount: po.totalAmount,
                discountPercent: po.discountPercent || 0,
                gstTaxRate: po.gstTaxRate,
                perUnitBasis: po.perUnitBasis,
                perUnitBasisUnit: po.perUnitBasisUnit
            }))
        };
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

/**
 * Get POs by Request ID
 */
export const getPOsByRequestId = query({
    args: { requestId: v.id("requests") },
    handler: async (ctx, args) => {
        const currentUser = await getCurrentUser(ctx);

        // Only Purchase Officers and Managers can view POs
        if (
            currentUser.role !== "purchase_officer" &&
            currentUser.role !== "manager" &&
            currentUser.role !== "site_engineer"
        ) {
            throw new Error("Unauthorized");
        }

        const pos = await ctx.db
            .query("purchaseOrders")
            .withIndex("by_request_id", (q) => q.eq("requestId", args.requestId))
            .collect();

        return pos;
    },
});


/**
 * Get POs by Request Number (Grouped items logic)
 */
export const getPOsForRequestNumber = query({
    args: { requestNumber: v.string() },
    handler: async (ctx, args) => {
        const currentUser = await getCurrentUser(ctx);

        // Permissions check
        if (
            currentUser.role !== "purchase_officer" &&
            currentUser.role !== "manager" &&
            currentUser.role !== "site_engineer"
        ) {
            throw new Error("Unauthorized");
        }

        // 1. Get all requests with this number
        const requests = await ctx.db
            .query("requests")
            .withIndex("by_request_number", (q) => q.eq("requestNumber", args.requestNumber))
            .collect();

        if (requests.length === 0) return [];

        // 2. Collect all POs linked to these requests
        // Note: This matches POs that have a direct linkage to the request items
        const requestIds = requests.map(r => r._id);
        const allPos = [];

        for (const reqId of requestIds) {
            const pos = await ctx.db
                .query("purchaseOrders")
                .withIndex("by_request_id", (q) => q.eq("requestId", reqId))
                .collect();
            allPos.push(...pos);
        }

        // 3. Group by PO Number
        const poMap = new Map();

        for (const po of allPos) {
            if (!poMap.has(po.poNumber)) {
                const vendor = await ctx.db.get(po.vendorId);
                const deliverySite = po.deliverySiteId ? await ctx.db.get(po.deliverySiteId) : null;

                poMap.set(po.poNumber, {
                    _id: po._id, // Use ID of first item as representative ID
                    poNumber: po.poNumber,
                    _creationTime: po._creationTime,
                    vendor,
                    deliverySite,
                    status: po.status,
                    totalAmount: 0,
                    items: []
                });
            }

            const poGroup = poMap.get(po.poNumber);
            poGroup.items.push(po);
            poGroup.totalAmount += po.totalAmount;
        }

        return Array.from(poMap.values());
    },
});

// ============================================================================
// Mutations
// ============================================================================

/**
 * Create a Direct PO (bypasses regular Request approval, but needs Manager Sign Off)
 * Creates both a Request (for ID continuity/tracking) and a Purchase Order
 */
export const createDirectPO = mutation({
    args: {
        deliverySiteId: v.id("sites"),
        vendorId: v.id("vendors"),
        validTill: v.number(),
        notes: v.optional(v.string()),
        existingRequestNumber: v.optional(v.string()), // Optional: Use existing request number
        isDirect: v.optional(v.boolean()), // Optional: Default to true
        isUrgent: v.optional(v.boolean()), // Optional: Default to true
        items: v.array(v.object({
            requestId: v.optional(v.id("requests")), // Optional: Link to existing request
            itemDescription: v.string(),
            hsnSacCode: v.optional(v.string()),
            quantity: v.number(),
            unit: v.string(),
            unitRate: v.number(),
            gstTaxRate: v.number(),
            discountPercent: v.optional(v.number()),
            perUnitBasis: v.optional(v.number()),
            perUnitBasisUnit: v.optional(v.string()),
        })),
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

        // Generate Request Number / PO Number (Shared Sequence) if not provided
        const idNumber = args.existingRequestNumber || await generateRequestNumber(ctx);
        const now = Date.now();
        const results = [];

        const isDirect = args.isDirect ?? true;
        const isUrgent = args.isUrgent ?? true;

        // Create POs and Requests for each item
        let itemOrder = 1;
        for (const item of args.items) {
            // Validate item inputs
            if (item.quantity <= 0) throw new Error("Quantity must be greater than 0");
            if (item.unitRate <= 0) throw new Error("Unit rate must be greater than 0");
            if (item.gstTaxRate < 0 || item.gstTaxRate > 100) throw new Error("GST tax rate must be between 0 and 100");

            let requestId = item.requestId;

            if (requestId) {
                // Update existing request
                const existingRequest = await ctx.db.get(requestId);
                if (!existingRequest) throw new Error(`Request ${requestId} not found`);

                // Keep the existing request ID, just update status and details if needed
                await ctx.db.patch(requestId, {
                    status: "sign_pending",
                    directAction: "po",
                    updatedAt: now,
                    // We typically don't change item description/qty of origin request here? 
                    // But Direct PO form allows editing. If edited, we should probably update the request too 
                    // to match the PO.
                    itemName: item.itemDescription.split('\n')[0],
                    description: item.itemDescription,
                    quantity: item.quantity,
                    unit: item.unit,
                });
            } else {
                // 1. Create Request Record (to maintain ID continuity and appear in Requests board)
                requestId = await ctx.db.insert("requests", {
                    requestNumber: idNumber,
                    createdBy: currentUser._id,
                    siteId: args.deliverySiteId,
                    itemName: item.itemDescription.split('\n')[0], // Use first line as title
                    description: item.itemDescription,
                    quantity: item.quantity,
                    unit: item.unit,
                    requiredBy: args.validTill, // Use ValidTill as required date
                    isUrgent: isUrgent, // Use provided isUrgent
                    status: "sign_pending", // New status: Pending Manager Signature
                    createdAt: now,
                    updatedAt: now,
                    itemOrder: itemOrder,
                    directAction: "po", // Mark as Direct PO flow
                });
            }

            // 2. Calculate Amounts
            const basis = item.perUnitBasis || 1;
            const discount = item.discountPercent || 0;
            const baseAmount = (item.quantity / basis) * item.unitRate;
            const discountAmount = (baseAmount * discount) / 100;
            const taxableAmount = baseAmount - discountAmount;
            const taxAmount = (taxableAmount * item.gstTaxRate) / 100;
            const totalAmount = taxableAmount + taxAmount;

            // 3. Create Purchase Order Record
            const poId = await ctx.db.insert("purchaseOrders", {
                poNumber: idNumber,
                requestId: requestId!, // We know we have it now
                deliverySiteId: args.deliverySiteId,
                vendorId: args.vendorId,
                createdBy: currentUser._id,
                itemDescription: item.itemDescription,
                quantity: item.quantity,
                unit: item.unit,
                hsnSacCode: item.hsnSacCode,
                unitRate: item.unitRate,
                discountPercent: item.discountPercent,
                gstTaxRate: item.gstTaxRate,
                totalAmount,
                notes: args.notes,
                status: "sign_pending", // Wait for Manager Sign Off
                isDirect: isDirect, // Use provided isDirect
                validTill: args.validTill,
                perUnitBasis: item.perUnitBasis,
                perUnitBasisUnit: item.perUnitBasisUnit,
                createdAt: now,
                updatedAt: now,
            });

            // 4. Create costComparison entry to store vendor details linked to the request?
            // This ensures "Requests Table" can show vendor info if it looks at costComparisons.
            const existingCC = await ctx.db
                .query("costComparisons")
                .withIndex("by_request_id", q => q.eq("requestId", requestId!))
                .unique();

            if (existingCC) {
                // Update existing CC if exists (e.g. came from "Ready for PO" after CC approval)
                // Actually, if it's direct PO, we might just want to upsert or ensure it reflects the PO vendor.
                await ctx.db.patch(existingCC._id, {
                    status: "cc_approved",
                    selectedVendorId: args.vendorId,
                    vendorQuotes: [{ // Overwrite/Ensure this vendor is there? Or just leave it?
                        // If we overwrite, we lose history. Let's just ensure selectedVendorId is set.
                        // But wait, if we changed price in Direct PO form, we should probably record that.
                        vendorId: args.vendorId,
                        unitPrice: item.unitRate,
                        amount: totalAmount,
                        unit: item.unit,
                        // ... preserve others? 
                        // Simplest for Direct PO flow is to just set/update the quote for this vendor.
                        // For now, let's just update status/selectedVendor.
                    }],
                    updatedAt: now,
                });
            } else {
                await ctx.db.insert("costComparisons", {
                    requestId: requestId!,
                    createdBy: currentUser._id,
                    vendorQuotes: [{
                        vendorId: args.vendorId,
                        unitPrice: item.unitRate,
                        amount: totalAmount,
                        unit: item.unit,
                        discountPercent: item.discountPercent,
                        gstPercent: item.gstTaxRate,
                        perUnitBasis: item.perUnitBasis
                    }],
                    selectedVendorId: args.vendorId,
                    status: "cc_approved", // Auto-approve CC since it's Direct
                    isDirectDelivery: false,
                    createdAt: now,
                    updatedAt: now,
                    managerNotes: "Direct PO Generated - Waiting for Sign Off"
                });
            }

            results.push(poId);
            itemOrder++;
        }

        return results[0];
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

        // Sync Request Status
        if (po.requestId) {
            let reqStatus = "pending_po";
            if (args.status === "ordered") reqStatus = "pending_po";
            if (args.status === "delivered") reqStatus = "delivered";
            if (args.status === "cancelled") reqStatus = "rejected";

            await ctx.db.patch(po.requestId, {
                status: reqStatus as any,
                updatedAt: Date.now()
            });
        }

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

        if (po.requestId) {
            await ctx.db.patch(po.requestId, {
                status: "rejected",
                updatedAt: Date.now()
            });
        }

        return args.poId;
    },
});

/**
 * Approve Direct PO (Manager Sign Off)
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

        // Status check: must be sign_pending or pending_approval
        if (po.status !== "sign_pending" && po.status !== "pending_approval") {
            throw new Error("PO is not pending approval");
        }

        const now = Date.now();

        // Update PO Status to "ordered" (Pending PO in UI)
        await ctx.db.patch(args.poId, {
            status: "ordered",
            approvedBy: currentUser._id,
            approvedAt: now,
            updatedAt: now,
        });

        // Sync Request Status to "pending_po"
        if (po.requestId) {
            await ctx.db.patch(po.requestId, {
                status: "pending_po",
                approvedBy: currentUser._id,
                approvedAt: now,
                updatedAt: now,
            });
        }
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

        // Status check: must be sign_pending or pending_approval
        if (po.status !== "sign_pending" && po.status !== "pending_approval") {
            throw new Error("PO is not pending approval");
        }

        const now = Date.now();

        // Update PO Status to "sign_rejected"
        await ctx.db.patch(args.poId, {
            status: "sign_rejected",
            rejectionReason: args.reason,
            approvedBy: currentUser._id,
            approvedAt: now,
            updatedAt: now,
        });

        // Sync Request Status
        if (po.requestId) {
            await ctx.db.patch(po.requestId, {
                status: "sign_rejected",
                rejectionReason: args.reason,
                approvedBy: currentUser._id,
                approvedAt: now,
                updatedAt: now
            });

            // Add rejection note to timeline
            const request = await ctx.db.get(po.requestId);
            if (request) {
                await ctx.db.insert("request_notes", {
                    requestNumber: request.requestNumber,
                    userId: currentUser._id,
                    role: currentUser.role,
                    status: "sign_rejected",
                    content: `Digitally Rejected: ${args.reason}`,
                    createdAt: now,
                });
            }
        }
    },
});

/**
 * Approve Direct PO via Request ID
 */
export const approveDirectPOByRequest = mutation({
    args: { requestId: v.id("requests") },
    handler: async (ctx, args) => {
        const currentUser = await getCurrentUser(ctx);
        if (currentUser.role !== "manager") {
            throw new Error("Unauthorized: Only Managers can approve POs");
        }

        const pos = await ctx.db
            .query("purchaseOrders")
            .withIndex("by_request_id", (q) => q.eq("requestId", args.requestId))
            .collect();

        // Find the latest pending PO
        const po = pos
            .sort((a, b) => b._creationTime - a._creationTime)
            .find(p => p.status === "sign_pending" || p.status === "pending_approval");

        if (!po) throw new Error("Linked pending PO not found");

        // Status check
        if (po.status !== "sign_pending" && po.status !== "pending_approval" && po.status !== "sign_rejected") {
            throw new Error("PO status is not valid for approval");
        }

        const now = Date.now();

        // Update PO Status to "ordered"
        await ctx.db.patch(po._id, {
            status: "ordered",
            approvedBy: currentUser._id,
            approvedAt: now,
            updatedAt: now,
        });

        // Update Request
        await ctx.db.patch(args.requestId, {
            status: "pending_po",
            approvedBy: currentUser._id,
            approvedAt: now,
            updatedAt: now,
        });
    },
});

/**
 * Reject Direct PO via Request ID
 */
export const rejectDirectPOByRequest = mutation({
    args: { requestId: v.id("requests"), reason: v.string() },
    handler: async (ctx, args) => {
        const currentUser = await getCurrentUser(ctx);
        if (currentUser.role !== "manager") {
            throw new Error("Unauthorized: Only Managers can reject POs");
        }

        const pos = await ctx.db
            .query("purchaseOrders")
            .withIndex("by_request_id", (q) => q.eq("requestId", args.requestId))
            .collect();

        // Find the latest pending PO
        const po = pos
            .sort((a, b) => b._creationTime - a._creationTime)
            .find(p => p.status === "sign_pending" || p.status === "pending_approval");

        if (!po) throw new Error("Linked pending PO not found");

        // Status check
        if (po.status !== "sign_pending" && po.status !== "pending_approval") {
            throw new Error("PO is not pending approval");
        }

        const now = Date.now();

        // Update PO Status
        await ctx.db.patch(po._id, {
            status: "sign_rejected",
            rejectionReason: args.reason,
            approvedBy: currentUser._id,
            approvedAt: now,
            updatedAt: now,
        });

        // Update Request
        await ctx.db.patch(args.requestId, {
            status: "sign_rejected",
            rejectionReason: args.reason,
            approvedBy: currentUser._id,
            approvedAt: now,
            updatedAt: now
        });

        const request = await ctx.db.get(args.requestId);
        if (request) {
            await ctx.db.insert("request_notes", {
                requestNumber: request.requestNumber,
                userId: currentUser._id,
                role: currentUser.role,
                status: "sign_rejected",
                content: `Digitally Rejected: ${args.reason}`,
                createdAt: now,
            });
        }
    },
});
