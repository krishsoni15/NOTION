/**
 * Vendors Management Functions
 * 
 * Handles CRUD operations for vendors.
 * Purchase Officer can create, update, delete vendors.
 * Manager can only view vendors.
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
 * Get all active vendors
 * Accessible to: Purchase Officer, Manager
 */
export const getAllVendors = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q: any) => q.eq("clerkUserId", userId))
      .unique();

    if (!currentUser) return [];

    // Check if user has access (Purchase Officer or Manager)
    if (
      currentUser.role !== "purchase_officer" &&
      currentUser.role !== "manager"
    ) {
      return [];
    }

    const vendors = await ctx.db
      .query("vendors")
      .withIndex("by_is_active", (q) => q.eq("isActive", true))
      .order("desc")
      .collect();

    return vendors;
  },
});

/**
 * Get vendor by ID
 */
export const getVendorById = query({
  args: { vendorId: v.id("vendors") },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);

    // Check if user has access
    if (
      currentUser.role !== "purchase_officer" &&
      currentUser.role !== "manager"
    ) {
      throw new Error("Unauthorized");
    }

    const vendor = await ctx.db.get(args.vendorId);
    if (!vendor || !vendor.isActive) {
      throw new Error("Vendor not found");
    }

    return vendor;
  },
});

// ============================================================================
// Mutations
// ============================================================================

/**
 * Create a new vendor (Purchase Officer and Manager)
 */
/**
 * Create a new vendor (Purchase Officer and Manager)
 */
export const createVendor = mutation({
  args: {
    companyName: v.string(),
    contactName: v.optional(v.string()),
    email: v.string(),
    phone: v.string(),
    gstNumber: v.string(),
    address: v.string(),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);

    // Check if user is a Purchase Officer
    if (currentUser.role !== "purchase_officer") {
      throw new Error("Unauthorized: Only Purchase Officers can create vendors");
    }

    // Validate GST number format (15 characters, alphanumeric)
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!gstRegex.test(args.gstNumber)) {
      throw new Error("Invalid GST number format. Expected format: 24AAAAA0000A1Z5");
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(args.email)) {
      throw new Error("Invalid email format");
    }

    const now = Date.now();
    const vendorId = await ctx.db.insert("vendors", {
      companyName: args.companyName,
      contactName: args.contactName,
      email: args.email,
      phone: args.phone,
      gstNumber: args.gstNumber,
      address: args.address,
      isActive: true,
      createdBy: currentUser._id,
      createdAt: now,
      updatedAt: now,
    });

    return vendorId;
  },
});

/**
 * Update vendor (Purchase Officer only)
 */
export const updateVendor = mutation({
  args: {
    vendorId: v.id("vendors"),
    companyName: v.string(),
    contactName: v.optional(v.string()),
    email: v.string(),
    phone: v.string(),
    gstNumber: v.string(),
    address: v.string(),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);

    // Check if user is a Purchase Officer
    if (currentUser.role !== "purchase_officer") {
      throw new Error("Unauthorized: Only Purchase Officers can update vendors");
    }

    const vendor = await ctx.db.get(args.vendorId);
    if (!vendor || !vendor.isActive) {
      throw new Error("Vendor not found");
    }

    // Validate GST number format
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!gstRegex.test(args.gstNumber)) {
      throw new Error("Invalid GST number format. Expected format: 24AAAAA0000A1Z5");
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(args.email)) {
      throw new Error("Invalid email format");
    }

    await ctx.db.patch(args.vendorId, {
      companyName: args.companyName,
      contactName: args.contactName,
      email: args.email,
      phone: args.phone,
      gstNumber: args.gstNumber,
      address: args.address,
      updatedAt: Date.now(),
    });

    return args.vendorId;
  },
});

/**
 * Check if vendor is used in inventory
 */
export const checkVendorUsage = query({
  args: { vendorId: v.id("vendors") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { isInUse: false, usedInInventory: 0 };

    // Check if vendor is used in any inventory items
    // Support both old vendorId and new vendorIds format
    const allInventoryItems = await ctx.db
      .query("inventory")
      .withIndex("by_is_active", (q) => q.eq("isActive", true))
      .collect();

    const usedInInventory = allInventoryItems.filter((item) => {
      // Check old vendorId format
      if (item.vendorId === args.vendorId) return true;
      // Check new vendorIds format
      const vendorIds = (item as any).vendorIds || [];
      return vendorIds.includes(args.vendorId);
    }).length;

    const isInUse = usedInInventory > 0;

    return {
      isInUse,
      usedInInventory,
    };
  },
});

/**
 * Get vendor purchase statistics
 */
export const getVendorPurchaseStats = query({
  args: { vendorId: v.id("vendors") },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);

    // Check if user has access
    if (
      currentUser.role !== "purchase_officer" &&
      currentUser.role !== "manager"
    ) {
      throw new Error("Unauthorized");
    }

    // Get all purchase orders for this vendor
    const purchaseOrders = await ctx.db
      .query("purchaseOrders")
      .withIndex("by_vendor_id", (q) => q.eq("vendorId", args.vendorId))
      .collect();

    // Get inventory items associated with this vendor
    const inventoryItems = await ctx.db
      .query("inventory")
      .withIndex("by_is_active", (q) => q.eq("isActive", true))
      .collect();

    const vendorInventoryItems = inventoryItems.filter((item) => {
      const vendorIds = (item as any).vendorIds || [];
      return vendorIds.includes(args.vendorId) || item.vendorId === args.vendorId;
    });

    // Calculate statistics
    let totalItems = 0;
    let totalValue = 0;
    const totalOrders = purchaseOrders.length;

    purchaseOrders.forEach((po) => {
      totalItems += po.quantity;
      totalValue += po.totalAmount;
    });

    const activeItems = vendorInventoryItems.length;

    return {
      totalItems,
      totalValue,
      totalOrders,
      activeItems,
      inventoryItems: vendorInventoryItems,
    };
  },
});

/**
 * Delete vendor (Purchase Officer only)
 * If vendor is not used in inventory: Hard delete (permanent)
 * If vendor is used in inventory: Cannot delete (error)
 */
export const deleteVendor = mutation({
  args: { vendorId: v.id("vendors") },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);

    // Check if user is a Purchase Officer
    if (currentUser.role !== "purchase_officer") {
      throw new Error("Unauthorized: Only Purchase Officers can delete vendors");
    }

    const vendor = await ctx.db.get(args.vendorId);
    if (!vendor) {
      throw new Error("Vendor not found");
    }

    // Check if vendor is used in inventory
    const allInventoryItems = await ctx.db
      .query("inventory")
      .withIndex("by_is_active", (q) => q.eq("isActive", true))
      .collect();

    const usedInInventory = allInventoryItems.filter((item) => {
      // Check old vendorId format
      if (item.vendorId === args.vendorId) return true;
      // Check new vendorIds format
      const vendorIds = (item as any).vendorIds || [];
      return vendorIds.includes(args.vendorId);
    });

    if (usedInInventory.length > 0) {
      throw new Error(
        `Cannot delete vendor: It is used in ${usedInInventory.length} inventory item(s). Please remove the vendor from inventory items first.`
      );
    }

    // Hard delete (permanent)
    await ctx.db.delete(args.vendorId);

    return { success: true };
  },
});

