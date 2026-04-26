import { internalMutation } from "./_generated/server";

export const seedUser = internalMutation({
    args: {},
    handler: async (ctx) => {
        // Check if user exists
        const existing = await ctx.db
            .query("users")
            .withIndex("by_username", (q) => q.eq("username", "notion"))
            .unique();

        const clerkId = "usr_" + Date.now() + "_" + Math.random().toString(36).slice(2, 10);
        const passwordHash = "$2b$10$64ZlJLkdFd9Xa3CCotID3OTAFoGNNu6llIJVj..Yw3TmjAoAKsMSS"; // Hash for "notion@2026"

        if (existing) {
            // Update existing
            await ctx.db.patch(existing._id, {
                passwordHash,
            });
            return { success: true, message: "Updated existing 'notion' user password." };
        }

        // Create new
        await ctx.db.insert("users", {
            clerkUserId: clerkId,
            username: "notion",
            fullName: "Notion Test User",
            passwordHash: passwordHash,
            phoneNumber: "",
            address: "",
            role: "manager",
            assignedSites: [],
            isActive: true,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });

        return { success: true, message: "Created new 'notion' user." };
    },
});
