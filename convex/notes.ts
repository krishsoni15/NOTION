import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Get ALL GRN logs across all requests (for the GRN Logs page)
 * Returns the most recent logs first, enriched with user details
 */
export const getAllGRNLogs = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);
        if (!userId) return [];

        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_clerk_user_id", (q: any) => q.eq("clerkUserId", userId))
            .unique();

        if (!currentUser) return [];

        // Only managers and purchase officers can view all GRN logs
        if (currentUser.role !== "manager" && currentUser.role !== "purchase_officer") {
            // Site engineers see only their own request logs
            // Get their requests first
            const myRequests = await ctx.db
                .query("requests")
                .withIndex("by_created_by", (q) => q.eq("createdBy", currentUser._id))
                .collect();

            const myRequestNumbers = new Set(myRequests.map(r => r.requestNumber));

            const allNotes = await ctx.db
                .query("request_notes")
                .withIndex("by_created_at")
                .order("desc")
                .collect();

            const filtered = allNotes.filter(n => myRequestNumbers.has(n.requestNumber));
            const limited = filtered.slice(0, 500);

            return await Promise.all(
                limited.map(async (note) => {
                    const user = await ctx.db.get(note.userId);
                    return {
                        ...note,
                        userName: user?.fullName || "Unknown User",
                        userRole: user?.role || note.role,
                    };
                })
            );
        }

        // Managers & POs see all logs
        const allNotes = await ctx.db
            .query("request_notes")
            .withIndex("by_created_at")
            .order("desc")
            .take(500);

        return await Promise.all(
            allNotes.map(async (note) => {
                const user = await ctx.db.get(note.userId);
                return {
                    ...note,
                    type: note.type || "note", // Default to note if undefined (backward compatibility)
                    userName: user?.fullName || "Unknown User",
                    userRole: user?.role || note.role,
                };
            })
        );
    },
});

export const getNotes = query({
    args: { requestNumber: v.string() },
    handler: async (ctx, args) => {
        const notes = await ctx.db
            .query("request_notes")
            .withIndex("by_request_number", (q) => q.eq("requestNumber", args.requestNumber))
            .collect();

        // Sort in memory to ensure correct order (descending by createdAt)
        notes.sort((a, b) => b.createdAt - a.createdAt);

        // Enrich with user details
        const enrichedNotes = await Promise.all(
            notes.map(async (note) => {
                const user = await ctx.db.get(note.userId);
                return {
                    ...note,
                    type: note.type || "note", // Default to note
                    userName: user?.fullName || "Unknown User",
                    userRole: user?.role || note.role,
                };
            })
        );

        return enrichedNotes;
    },
});

export const addNote = mutation({
    args: {
        requestNumber: v.string(),
        content: v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Unauthenticated");

        const user = await ctx.db
            .query("users")
            .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", identity.subject))
            .first();

        if (!user) throw new Error("User not found");

        const request = await ctx.db
            .query("requests")
            .withIndex("by_request_number", (q) => q.eq("requestNumber", args.requestNumber))
            .first();

        const noteId = await ctx.db.insert("request_notes", {
            requestNumber: args.requestNumber,
            userId: user._id,
            role: user.role,
            status: request?.status,
            type: "note",
            content: args.content,
            createdAt: Date.now(),
        });

        return noteId;
    },
});
