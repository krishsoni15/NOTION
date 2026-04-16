
import { v } from "convex/values";
import { query } from "./_generated/server";

export const getManagerDashboardStats = query({
    args: {},
    handler: async (ctx) => {
        // 1. Fetch Requests Data
        const allRequests = await ctx.db.query("requests").collect();

        // Calculate Request Stats
        const totalRequests = allRequests.length;
        const pendingRequests = allRequests.filter(r => r.status === "pending" || r.status === "sign_pending").length;
        const approvedRequests = allRequests.filter(r => r.status === "approved" || r.status === "ready_for_po").length;
        const rejectedRequests = allRequests.filter(r => r.status === "rejected" || r.status === "sign_rejected").length;

        // Status Breakdown for Pie Chart
        const statusDistribution = [
            { name: "Pending", value: pendingRequests, color: "#f59e0b" },
            { name: "Approved", value: approvedRequests, color: "#10b981" },
            { name: "Rejected", value: rejectedRequests, color: "#ef4444" },
            { name: "Other", value: totalRequests - (pendingRequests + approvedRequests + rejectedRequests), color: "#64748b" }
        ];

        // Recent Activity (Last 5 requests)
        const recentRequests = await ctx.db
            .query("requests")
            .withIndex("by_created_at")
            .order("desc")
            .take(7);

        // Enrich recent requests with user details
        const recentActivity = await Promise.all(
            recentRequests.map(async (req) => {
                const creator = await ctx.db.get(req.createdBy);
                return {
                    ...req,
                    creatorName: creator?.fullName || "Unknown",
                    creatorImage: creator?.profileImage,
                };
            })
        );

        // 2. Fetch User Stats
        const totalUsers = (await ctx.db.query("users").collect()).length;

        // 3. Fetch Inventory Stats
        const allInventory = await ctx.db.query("inventory").collect();
        const totalInventoryItems = allInventory.length;
        // Assume low stock is < 20 for this demo
        const lowStockItems = allInventory.filter(i => (i.centralStock || 0) < 20).length;

        // 4. Site Performance (Requests per site) - aggregated in memory (not efficient for huge data, but fine for dashboard)
        const siteCounts: Record<string, number> = {};
        for (const req of allRequests) {
            siteCounts[req.siteId] = (siteCounts[req.siteId] || 0) + 1;
        }

        // Fetch site names for the top 5 sites
        const topSiteIds = Object.entries(siteCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([id]) => id);

        const sitePerformance = await Promise.all(
            topSiteIds.map(async (id) => {
                const site = await ctx.db.get(id as any);
                return {
                    name: (site as any)?.name || "Unknown Site",
                    requests: siteCounts[id],
                };
            })
        );

        return {
            overview: {
                totalRequests,
                pendingRequests,
                approvedRequests,
                rejectedRequests,
                totalUsers,
                totalInventoryItems,
                lowStockItems,
            },
            charts: {
                statusDistribution,
                sitePerformance,
            },
            recentActivity,
        };
    },
});
