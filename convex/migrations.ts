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
 * Fix broken R2 image URLs in inventory items
 * The old R2_PUBLIC_URL had a typo (dsa inserted in hash).
 * This migration replaces all old broken URLs with the correct ones.
 */
export const fixInventoryImageUrls = mutation({
  args: {},
  handler: async (ctx) => {
    const OLD_URL = "https://pub-7e8316b021014356a6325dsa4db14a513.r2.dev";
    const NEW_URL = "https://pub-7e8316b021014356a8325ea8b18a513.r2.dev";

    const items = await ctx.db.query("inventory").collect();

    let fixedItemCount = 0;
    let fixedImageCount = 0;

    for (const item of items) {
      const images = item.images || [];
      if (images.length === 0) continue;

      let changed = false;
      const updatedImages = images.map((img: any) => {
        if (img.imageUrl && img.imageUrl.includes(OLD_URL)) {
          changed = true;
          fixedImageCount++;
          return {
            ...img,
            imageUrl: img.imageUrl.replace(OLD_URL, NEW_URL),
          };
        }
        return img;
      });

      if (changed) {
        await ctx.db.patch(item._id, { images: updatedImages });
        fixedItemCount++;
      }
    }

    // Also fix GRN invoice photos if any
    const grns = await ctx.db.query("grns").collect();
    let fixedGrnCount = 0;
    for (const grn of grns) {
      const grnAny = grn as any;
      const photos = grnAny.invoicePhotos || [];
      if (photos.length === 0) continue;

      let changed = false;
      const updatedPhotos = photos.map((photo: any) => {
        if (photo.photoUrl && photo.photoUrl.includes(OLD_URL)) {
          changed = true;
          return { ...photo, photoUrl: photo.photoUrl.replace(OLD_URL, NEW_URL) };
        }
        return photo;
      });

      if (changed) {
        await ctx.db.patch(grn._id, { invoicePhotos: updatedPhotos } as any);
        fixedGrnCount++;
      }
    }

    return {
      success: true,
      fixedItemCount,
      fixedImageCount,
      fixedGrnCount,
      message: `Fixed URLs in ${fixedItemCount} inventory item(s) covering ${fixedImageCount} image(s), and ${fixedGrnCount} GRN record(s)`,
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

