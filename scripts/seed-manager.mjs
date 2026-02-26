/**
 * Seed Script - Create initial manager user
 * 
 * Usage: node scripts/seed-manager.mjs
 * 
 * This creates the first manager user in the database.
 * Only works when the database has no users.
 */

import { ConvexHttpClient } from "convex/browser";

// bcrypt-ts compatible hash (using Web Crypto)
async function hashPassword(password) {
    // We'll use a simple approach - call the API or use bcrypt-ts directly
    // Since bcrypt-ts is an ESM module, import it
    const { hash } = await import("bcrypt-ts");
    return hash(password, 10);
}

const CONVEX_URL = "https://rosy-peacock-841.convex.cloud";

async function main() {
    const client = new ConvexHttpClient(CONVEX_URL);

    const username = "krish";
    const password = "krish123";
    const fullName = "Krish Soni";

    console.log(`\n🔐 Creating initial manager user...`);
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password}`);
    console.log(`   Role: manager\n`);

    // Hash the password
    console.log("⏳ Hashing password...");
    const passwordHash = await hashPassword(password);
    console.log("✅ Password hashed\n");

    // Call the seedManager mutation
    try {
        const result = await client.mutation("users:seedManager", {
            username,
            fullName,
            passwordHash,
            phoneNumber: "",
            address: "",
        });

        console.log("✅ Manager user created successfully!");
        console.log(`   User ID: ${result.userId}`);
        console.log(`   Auth ID: ${result.authUserId}`);
        console.log(`\n🎉 You can now login with:`);
        console.log(`   Username: ${username}`);
        console.log(`   Password: ${password}`);
    } catch (error) {
        if (error.message?.includes("already exist")) {
            console.log("ℹ️  Users already exist in the database. Seed skipped.");
        } else {
            console.error("❌ Error:", error.message);
        }
    }
}

main();
