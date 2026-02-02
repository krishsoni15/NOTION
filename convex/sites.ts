/**
 * Sites Management Functions
 * 
 * Handles CRUD operations for sites.
 * Only managers can create, edit, and manage sites.
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// ============================================================================
// Queries
// ============================================================================

/**
 * Get all active sites
 */
export const getAllSites = query({
  args: {
    includeInactive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Get current user
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", userId))
      .unique();

    if (!currentUser) return [];

    // Get all sites
    let sites = await ctx.db
      .query("sites")
      .order("desc")
      .collect();

    // Filter by active status if needed
    if (!args.includeInactive) {
      sites = sites.filter((site) => site.isActive);
    }

    return sites;
  },
});

/**
 * Get site by ID
 */
export const getSiteById = query({
  args: { siteId: v.id("sites") },
  handler: async (ctx, args) => {
    const site = await ctx.db.get(args.siteId);
    return site;
  },
});

/**
 * Search sites by name
 */
export const searchSites = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Normalize search query - trim and normalize whitespace
    const searchQuery = args.query.trim().replace(/\s+/g, " ").toLowerCase();
    if (!searchQuery) return [];

    const allSites = await ctx.db
      .query("sites")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return allSites.filter((site) =>
      site.name.toLowerCase().includes(searchQuery) ||
      site.code?.toLowerCase().includes(searchQuery) ||
      site.address?.toLowerCase().includes(searchQuery)
    );
  },
});

// ============================================================================
// Mutations
// ============================================================================

/**
 * Create a new site (Manager only)
 */
export const createSite = mutation({
  args: {
    name: v.string(),
    code: v.optional(v.string()),
    address: v.optional(v.string()),
    description: v.optional(v.string()),
    type: v.optional(v.union(v.literal("site"), v.literal("inventory"), v.literal("other"))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Get current user
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", userId))
      .unique();

    if (!currentUser) throw new Error("User not found");

    // Check if user is a manager or purchase officer
    if (currentUser.role !== "manager" && currentUser.role !== "purchase_officer") {
      throw new Error("Unauthorized: Only managers and purchase officers can create sites");
    }

    // Check if site name already exists (case-insensitive)
    const siteNameLower = args.name.trim().toLowerCase();
    const allSites = await ctx.db.query("sites").collect();
    const existingSite = allSites.find(
      (site) => site.name.toLowerCase() === siteNameLower && site.isActive
    );

    if (existingSite) {
      throw new Error(`Location "${args.name}" already exists`);
    }

    const now = Date.now();

    // Create site
    const siteId = await ctx.db.insert("sites", {
      name: args.name,
      code: args.code,
      address: args.address,
      description: args.description,
      type: args.type || "site", // Default to 'site'
      isActive: true,
      createdBy: currentUser._id,
      createdAt: now,
      updatedAt: now,
    });

    return siteId;
  },
});

/**
 * Update a site (Manager only)
 */
export const updateSite = mutation({
  args: {
    siteId: v.id("sites"),
    name: v.optional(v.string()),
    code: v.optional(v.string()),
    address: v.optional(v.string()),
    description: v.optional(v.string()),
    type: v.optional(v.union(v.literal("site"), v.literal("inventory"), v.literal("other"))),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Get current user
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", userId))
      .unique();

    if (!currentUser) throw new Error("User not found");

    // Check if user is a manager
    if (currentUser.role !== "manager") {
      throw new Error("Unauthorized: Only managers can update sites");
    }

    // Get site
    const site = await ctx.db.get(args.siteId);
    if (!site) throw new Error("Site not found");

    // Update site
    await ctx.db.patch(args.siteId, {
      ...(args.name !== undefined && { name: args.name }),
      ...(args.code !== undefined && { code: args.code }),
      ...(args.address !== undefined && { address: args.address }),
      ...(args.description !== undefined && { description: args.description }),
      ...(args.type !== undefined && { type: args.type }),
      ...(args.isActive !== undefined && { isActive: args.isActive }),
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Check if site is in use (assigned to users or used in requests)
 */
export const checkSiteUsage = query({
  args: { siteId: v.id("sites") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { isInUse: false, assignedToUsers: 0, usedInRequests: 0 };

    // Check if site is assigned to any users
    const allUsers = await ctx.db.query("users").collect();
    const assignedToUsers = allUsers.filter(
      (user) => user.assignedSites && user.assignedSites.includes(args.siteId)
    ).length;

    // Check if site is used in any requests
    const requests = await ctx.db
      .query("requests")
      .withIndex("by_site_id", (q) => q.eq("siteId", args.siteId))
      .collect();
    const usedInRequests = requests.length;

    const isInUse = assignedToUsers > 0 || usedInRequests > 0;

    return {
      isInUse,
      assignedToUsers,
      usedInRequests,
    };
  },
});

/**
 * Toggle site active status (Manager only)
 * Cannot deactivate if site is assigned to users
 */
export const toggleSiteStatus = mutation({
  args: { siteId: v.id("sites") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Get current user
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", userId))
      .unique();

    if (!currentUser) throw new Error("User not found");

    // Check if user is a manager
    if (currentUser.role !== "manager") {
      throw new Error("Unauthorized: Only managers can toggle site status");
    }

    // Get site
    const site = await ctx.db.get(args.siteId);
    if (!site) throw new Error("Site not found");

    // If trying to deactivate, check if site is assigned to users
    if (site.isActive) {
      const allUsers = await ctx.db.query("users").collect();
      const assignedToUsers = allUsers.filter(
        (user) => user.assignedSites && user.assignedSites.includes(args.siteId)
      );

      if (assignedToUsers.length > 0) {
        throw new Error(
          `Cannot deactivate site: It is assigned to ${assignedToUsers.length} user(s). Please unassign the site first.`
        );
      }
    }

    // Toggle status
    await ctx.db.patch(args.siteId, {
      isActive: !site.isActive,
      updatedAt: Date.now(),
    });

    return { success: true, isActive: !site.isActive };
  },
});

/**
 * Delete a site (Manager only)
 * If site is not assigned to users: Hard delete (permanent)
 * If site is assigned: Cannot delete (error)
 */
export const deleteSite = mutation({
  args: { siteId: v.id("sites") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Get current user
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", userId))
      .unique();

    if (!currentUser) throw new Error("User not found");

    // Check if user is a manager
    if (currentUser.role !== "manager") {
      throw new Error("Unauthorized: Only managers can delete sites");
    }

    // Get site
    const site = await ctx.db.get(args.siteId);
    if (!site) throw new Error("Site not found");

    // Check if site is assigned to any users
    const allUsers = await ctx.db.query("users").collect();
    const assignedToUsers = allUsers.filter(
      (user) => user.assignedSites && user.assignedSites.includes(args.siteId)
    );

    if (assignedToUsers.length > 0) {
      throw new Error(
        `Cannot delete site: It is assigned to ${assignedToUsers.length} user(s). Please unassign the site first.`
      );
    }

    // Check if site is used in any requests
    const requests = await ctx.db
      .query("requests")
      .withIndex("by_site_id", (q) => q.eq("siteId", args.siteId))
      .collect();

    if (requests.length > 0) {
      throw new Error(
        `Cannot delete site: It is used in ${requests.length} request(s). Sites with associated requests cannot be deleted.`
      );
    }

    // Hard delete (permanent) - site is not assigned, safe to delete
    await ctx.db.delete(args.siteId);

    return { success: true };
  },
});

