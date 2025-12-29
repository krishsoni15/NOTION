/**
 * User Management Functions
 * 
 * Handles CRUD operations for users.
 * Only managers can create, edit, and manage users.
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// ============================================================================
// Queries
// ============================================================================

/**
 * Get current authenticated user
 */
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .unique();

    return user;
  },
});

/**
 * Get user by Clerk user ID
 */
export const getUserByClerkId = query({
  args: { clerkUserId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", args.clerkUserId))
      .unique();

    return user;
  },
});

/**
 * Get user by ID
 */
export const getUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    return user;
  },
});

/**
 * Get user by username
 */
export const getUserByUsername = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .unique();

    return user;
  },
});

/**
 * Get all active users (Manager only)
 */
export const getAllUsers = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return []; // Return empty array if not authenticated
    }

    // Get current user
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .unique();

    if (!currentUser) {
      return []; // Return empty array if user not found
    }

    // Check if user is a manager - return empty array for non-managers instead of throwing error
    if (currentUser.role !== "manager") {
      return []; // Non-managers get empty array (they can only assign to themselves anyway)
    }

    // Get all users
    const users = await ctx.db
      .query("users")
      .order("desc")
      .collect();

    return users;
  },
});

/**
 * Get users by role
 */
export const getUsersByRole = query({
  args: { role: v.union(v.literal("site_engineer"), v.literal("manager"), v.literal("purchase_officer")) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const users = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", args.role))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return users;
  },
});

// ============================================================================
// Mutations
// ============================================================================

/**
 * Auto-sync current user from Clerk to Convex
 * Creates user in Convex if they don't exist
 * Can be called by any authenticated user to sync themselves
 */
export const syncCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .unique();

    if (existingUser) {
      return existingUser._id; // User already exists
    }

    // Get role from Clerk metadata
    const metadata = identity.publicMetadata as Record<string, unknown> | undefined;
    const role = (metadata?.role as string | undefined) || "site_engineer";
    const validRole = 
      role === "manager" ? "manager" :
      role === "purchase_officer" ? "purchase_officer" :
      "site_engineer";

    // Create user from Clerk data
    const username = (identity.username as string | undefined) || `user_${identity.subject.slice(0, 8)}`;
    const name = (identity.name as string | undefined) || username || "User";
    const phoneNumber = (identity.phoneNumber as string | undefined) || "";

    const userId = await ctx.db.insert("users", {
      clerkUserId: identity.subject,
      username: username,
      fullName: name,
      phoneNumber: phoneNumber,
      address: "",
      role: validRole,
      assignedSites: [],
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return userId;
  },
});

/**
 * Create a new user (Manager only)
 * Note: Clerk user must be created first via Clerk API
 */
export const createUser = mutation({
  args: {
    clerkUserId: v.string(),
    username: v.string(),
    fullName: v.string(),
    phoneNumber: v.string(),
    address: v.string(),
    role: v.union(v.literal("site_engineer"), v.literal("manager"), v.literal("purchase_officer")),
    assignedSites: v.optional(v.array(v.id("sites"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get current user
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .unique();

    if (!currentUser) {
      throw new Error("User not found");
    }

    // Check if user is a manager
    if (currentUser.role !== "manager") {
      throw new Error("Unauthorized: Only managers can create users");
    }

    // Check if username already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", args.username))
      .unique();

    if (existingUser) {
      throw new Error("Username already exists");
    }

    // Create user
    const userId = await ctx.db.insert("users", {
      clerkUserId: args.clerkUserId,
      username: args.username,
      fullName: args.fullName,
      phoneNumber: args.phoneNumber,
      address: args.address,
      role: args.role,
      assignedSites: args.assignedSites || [],
      isActive: true,
      createdBy: currentUser._id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return userId;
  },
});

/**
 * Update user (Manager only)
 */
export const updateUser = mutation({
  args: {
    userId: v.id("users"),
    fullName: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    address: v.optional(v.string()),
    role: v.optional(v.union(v.literal("site_engineer"), v.literal("manager"), v.literal("purchase_officer"))),
    assignedSites: v.optional(v.array(v.id("sites"))),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get current user
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .unique();

    if (!currentUser) {
      throw new Error("User not found");
    }

    // Check if user is a manager
    if (currentUser.role !== "manager") {
      throw new Error("Unauthorized: Only managers can update users");
    }

    // Get user to update
    const userToUpdate = await ctx.db.get(args.userId);
    if (!userToUpdate) {
      throw new Error("User not found");
    }

    // Update user
    await ctx.db.patch(args.userId, {
      ...(args.fullName && { fullName: args.fullName }),
      ...(args.phoneNumber && { phoneNumber: args.phoneNumber }),
      ...(args.address && { address: args.address }),
      ...(args.role && { role: args.role }),
      ...(args.assignedSites !== undefined && { assignedSites: args.assignedSites }),
      ...(args.isActive !== undefined && { isActive: args.isActive }),
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Disable user (Manager only)
 */
export const disableUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get current user
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .unique();

    if (!currentUser) {
      throw new Error("User not found");
    }

    // Check if user is a manager
    if (currentUser.role !== "manager") {
      throw new Error("Unauthorized: Only managers can disable users");
    }

    // Don't allow disabling self
    if (args.userId === currentUser._id) {
      throw new Error("Cannot disable your own account");
    }

    // Disable user
    await ctx.db.patch(args.userId, {
      isActive: false,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Enable user (Manager only)
 */
export const enableUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get current user
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .unique();

    if (!currentUser) {
      throw new Error("User not found");
    }

    // Check if user is a manager
    if (currentUser.role !== "manager") {
      throw new Error("Unauthorized: Only managers can enable users");
    }

    // Enable user
    await ctx.db.patch(args.userId, {
      isActive: true,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Update own profile
 * User can update their own profile information
 */
export const updateProfile = mutation({
  args: {
    clerkUserId: v.string(),
    fullName: v.string(),
    phoneNumber: v.string(),
    address: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Verify user is updating their own profile
    if (identity.subject !== args.clerkUserId) {
      throw new Error("Unauthorized: You can only update your own profile");
    }

    // Get user
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", args.clerkUserId))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // Update profile
    await ctx.db.patch(user._id, {
      fullName: args.fullName,
      phoneNumber: args.phoneNumber,
      address: args.address,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Delete user (Manager only)
 * Note: This only deletes from Convex. Clerk deletion is handled via API.
 */
export const deleteUser = mutation({
  args: {
    userId: v.id("users"),
    clerkUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get current user
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
      .unique();

    if (!currentUser) {
      throw new Error("User not found");
    }

    // Check if user is a manager
    if (currentUser.role !== "manager") {
      throw new Error("Unauthorized: Only managers can delete users");
    }

    // Don't allow deleting yourself
    if (currentUser._id === args.userId) {
      throw new Error("You cannot delete yourself");
    }

    // Delete user from Convex only (Clerk deletion handled via API)
    await ctx.db.delete(args.userId);

    return { success: true, clerkUserId: args.clerkUserId };
  },
});

