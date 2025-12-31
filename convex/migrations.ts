/**
 * Database Migrations
 * 
 * Helper functions for database migrations and cleanup.
 */

import { mutation } from "./_generated/server";

/**
 * Clear all old messages with invalid schema
 * Run this once to clean up old test data
 */
export const clearOldMessages = mutation({
  args: {},
  handler: async (ctx) => {
    const messages = await ctx.db.query("messages").collect();
    
    let deletedCount = 0;
    
    for (const message of messages) {
      const messageAny = message as any;
      if ("text" in messageAny && !("content" in messageAny)) {
        await ctx.db.delete(message._id);
        deletedCount++;
      }
    }
    
    return { 
      success: true, 
      deletedCount,
      message: `Cleared ${deletedCount} old message(s)`
    };
  },
});

/**
 * Migrate photo field to photos array for requests
 * Converts single photo objects to photos arrays for backward compatibility
 */
export const migrateRequestPhotos = mutation({
  args: {},
  handler: async (ctx) => {
    const requests = await ctx.db.query("requests").collect();

    let migratedCount = 0;

    for (const request of requests) {
      const requestAny = request as any;

      // Check if request has old photo field and no photos field
      if (requestAny.photo && !requestAny.photos) {
        // Convert single photo to photos array
        await ctx.db.patch(request._id, {
          photos: [requestAny.photo],
          photo: undefined, // Remove old field
        });
        migratedCount++;
      }
    }

    return {
      success: true,
      migratedCount,
      message: `Migrated ${migratedCount} request(s) from photo to photos array`
    };
  },
});

/**
 * Clear all conversations (use with caution!)
 */
export const clearAllConversations = mutation({
  args: {},
  handler: async (ctx) => {
    const conversations = await ctx.db.query("conversations").collect();

    for (const conversation of conversations) {
      await ctx.db.delete(conversation._id);
    }

    return {
      success: true,
      deletedCount: conversations.length,
      message: `Cleared ${conversations.length} conversation(s)`
    };
  },
});

/**
 * Clear all presence records
 */
export const clearAllPresence = mutation({
  args: {},
  handler: async (ctx) => {
    const presenceRecords = await ctx.db.query("userPresence").collect();
    
    for (const record of presenceRecords) {
      await ctx.db.delete(record._id);
    }
    
    return { 
      success: true, 
      deletedCount: presenceRecords.length,
      message: `Cleared ${presenceRecords.length} presence record(s)`
    };
  },
});

