/**
 * Project Items & Categories Functions
 * 
 * Handles CRUD operations for items within a project and shared categories.
 */

import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// ============================================================================
// Categories Queries & Mutations
// ============================================================================

export const getCategories = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("projectCategories")
      .order("asc")
      .collect();
  },
});

export const createCategory = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", userId))
      .first();

    if (!currentUser) throw new ConvexError("User not found");

    // Check for duplicate category name (case-insensitive check handled in app logic or here)
    const existing = await ctx.db
      .query("projectCategories")
      .withIndex("by_name", (q) => q.eq("name", args.name.trim()))
      .first();

    if (existing) {
      return existing._id;
    }

    const categoryId = await ctx.db.insert("projectCategories", {
      name: args.name.trim(),
      createdBy: currentUser._id,
      createdAt: Date.now(),
    });

    return categoryId;
  },
});

// ============================================================================
// Project Items Queries & Mutations
// ============================================================================

export const getItemsByProjectId = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const items = await ctx.db
      .query("projectItems")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .order("desc")
      .collect();

    // Fetch category names for the items
    const itemsWithCategory = await Promise.all(
      items.map(async (item) => {
        const category = await ctx.db.get(item.categoryId);
        return {
          ...item,
          categoryName: category?.name || "Unknown",
        };
      })
    );

    return itemsWithCategory;
  },
});

export const createItem = mutation({
  args: {
    projectId: v.id("projects"),
    name: v.string(),
    description: v.optional(v.string()),
    categoryId: v.id("projectCategories"),
    make: v.optional(v.string()),
    quantity: v.number(),
    rate: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", userId))
      .first();

    if (!currentUser) throw new ConvexError("User not found");

    const now = Date.now();
    const itemId = await ctx.db.insert("projectItems", {
      projectId: args.projectId,
      name: args.name,
      description: args.description,
      categoryId: args.categoryId,
      make: args.make,
      quantity: args.quantity,
      rate: args.rate,
      createdBy: currentUser._id,
      createdAt: now,
      updatedAt: now,
    });

    return itemId;
  },
});

export const updateItem = mutation({
  args: {
    itemId: v.id("projectItems"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    categoryId: v.optional(v.id("projectCategories")),
    make: v.optional(v.string()),
    quantity: v.optional(v.number()),
    rate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const item = await ctx.db.get(args.itemId);
    if (!item) throw new ConvexError("Item not found");

    const { itemId, ...updateFields } = args;
    const patch: Record<string, any> = { updatedAt: Date.now() };

    if (updateFields.name !== undefined) patch.name = updateFields.name;
    if (updateFields.description !== undefined) patch.description = updateFields.description;
    if (updateFields.categoryId !== undefined) patch.categoryId = updateFields.categoryId;
    if (updateFields.make !== undefined) patch.make = updateFields.make;
    if (updateFields.quantity !== undefined) patch.quantity = updateFields.quantity;
    if (updateFields.rate !== undefined) patch.rate = updateFields.rate;

    await ctx.db.patch(itemId, patch);
    return { success: true };
  },
});

export const deleteItem = mutation({
  args: { itemId: v.id("projectItems") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const item = await ctx.db.get(args.itemId);
    if (!item) throw new ConvexError("Item not found");

    await ctx.db.delete(args.itemId);
    return { success: true };
  },
});
