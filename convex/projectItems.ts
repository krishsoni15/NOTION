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

/**
 * Send selected project items to the procurement pipeline.
 * Creates material requests (RFQ style) with status "ready_for_cc"
 * so they appear in the Purchase Officer's CC queue immediately.
 */
export const sendItemsToProcurement = mutation({
  args: {
    projectId: v.id("projects"),
    itemIds: v.array(v.id("projectItems")),
    siteId: v.optional(v.id("sites")), // Optional site override
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", userId))
      .first();

    if (!currentUser) throw new ConvexError("User not found");

    // Only managers and purchase officers can send items to procurement
    if (currentUser.role !== "manager" && currentUser.role !== "purchase_officer") {
      throw new ConvexError("Unauthorized: Only managers and purchase officers can send items to procurement");
    }

    if (args.itemIds.length === 0) {
      throw new ConvexError("Please select at least one item");
    }

    // Validate project exists
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new ConvexError("Project not found");

    // Determine siteId: use provided or get first active site as placeholder
    let effectiveSiteId = args.siteId;
    if (!effectiveSiteId) {
      const site = await ctx.db
        .query("sites")
        .withIndex("by_is_active", (q) => q.eq("isActive", true))
        .first();
      if (!site) throw new ConvexError("No active site found. Please create a site first.");
      effectiveSiteId = site._id;
    }

    // Generate unique sequential request number
    const allRequests = await ctx.db.query("requests").collect();
    let maxNumber = 0;
    for (const request of allRequests) {
      const numMatch = request.requestNumber.match(/^(\d{3})$/);
      if (numMatch) {
        const num = parseInt(numMatch[1], 10);
        if (num > maxNumber) maxNumber = num;
      }
    }
    const requestNumber = (maxNumber + 1).toString().padStart(3, "0");

    const now = Date.now();
    const requestIds: any[] = [];

    // Create request entries from each project item
    for (let i = 0; i < args.itemIds.length; i++) {
      const itemId = args.itemIds[i];
      const item = await ctx.db.get(itemId);
      if (!item) throw new ConvexError(`Project item not found`);
      if (item.projectId !== args.projectId) {
        throw new ConvexError("Item does not belong to the specified project");
      }

      const requestId = await ctx.db.insert("requests", {
        requestNumber,
        createdBy: currentUser._id,
        siteId: effectiveSiteId!,
        itemName: item.name,
        description: item.description || `From Project: ${project.name}${item.make ? ` | Make: ${item.make}` : ""}`,
        specsBrand: item.make || undefined,
        quantity: item.quantity,
        unit: "nos", // Default unit for project items
        requiredBy: project.estimatedTimeline || (now + 30 * 24 * 60 * 60 * 1000), // Use project deadline or +30 days
        isUrgent: false,
        itemOrder: i + 1,
        status: "ready_for_cc", // Skip approval, go directly to CC queue
        isRFQ: true, // Mark as RFQ-originated
        createdAt: now,
        updatedAt: now,
      });
      requestIds.push(requestId);
    }

    // Audit log
    await ctx.db.insert("request_notes", {
      requestNumber,
      userId: currentUser._id,
      role: currentUser.role,
      status: "ready_for_cc",
      type: "log",
      content: `Project "${project.name}" — ${args.itemIds.length} item(s) sent to procurement as RFQ #${requestNumber}. Ready for Cost Comparison.`,
      createdAt: now,
    });

    return { requestIds, requestNumber };
  },
});
