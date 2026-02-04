import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Get all notifications for the current user
 */
export const getMyNotifications = query({
    args: {
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return [];

        // Get current user details to find their internal ID
        const user = await ctx.db
            .query("users")
            .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", userId))
            .unique();

        if (!user) return [];

        const limit = args.limit || 20;

        const notifications = await ctx.db
            .query("notifications")
            .withIndex("by_user_id", (q) => q.eq("userId", user._id))
            .order("desc")
            .take(limit);

        return notifications;
    },
});

/**
 * Get unread notification count
 */
export const getUnreadCount = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return 0;

        const user = await ctx.db
            .query("users")
            .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", userId))
            .unique();

        if (!user) return 0;

        const unreadNotifications = await ctx.db
            .query("notifications")
            .withIndex("by_user_id", (q) => q.eq("userId", user._id))
            .filter((q) => q.eq(q.field("isRead"), false))
            .collect();

        return unreadNotifications.length;
    },
});

/**
 * Mark a notification as read
 */
export const markAsRead = mutation({
    args: {
        notificationId: v.id("notifications"),
    },
    handler: async (ctx, args) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        await ctx.db.patch(args.notificationId, {
            isRead: true,
        });
    },
});

/**
 * Mark all notifications as read
 */
export const markAllAsRead = mutation({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) throw new Error("Not authenticated");

        const user = await ctx.db
            .query("users")
            .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", userId))
            .unique();

        if (!user) throw new Error("User not found");

        const unreadNotifications = await ctx.db
            .query("notifications")
            .withIndex("by_user_id", (q) => q.eq("userId", user._id))
            .filter((q) => q.eq(q.field("isRead"), false))
            .collect();

        await Promise.all(
            unreadNotifications.map((notification) =>
                ctx.db.patch(notification._id, { isRead: true })
            )
        );
    },
});
