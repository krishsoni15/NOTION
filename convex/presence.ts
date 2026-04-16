/**
 * User Presence Functions
 * 
 * Tracks online/offline status for users in the chat system.
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Update user's online status (heartbeat)
 * Should be called periodically (e.g., every 30 seconds) when user is active
 */
export const updatePresence = mutation({
  args: {
    isOnline: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      // Silently fail if not authenticated (user might be logging out)
      return null;
    }

    // Get current user
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", userId))
      .unique();

    if (!currentUser) {
      // User doesn't exist in database yet
      return null;
    }

    const now = Date.now();

    // Check if presence record exists
    const existingPresence = await ctx.db
      .query("userPresence")
      .withIndex("by_user_id", (q) => q.eq("userId", currentUser._id))
      .unique();

    if (existingPresence) {
      // Update existing presence
      await ctx.db.patch(existingPresence._id, {
        isOnline: args.isOnline,
        lastSeenAt: now,
        updatedAt: now,
      });
      return existingPresence._id;
    } else {
      // Create new presence record
      const presenceId = await ctx.db.insert("userPresence", {
        userId: currentUser._id,
        isOnline: args.isOnline,
        lastSeenAt: now,
        updatedAt: now,
      });
      return presenceId;
    }
  },
});

/**
 * Get presence status for a specific user
 */
export const getUserPresence = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const presence = await ctx.db
      .query("userPresence")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .unique();

    if (!presence) {
      return {
        isOnline: false,
        lastSeenAt: null,
      };
    }

    // Consider user offline if last update was more than 2 minutes ago
    const now = Date.now();
    const twoMinutesAgo = now - 2 * 60 * 1000;
    const isOnline = presence.isOnline && presence.updatedAt > twoMinutesAgo;

    return {
      isOnline,
      lastSeenAt: presence.lastSeenAt,
    };
  },
});

/**
 * Get presence status for multiple users
 */
export const getMultipleUserPresence = query({
  args: {
    userIds: v.array(v.id("users")),
  },
  handler: async (ctx, args) => {
    const presenceRecords = await Promise.all(
      args.userIds.map(async (userId) => {
        const presence = await ctx.db
          .query("userPresence")
          .withIndex("by_user_id", (q) => q.eq("userId", userId))
          .unique();

        if (!presence) {
          return {
            userId,
            isOnline: false,
            lastSeenAt: null,
          };
        }

        // Consider user offline if last update was more than 2 minutes ago
        const now = Date.now();
        const twoMinutesAgo = now - 2 * 60 * 1000;
        const isOnline = presence.isOnline && presence.updatedAt > twoMinutesAgo;

        return {
          userId,
          isOnline,
          lastSeenAt: presence.lastSeenAt,
        };
      })
    );

    // Return as a map for easy lookup
    return presenceRecords.reduce((acc, record) => {
      acc[record.userId] = {
        isOnline: record.isOnline,
        lastSeenAt: record.lastSeenAt,
      };
      return acc;
    }, {} as Record<string, { isOnline: boolean; lastSeenAt: number | null }>);
  },
});

/**
 * Get all currently online users
 */
export const getOnlineUsers = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const twoMinutesAgo = now - 2 * 60 * 1000;

    // Get all presence records that are marked online and updated recently
    const presenceRecords = await ctx.db
      .query("userPresence")
      .withIndex("by_is_online", (q) => q.eq("isOnline", true))
      .filter((q) => q.gt(q.field("updatedAt"), twoMinutesAgo))
      .collect();

    // Get user details for online users
    const onlineUsers = await Promise.all(
      presenceRecords.map(async (presence) => {
        const user = await ctx.db.get(presence.userId);
        if (!user) return null;

        return {
          _id: user._id,
          fullName: user.fullName,
          username: user.username,
          role: user.role,
          lastSeenAt: presence.lastSeenAt,
        };
      })
    );

    // Filter out nulls
    return onlineUsers.filter((user) => user !== null);
  },
});

/**
 * Mark user as offline (called on logout or window close)
 */
export const setOffline = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      // User already logged out, no action needed
      return { success: true };
    }

    // Get current user
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", userId))
      .unique();

    if (!currentUser) {
      // User doesn't exist, no action needed
      return { success: true };
    }

    const now = Date.now();

    // Update presence to offline
    const existingPresence = await ctx.db
      .query("userPresence")
      .withIndex("by_user_id", (q) => q.eq("userId", currentUser._id))
      .unique();

    if (existingPresence) {
      await ctx.db.patch(existingPresence._id, {
        isOnline: false,
        lastSeenAt: now,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

/**
 * Cleanup stale presence records (for maintenance)
 * Marks users as offline if they haven't updated in over 5 minutes
 */
export const cleanupStalePresence = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;

    // Get all presence records that are marked online but haven't updated recently
    const staleRecords = await ctx.db
      .query("userPresence")
      .withIndex("by_is_online", (q) => q.eq("isOnline", true))
      .filter((q) => q.lt(q.field("updatedAt"), fiveMinutesAgo))
      .collect();

    // Mark them as offline
    await Promise.all(
      staleRecords.map((record) =>
        ctx.db.patch(record._id, {
          isOnline: false,
          updatedAt: now,
        })
      )
    );

    return { cleaned: staleRecords.length };
  },
});

