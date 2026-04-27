/**
 * Projects Management Functions
 * 
 * Handles CRUD operations for projects.
 * Only managers and purchase officers can manage projects.
 */

import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// ============================================================================
// Queries
// ============================================================================

/**
 * Get all projects
 */
export const getAllProjects = query({
  args: {
    includeInactive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    try {
      const userId = await getAuthUserId(ctx);
      if (!userId) return [];

      // Get current user
      const currentUser = await ctx.db
        .query("users")
        .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", userId))
        .first();

      if (!currentUser) return [];

      // Only managers and purchase officers can view projects
      if (currentUser.role !== "manager" && currentUser.role !== "purchase_officer") {
        return [];
      }

      // Get all projects
      let projects = await ctx.db
        .query("projects")
        .order("desc")
        .collect();

      // Filter by active status if needed
      if (!args.includeInactive) {
        projects = projects.filter((project) => (project.status ?? "active") === "active");
      }

      return projects;
    } catch (error) {
      // Fail-safe for production drift (schema/function/data sync issues):
      // return an empty list instead of surfacing a fatal client error.
      console.error("projects:getAllProjects failed", error);
      return [];
    }
  },
});

/**
 * Get project by ID
 */
export const getProjectById = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    return project;
  },
});

// ============================================================================
// Mutations
// ============================================================================

/**
 * Create a new project (Manager / Purchase Officer only)
 */
export const createProject = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    location: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("inactive")),
    estimatedTimeline: v.optional(v.number()),
    pdfUrl: v.optional(v.string()),
    pdfKey: v.optional(v.string()),
    pdfFileName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    // Get current user
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", userId))
      .first();

    if (!currentUser) throw new ConvexError("User not found");

    // Check if user is a manager or purchase officer
    if (currentUser.role !== "manager" && currentUser.role !== "purchase_officer") {
      throw new ConvexError("Unauthorized: Only managers and purchase officers can create projects");
    }

    const now = Date.now();

    // Create project
    const projectId = await ctx.db.insert("projects", {
      name: args.name,
      description: args.description,
      location: args.location,
      status: args.status,
      estimatedTimeline: args.estimatedTimeline,
      pdfUrl: args.pdfUrl,
      pdfKey: args.pdfKey,
      pdfFileName: args.pdfFileName,
      createdBy: currentUser._id,
      createdAt: now,
      updatedAt: now,
    });

    return projectId;
  },
});

/**
 * Update a project (Manager / Purchase Officer only)
 */
export const updateProject = mutation({
  args: {
    projectId: v.id("projects"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    location: v.optional(v.string()),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
    estimatedTimeline: v.optional(v.number()),
    pdfUrl: v.optional(v.string()),
    pdfKey: v.optional(v.string()),
    pdfFileName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    // Get current user
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", userId))
      .first();

    if (!currentUser) throw new ConvexError("User not found");

    // Check if user is a manager or purchase officer
    if (currentUser.role !== "manager" && currentUser.role !== "purchase_officer") {
      throw new ConvexError("Unauthorized: Only managers and purchase officers can update projects");
    }

    // Get project
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new ConvexError("Project not found");

    // Build update patch
    const { projectId, ...updateFields } = args;
    const patch: Record<string, any> = { updatedAt: Date.now() };

    if (updateFields.name !== undefined) patch.name = updateFields.name;
    if (updateFields.description !== undefined) patch.description = updateFields.description;
    if (updateFields.location !== undefined) patch.location = updateFields.location;
    if (updateFields.status !== undefined) patch.status = updateFields.status;
    if (updateFields.estimatedTimeline !== undefined) patch.estimatedTimeline = updateFields.estimatedTimeline;
    if (updateFields.pdfUrl !== undefined) patch.pdfUrl = updateFields.pdfUrl;
    if (updateFields.pdfKey !== undefined) patch.pdfKey = updateFields.pdfKey;
    if (updateFields.pdfFileName !== undefined) patch.pdfFileName = updateFields.pdfFileName;

    // Update project
    await ctx.db.patch(args.projectId, patch);

    return { success: true };
  },
});

/**
 * Delete a project (Manager / Purchase Officer only)
 */
export const deleteProject = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    // Get current user
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", userId))
      .first();

    if (!currentUser) throw new ConvexError("User not found");

    // Check if user is a manager or purchase officer
    if (currentUser.role !== "manager" && currentUser.role !== "purchase_officer") {
      throw new ConvexError("Unauthorized: Only managers and purchase officers can delete projects");
    }

    // Get project
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new ConvexError("Project not found");

    // Hard delete
    await ctx.db.delete(args.projectId);

    return { success: true };
  },
});
