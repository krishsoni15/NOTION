/**
 * Cron Jobs / Scheduled Functions
 * 
 * Handles scheduled tasks like checking for due reminders.
 */

import { internalMutation, internalQuery } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";

/**
 * Check for due reminders and mark them as triggered
 * This should be called periodically (e.g., every minute)
 */
export const checkReminders = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Get all notes (we'll filter for ones with reminders)
    const notes = await ctx.db
      .query("stickyNotes")
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .filter((q) => q.eq(q.field("isCompleted"), false))
      .collect();

    // Filter for notes with due reminders that haven't been triggered
    const dueReminders = notes.filter((note) => {
      if (!note.reminderAt) return false;
      if (note.reminderTriggered) return false;
      return note.reminderAt <= now;
    });

    // Mark all due reminders as triggered
    for (const note of dueReminders) {
      await ctx.db.patch(note._id, {
        reminderTriggered: true,
        updatedAt: now,
      });
    }

    return { triggered: dueReminders.length };
  },
});

