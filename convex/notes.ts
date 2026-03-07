import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Get ALL GRN logs across all requests (for the GRN Logs page)
 * Returns the most recent logs first, enriched with user details.
 * Only includes system-generated audit logs (type = "log").
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

            // Filter to only audit logs for their requests
            const filtered = allNotes.filter(n => myRequestNumbers.has(n.requestNumber) && (n.type === "log" || !n.type));
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

        // Managers & POs see all audit logs
        const allNotes = await ctx.db
            .query("request_notes")
            .withIndex("by_created_at")
            .order("desc")
            .take(500);

        // Only return system audit logs (type = "log" or legacy entries without a type)
        const auditLogs = allNotes.filter(n => n.type === "log" || !n.type);

        return await Promise.all(
            auditLogs.map(async (note) => {
                const user = await ctx.db.get(note.userId);
                return {
                    ...note,
                    type: note.type || "log",
                    userName: user?.fullName || "Unknown User",
                    userRole: user?.role || note.role,
                };
            })
        );
    },
});

/**
 * Get audit logs for a specific request (GRN Audit Trail dialog).
 * Returns only system-generated log entries (type = "log").
 * Older entries without a type field are treated as logs for backward compatibility.
 */
export const getAuditLogs = query({
    args: { requestNumber: v.string() },
    handler: async (ctx, args) => {
        const notes = await ctx.db
            .query("request_notes")
            .withIndex("by_request_number", (q) => q.eq("requestNumber", args.requestNumber))
            .collect();

        // Only return system audit logs; treat legacy entries (no type) as logs
        const auditLogs = notes.filter(n => n.type === "log" || !n.type);

        // Sort ascending (chronological) for the audit trail
        auditLogs.sort((a, b) => a.createdAt - b.createdAt);

        return await Promise.all(
            auditLogs.map(async (note) => {
                const user = await ctx.db.get(note.userId);
                return {
                    ...note,
                    type: "log" as const,
                    userName: user?.fullName || "Unknown User",
                    userRole: user?.role || note.role,
                };
            })
        );
    },
});

/**
 * Get user-written notes for a specific request (Notes & Timeline dialog).
 * Returns only manual notes typed by users (type = "note").
 */
export const getNotes = query({
    args: { requestNumber: v.string() },
    handler: async (ctx, args) => {
        const notes = await ctx.db
            .query("request_notes")
            .withIndex("by_request_number", (q) => q.eq("requestNumber", args.requestNumber))
            .collect();

        // Only return user-written notes (type = "note")
        const userNotes = notes.filter(n => n.type === "note");

        // Sort descending (newest first) for the notes timeline
        userNotes.sort((a, b) => b.createdAt - a.createdAt);

        return await Promise.all(
            userNotes.map(async (note) => {
                const user = await ctx.db.get(note.userId);
                return {
                    ...note,
                    type: "note" as const,
                    userName: user?.fullName || "Unknown User",
                    userRole: user?.role || note.role,
                };
            })
        );
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
            type: "note", // Always a user-written note
            content: args.content,
            createdAt: Date.now(),
        });

        return noteId;
    },
});

export const recordSystemLog = mutation({
    args: {
        clerkUserId: v.string(),
        action: v.string(), // "login" | "logout"
    },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", args.clerkUserId))
            .first();

        if (!user) return null;

        const content = args.action === "login"
            ? "Logged into the system"
            : "Logged out of the system";

        return await ctx.db.insert("request_notes", {
            requestNumber: "SYSTEM",
            userId: user._id,
            role: user.role,
            status: args.action === "login" ? "login" : "logout",
            type: "log",
            content,
            createdAt: Date.now(),
        });
    },
});
