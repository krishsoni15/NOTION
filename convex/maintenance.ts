import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Emergency Database Cleanup
 * 
 * This mutation is designed to be called when the regular auth lookups are crashing
 * due to duplicate user records. It fixes the "Server Error" by cleaning up duplicates.
 */
export const cleanupDuplicateUsers = mutation({
    args: {
        adminSecret: v.string(), // Simple guard
    },
    handler: async (ctx, args) => {
        // Basic security check
        if (args.adminSecret !== "notion-fix-2026") {
            throw new ConvexError("Unauthorized: Incorrect secret");
        }

        const allUsers = await ctx.db.query("users").collect();
        const seenClerkIds = new Set<string>();
        const seenUsernames = new Set<string>();
        let deletedCount = 0;

        for (const user of allUsers) {
            let shouldDelete = false;

            // Check for duplicate Clerk User IDs
            if (user.clerkUserId && seenClerkIds.has(user.clerkUserId)) {
                shouldDelete = true;
            } else if (user.clerkUserId) {
                seenClerkIds.add(user.clerkUserId);
            }

            // Check for duplicate Usernames
            if (user.username && seenUsernames.has(user.username)) {
                shouldDelete = true;
            } else if (user.username) {
                seenUsernames.add(user.username);
            }

            if (shouldDelete) {
                await ctx.db.delete(user._id);
                deletedCount++;
            }
        }

        return {
            success: true,
            deletedCount,
            message: `Deleted ${deletedCount} duplicate user records. System should be stable now.`,
        };
    },
});

/**
 * Check system health
 */
export const checkSystemHealth = query({
    args: {},
    handler: async (ctx) => {
        const users = await ctx.db.query("users").collect();
        const grns = await ctx.db.query("grns").collect();
        const pos = await ctx.db.query("purchaseOrders").collect();

        const vendors = await ctx.db.query("vendors").collect();

        // Check for duplicates
        const clerkIds = users.map(u => u.clerkUserId);
        const hasDuplicateUsers = new Set(clerkIds).size !== clerkIds.length;

        return {
            userCount: users.length,
            vendorCount: vendors.length,
            grnCount: grns.length,
            poCount: pos.length,
            hasDuplicateUsers,
            status: hasDuplicateUsers ? "ERROR: Duplicate users found!" : "OK",
            recommendation: hasDuplicateUsers ? "Run cleanupDuplicateUsers mutation" : "System looks healthy",
        };
    },
});

export const deleteAllVendors = mutation({
    args: { adminSecret: v.string() },
    handler: async (ctx, args) => {
        if (args.adminSecret !== "notion-fix-2026") throw new ConvexError("Unauthorized: Incorrect secret");
        const vendors = await ctx.db.query("vendors").collect();
        for (const vendor of vendors) {
            await ctx.db.delete(vendor._id);
        }
        return { success: true, message: `Deleted ${vendors.length} vendors.` };
    }
});

export const deleteAllGrns = mutation({
    args: { adminSecret: v.string() },
    handler: async (ctx, args) => {
        if (args.adminSecret !== "notion-fix-2026") throw new ConvexError("Unauthorized: Incorrect secret");
        const grns = await ctx.db.query("grns").collect();
        for (const grn of grns) {
            await ctx.db.delete(grn._id);
        }
        return { success: true, message: `Deleted ${grns.length} GRNs.` };
    }
});
