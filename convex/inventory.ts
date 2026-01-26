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

    // Fetch vendor info for each item (support both old vendorId and new vendorIds)
    const itemsWithVendors = await Promise.all(
      items.map(async (item) => {
        const vendorIds = (item as any).vendorIds || (item.vendorId ? [item.vendorId] : []);
        const vendors = await Promise.all(
          vendorIds.map(async (vendorId: any) => {
            const vendor = await ctx.db.get(vendorId) as any;
            if (!vendor) return null;
            return {
              _id: vendor._id,
              companyName: vendor.companyName,
              email: vendor.email,
              phone: vendor.phone,
              gstNumber: vendor.gstNumber,
              address: vendor.address,
            };
          })
        );
        // Filter out null vendors and return first vendor for backward compatibility
        const validVendors = vendors.filter((v) => v !== null);
        return {
          ...item,
          vendor: validVendors.length > 0 ? validVendors[0] : null, // First vendor for backward compatibility
          vendors: validVendors, // Array of all vendors
        };
      })
    );

    return itemsWithVendors;
  },
});

/**
 * Get inventory item by item name
 */
export const getInventoryItemByName = query({
  args: { itemName: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q: any) => q.eq("clerkUserId", userId))
      .unique();

    if (!currentUser) return null;

    // Search for inventory item by name (case-insensitive)
    const items = await ctx.db
      .query("inventory")
      .withIndex("by_is_active", (q) => q.eq("isActive", true))
      .collect();

    const item = items.find(
      (i) => i.itemName.toLowerCase() === args.itemName.toLowerCase()
    );

    if (!item) return null;

    // Fetch vendor info
    const vendorIds = (item as any).vendorIds || (item.vendorId ? [item.vendorId] : []);
    const vendors = await Promise.all(
      vendorIds.map(async (vendorId: any) => {
        const vendor = await ctx.db.get(vendorId) as any;
        if (!vendor) return null;
        return {
          _id: vendor._id,
          companyName: vendor.companyName,
          email: vendor.email,
          phone: vendor.phone,
          gstNumber: vendor.gstNumber,
          address: vendor.address,
        };
      })
    );
    const validVendors = vendors.filter((v) => v !== null);

    return {
      ...item,
      vendor: validVendors.length > 0 ? validVendors[0] : null,
      vendors: validVendors,
    };
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

    // Fetch vendor info for multiple vendors (support both old vendorId and new vendorIds)
    const vendorIds = (item as any).vendorIds || (item.vendorId ? [item.vendorId] : []);
    const vendors = await Promise.all(
      vendorIds.map(async (vendorId: any) => {
        const vendor = await ctx.db.get(vendorId) as any;
        if (!vendor) return null;
        return {
          _id: vendor._id,
          companyName: vendor.companyName,
          email: vendor.email,
          phone: vendor.phone,
          gstNumber: vendor.gstNumber,
          address: vendor.address,
        };
      })
    );
    // Filter out null vendors and return first vendor for backward compatibility
    const validVendors = vendors.filter((v) => v !== null);

    return {
      ...item,
      vendor: validVendors.length > 0 ? validVendors[0] : null, // First vendor for backward compatibility
      vendors: validVendors, // Array of all vendors
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

/**
 * Get inventory status for multiple items
 * Returns whether each item exists in inventory, its stock level, and status
 */
export const getInventoryStatusForItems = query({
  args: { itemNames: v.array(v.string()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return {};

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q: any) => q.eq("clerkUserId", userId))
      .unique();

    if (!currentUser) return {};

    // Get all active inventory items
    const allInventory = await ctx.db
      .query("inventory")
      .withIndex("by_is_active", (q) => q.eq("isActive", true))
      .collect();

    // Create a map for quick lookup (case-insensitive)
    const inventoryMap = new Map<string, {
      itemName: string;
      centralStock: number;
      unit: string;
    }>();

    allInventory.forEach((item) => {
      inventoryMap.set(item.itemName.toLowerCase(), {
        itemName: item.itemName,
        centralStock: item.centralStock || 0,
        unit: item.unit || "",
      });
    });

    // Build result object
    const result: Record<string, {
      exists: boolean;
      itemName: string;
      centralStock: number;
      unit: string;
      status: "in_stock" | "out_of_stock" | "new_item";
    }> = {};

    args.itemNames.forEach((name) => {
      const inventoryItem = inventoryMap.get(name.toLowerCase());

      if (inventoryItem) {
        const stock = inventoryItem.centralStock;
        result[name] = {
          exists: true,
          itemName: inventoryItem.itemName,
          centralStock: stock,
          unit: inventoryItem.unit,
          status: stock > 0 ? "in_stock" : "out_of_stock",
        };
      } else {
        result[name] = {
          exists: false,
          itemName: name,
          centralStock: 0,
          unit: "",
          status: "new_item",
        };
      }
    });

    return result;
  },
});

// ============================================================================
// Mutations
// ============================================================================

/**
 * Create a new inventory item (Purchase Officer and Manager)
 */
export const createInventoryItem = mutation({
  args: {
    itemName: v.string(),
    description: v.string(),
    hsnSacCode: v.optional(v.string()),
    unit: v.optional(v.string()),
    centralStock: v.optional(v.number()),
    vendorId: v.optional(v.id("vendors")), // Deprecated, use vendorIds
    vendorIds: v.optional(v.array(v.id("vendors"))),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);

    // Check if user is a Purchase Officer
    if (currentUser.role !== "purchase_officer") {
      throw new Error("Unauthorized: Only Purchase Officers can create inventory items");
    }

    // Support both old vendorId and new vendorIds
    const vendorIds = args.vendorIds || (args.vendorId ? [args.vendorId] : []);

    // Validate vendors exist if provided
    if (vendorIds.length > 0) {
      for (const vendorId of vendorIds) {
        const vendor = await ctx.db.get(vendorId);
        if (!vendor || !vendor.isActive) {
          throw new Error(`Vendor not found: ${vendorId}`);
        }
      }
    }

    // Check for duplicates (Same Name + Same Description)
    const existingItems = await ctx.db
      .query("inventory")
      .withIndex("by_item_name", (q) => q.eq("itemName", args.itemName))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const isDuplicate = existingItems.some(
      (item) => (item.description || "").trim() === args.description.trim()
    );

    if (isDuplicate) {
      throw new Error(
        "An item with this name and description already exists. Please modify the description or use the existing item."
      );
    }

    const now = Date.now();
    const itemId = await ctx.db.insert("inventory", {
      itemName: args.itemName,
      description: args.description,
      hsnSacCode: args.hsnSacCode || "",
      unit: args.unit || "",
      centralStock: args.centralStock || 0,
      vendorId: vendorIds.length === 1 ? vendorIds[0] : undefined, // Keep for backward compatibility
      vendorIds: vendorIds.length > 0 ? vendorIds : undefined,
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
    description: v.optional(v.string()),
    hsnSacCode: v.optional(v.string()),
    unit: v.optional(v.string()),
    centralStock: v.optional(v.number()),
    vendorId: v.optional(v.id("vendors")), // Deprecated, use vendorIds
    vendorIds: v.optional(v.array(v.id("vendors"))),
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

    // Support both old vendorId and new vendorIds
    const vendorIds = args.vendorIds !== undefined
      ? args.vendorIds
      : (args.vendorId ? [args.vendorId] : []);

    // Validate vendors exist if provided
    if (vendorIds.length > 0) {
      for (const vendorId of vendorIds) {
        const vendor = await ctx.db.get(vendorId);
        if (!vendor || !vendor.isActive) {
          throw new Error(`Vendor not found: ${vendorId}`);
        }
      }
    }

    await ctx.db.patch(args.itemId, {
      itemName: args.itemName,
      description: args.description ?? item.description ?? "",
      hsnSacCode: args.hsnSacCode ?? item.hsnSacCode ?? "",
      unit: args.unit ?? item.unit ?? "",
      centralStock: args.centralStock ?? item.centralStock ?? 0,
      vendorId: vendorIds.length === 1 ? vendorIds[0] : undefined, // Keep for backward compatibility
      vendorIds: vendorIds.length > 0 ? vendorIds : undefined,
      updatedAt: Date.now(),
    });

    return args.itemId;
  },
});

/**
 * Link a vendor to an inventory item
 * Used when creating vendors from cost comparison to establish relationships
 */
export const linkVendorToItem = mutation({
  args: {
    itemName: v.string(),
    vendorId: v.id("vendors"),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);

    // Check if user is a Purchase Officer
    if (currentUser.role !== "purchase_officer") {
      throw new Error("Unauthorized: Only Purchase Officers can link vendors to items");
    }

    // Find the inventory item by name
    const item = await ctx.db
      .query("inventory")
      .withIndex("by_item_name", (q) => q.eq("itemName", args.itemName))
      .first();

    if (!item || !item.isActive) {
      throw new Error("Inventory item not found");
    }

    // Validate vendor exists
    const vendor = await ctx.db.get(args.vendorId);
    if (!vendor || !vendor.isActive) {
      throw new Error("Vendor not found");
    }

    // Add vendor to the item's vendor list
    const currentVendorIds = item.vendorIds || [];
    if (!currentVendorIds.includes(args.vendorId)) {
      await ctx.db.patch(item._id, {
        vendorIds: [...currentVendorIds, args.vendorId],
        updatedAt: Date.now(),
      });
    }

    return item._id;
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

/**
 * Deduct stock from inventory item (Purchase Officer only)
 * Used for direct delivery from inventory
 */
export const deductInventoryStock = mutation({
  args: {
    itemId: v.id("inventory"),
    quantity: v.number(),
    reason: v.optional(v.string()), // e.g., "Direct delivery for request REQ-001"
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);

    // Check if user is a Purchase Officer
    if (currentUser.role !== "purchase_officer") {
      throw new Error("Unauthorized: Only Purchase Officers can deduct inventory stock");
    }

    if (args.quantity <= 0) {
      throw new Error("Quantity must be greater than 0");
    }

    const item = await ctx.db.get(args.itemId);
    if (!item || !item.isActive) {
      throw new Error("Inventory item not found");
    }

    const currentStock = item.centralStock || 0;
    if (currentStock < args.quantity) {
      throw new Error(`Insufficient stock. Available: ${currentStock}, Requested: ${args.quantity}`);
    }

    const newStock = currentStock - args.quantity;

    await ctx.db.patch(args.itemId, {
      centralStock: newStock,
      updatedAt: Date.now(),
    });

    return { itemId: args.itemId, previousStock: currentStock, newStock, deducted: args.quantity };
  },
});

/**
 * Deduct stock from inventory item by item name (Purchase Officer only)
 * Used for direct delivery from inventory when we have item name instead of ID
 */
export const deductInventoryStockByName = mutation({
  args: {
    itemName: v.string(),
    quantity: v.number(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);

    // Check if user is a Purchase Officer
    if (currentUser.role !== "purchase_officer") {
      throw new Error("Unauthorized: Only Purchase Officers can deduct inventory stock");
    }

    if (args.quantity <= 0) {
      throw new Error("Quantity must be greater than 0");
    }

    // Find the inventory item by name (case-insensitive)
    const items = await ctx.db
      .query("inventory")
      .withIndex("by_is_active", (q) => q.eq("isActive", true))
      .collect();

    const item = items.find(
      (i) => i.itemName.toLowerCase() === args.itemName.toLowerCase()
    );

    if (!item) {
      throw new Error(`Inventory item not found: ${args.itemName}`);
    }

    const currentStock = item.centralStock || 0;
    if (currentStock < args.quantity) {
      throw new Error(`Insufficient stock. Available: ${currentStock}, Requested: ${args.quantity}`);
    }

    const newStock = currentStock - args.quantity;

    await ctx.db.patch(item._id, {
      centralStock: newStock,
      updatedAt: Date.now(),
    });

    return { itemId: item._id, previousStock: currentStock, newStock, deducted: args.quantity };
  },
});
