/**
 * Inventory Management Functions
 * 
 * Handles CRUD operations for inventory items.
 * Purchase Officer can create, update, delete items.
 * Manager and Site Engineer can view items.
 * Site Engineer can add images to existing items.
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "./_generated/dataModel";

// Helper function to get current user
async function getCurrentUser(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_user_id", (q: any) => q.eq("clerkUserId", identity.subject))
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
 * Get all active inventory items with vendor info
 * Accessible to: Purchase Officer, Manager, Site Engineer
 */
export const getAllInventoryItems = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q: any) => q.eq("clerkUserId", userId))
      .unique();

    if (!currentUser) return [];

    // All roles can view inventory
    const items = await ctx.db
      .query("inventory")
      .withIndex("by_is_active", (q) => q.eq("isActive", true))
      .order("desc")
      .collect();

    // Fetch vendor info for each item
    const itemsWithVendors = await Promise.all(
      items.map(async (item) => {
        const vendor = item.vendorId ? await ctx.db.get(item.vendorId) : null;
        return {
          ...item,
          vendor: vendor
            ? {
                _id: vendor._id,
                companyName: vendor.companyName,
                email: vendor.email,
              }
            : null,
        };
      })
    );

    return itemsWithVendors;
  },
});

/**
 * Get inventory item by ID
 */
export const getInventoryItemById = query({
  args: { itemId: v.id("inventory") },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);

    const item = await ctx.db.get(args.itemId);
    if (!item || !item.isActive) {
      throw new Error("Inventory item not found");
    }

    const vendor = item.vendorId ? await ctx.db.get(item.vendorId) : null;
    return {
      ...item,
      vendor: vendor
        ? {
            _id: vendor._id,
            companyName: vendor.companyName,
            email: vendor.email,
          }
        : null,
    };
  },
});

/**
 * Get inventory items by vendor
 */
export const getInventoryByVendor = query({
  args: { vendorId: v.id("vendors") },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);

    const items = await ctx.db
      .query("inventory")
      .withIndex("by_vendor_id", (q) => q.eq("vendorId", args.vendorId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return items;
  },
});

// ============================================================================
// Mutations
// ============================================================================

/**
 * Create a new inventory item (Purchase Officer only)
 */
export const createInventoryItem = mutation({
  args: {
    itemName: v.string(),
    unit: v.optional(v.string()),
    centralStock: v.optional(v.number()),
    vendorId: v.optional(v.id("vendors")),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);

    // Check if user is a Purchase Officer
    if (currentUser.role !== "purchase_officer") {
      throw new Error("Unauthorized: Only Purchase Officers can create inventory items");
    }

    // Validate vendor exists if provided
    if (args.vendorId) {
      const vendor = await ctx.db.get(args.vendorId);
      if (!vendor || !vendor.isActive) {
        throw new Error("Vendor not found");
      }
    }

    const now = Date.now();
    const itemId = await ctx.db.insert("inventory", {
      itemName: args.itemName,
      unit: args.unit || "",
      centralStock: args.centralStock || 0,
      vendorId: args.vendorId,
      images: [],
      isActive: true,
      createdBy: currentUser._id,
      createdAt: now,
      updatedAt: now,
    });

    return itemId;
  },
});

/**
 * Update inventory item (Purchase Officer only)
 */
export const updateInventoryItem = mutation({
  args: {
    itemId: v.id("inventory"),
    itemName: v.string(),
    unit: v.optional(v.string()),
    centralStock: v.optional(v.number()),
    vendorId: v.optional(v.id("vendors")),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);

    // Check if user is a Purchase Officer
    if (currentUser.role !== "purchase_officer") {
      throw new Error("Unauthorized: Only Purchase Officers can update inventory items");
    }

    const item = await ctx.db.get(args.itemId);
    if (!item || !item.isActive) {
      throw new Error("Inventory item not found");
    }

    // Validate vendor exists if provided
    if (args.vendorId) {
      const vendor = await ctx.db.get(args.vendorId);
      if (!vendor || !vendor.isActive) {
        throw new Error("Vendor not found");
      }
    }

    await ctx.db.patch(args.itemId, {
      itemName: args.itemName,
      unit: args.unit ?? item.unit ?? "",
      centralStock: args.centralStock ?? item.centralStock ?? 0,
      vendorId: args.vendorId,
      updatedAt: Date.now(),
    });

    return args.itemId;
  },
});

/**
 * Delete inventory item (Purchase Officer only)
 * Also deletes associated images from R2
 */
export const deleteInventoryItem = mutation({
  args: { itemId: v.id("inventory") },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);

    // Check if user is a Purchase Officer
    if (currentUser.role !== "purchase_officer") {
      throw new Error("Unauthorized: Only Purchase Officers can delete inventory items");
    }

    const item = await ctx.db.get(args.itemId);
    if (!item) {
      throw new Error("Inventory item not found");
    }

    // Note: Image deletion from R2 should be handled by the frontend
    // or via a separate API call before deleting the item

    // Soft delete
    await ctx.db.patch(args.itemId, {
      isActive: false,
      updatedAt: Date.now(),
    });

    return args.itemId;
  },
});

/**
 * Add image to inventory item (Site Engineer and Purchase Officer)
 */
export const addImageToInventory = mutation({
  args: {
    itemId: v.id("inventory"),
    imageUrl: v.string(),
    imageKey: v.string(),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);

    // Check if user is Site Engineer or Purchase Officer
    if (
      currentUser.role !== "site_engineer" &&
      currentUser.role !== "purchase_officer"
    ) {
      throw new Error("Unauthorized: Only Site Engineers and Purchase Officers can add images");
    }

    const item = await ctx.db.get(args.itemId);
    if (!item || !item.isActive) {
      throw new Error("Inventory item not found");
    }

    const existingImages = item.images || [];
    const newImage = {
      imageUrl: args.imageUrl,
      imageKey: args.imageKey,
      uploadedBy: currentUser._id,
      uploadedAt: Date.now(),
    };

    await ctx.db.patch(args.itemId, {
      images: [...existingImages, newImage],
      updatedAt: Date.now(),
    });

    return args.itemId;
  },
});

/**
 * Remove image from inventory item (Purchase Officer only)
 */
export const removeImageFromInventory = mutation({
  args: {
    itemId: v.id("inventory"),
    imageKey: v.string(),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);

    // Check if user is a Purchase Officer
    if (currentUser.role !== "purchase_officer") {
      throw new Error("Unauthorized: Only Purchase Officers can remove images");
    }

    const item = await ctx.db.get(args.itemId);
    if (!item || !item.isActive) {
      throw new Error("Inventory item not found");
    }

    const existingImages = item.images || [];
    const updatedImages = existingImages.filter(
      (img) => img.imageKey !== args.imageKey
    );

    await ctx.db.patch(args.itemId, {
      images: updatedImages,
      updatedAt: Date.now(),
    });

    return args.itemId;
  },
});

