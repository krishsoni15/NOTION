/**
 * Check if current user exists in Convex
 * 
 * This query checks if the user exists. It does NOT auto-create users.
 * Users must be created by managers through the user management interface.
 */

import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const checkCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const clerkUserId = await getAuthUserId(ctx);
    if (!clerkUserId) {
      return null;
    }

    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", clerkUserId))
      .unique();

    return existingUser ? existingUser._id : null;
  },
});

export const syncCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const clerkUserId = await getAuthUserId(ctx);
    if (!clerkUserId) {
      throw new Error("Not authenticated");
    }

    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", clerkUserId))
      .unique();

    if (existingUser) {
      return existingUser._id; // User exists
    }

    // User doesn't exist - DO NOT auto-create
    // User must be created by a manager first
    // Return null to indicate user doesn't exist
    return null;
  },
});

