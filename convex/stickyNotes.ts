/**
 * Sticky Notes Functions
 * 
 * Handles all sticky notes operations including CRUD, reminders,
 * and role-based permissions.
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "./_generated/dataModel";

// ============================================================================
// Queries
// ============================================================================

/**
 * Get all sticky notes for the current user
 * - Managers: See all notes (assigned to anyone)
 * - Other users: See only notes assigned to them
 */
export const list = query({
  args: {
    includeCompleted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Get current user
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", userId))
      .unique();

    if (!currentUser) return [];

    const isManager = currentUser.role === "manager";

    // Get notes based on user role
    let notes;
    if (isManager) {
      // Managers can see all notes (assigned to anyone)
      notes = await ctx.db
        .query("stickyNotes")
        .filter((q) => q.eq(q.field("isDeleted"), false))
        .filter((q) =>
          args.includeCompleted
            ? true
            : q.eq(q.field("isCompleted"), false)
        )
        .order("desc")
        .collect();
    } else {
      // Regular users only see notes assigned to them
      notes = await ctx.db
        .query("stickyNotes")
        .withIndex("by_assigned_to", (q) => q.eq("assignedTo", currentUser._id))
        .filter((q) => q.eq(q.field("isDeleted"), false))
        .filter((q) =>
          args.includeCompleted
            ? true
            : q.eq(q.field("isCompleted"), false)
        )
        .order("desc")
        .collect();
    }

    // Populate creator and assignee info
    const notesWithUsers = await Promise.all(
      notes.map(async (note) => {
        const creator = await ctx.db.get(note.createdBy);
        const assignee = await ctx.db.get(note.assignedTo);
        return {
          ...note,
          creator: creator ? { _id: creator._id, fullName: creator.fullName } : null,
          assignee: assignee ? { _id: assignee._id, fullName: assignee.fullName } : null,
        };
      })
    );

    return notesWithUsers;
  },
});

/**
 * Get pending reminders count for the current user
 */
export const getPendingReminders = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return 0;

    // Get current user
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", userId))
      .unique();

    if (!currentUser) return 0;

    const now = Date.now();

    // Get notes with upcoming reminders (not yet triggered, not completed, not deleted)
    const notes = await ctx.db
      .query("stickyNotes")
      .withIndex("by_assigned_to", (q) => q.eq("assignedTo", currentUser._id))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .filter((q) => q.eq(q.field("isCompleted"), false))
      .collect();

    // Filter for notes with reminders that haven't been triggered yet
    const pendingReminders = notes.filter((note) => {
      if (!note.reminderAt) return false;
      if (note.reminderTriggered) return false;
      return note.reminderAt <= now; // Reminder is due
    });

    return pendingReminders.length;
  },
});

/**
 * Get notes with due reminders (for scheduled function)
 */
export const getDueReminders = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Get all notes (we'll filter for ones with reminders)
    const allNotes = await ctx.db
      .query("stickyNotes")
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .filter((q) => q.eq(q.field("isCompleted"), false))
      .collect();

    // Filter for notes with due reminders that haven't been triggered
    const dueReminders = allNotes.filter((note) => {
      if (!note.reminderAt) return false;
      if (note.reminderTriggered) return false;
      return note.reminderAt <= now;
    });

    // Populate user info
    const remindersWithUsers = await Promise.all(
      dueReminders.map(async (note) => {
        const assignee = await ctx.db.get(note.assignedTo);
        const creator = await ctx.db.get(note.createdBy);
        return {
          ...note,
          assignee: assignee ? { _id: assignee._id, fullName: assignee.fullName } : null,
          creator: creator ? { _id: creator._id, fullName: creator.fullName } : null,
        };
      })
    );

    return remindersWithUsers;
  },
});

// ============================================================================
// Mutations
// ============================================================================

/**
 * Create a new sticky note
 */
export const create = mutation({
  args: {
    assignedTo: v.id("users"),
    title: v.string(),
    content: v.string(),
    color: v.union(
      v.literal("yellow"),
      v.literal("pink"),
      v.literal("blue"),
      v.literal("green"),
      v.literal("purple"),
      v.literal("orange")
    ),
    reminderAt: v.optional(v.number()),
    checklistItems: v.optional(v.array(v.object({
      id: v.string(),
      text: v.string(),
      completed: v.boolean(),
    }))),
    positionX: v.optional(v.number()),
    positionY: v.optional(v.number()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Get current user
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", userId))
      .unique();

    if (!currentUser) throw new Error("User not found");

    // Check permissions: Only managers can create notes for other users
    if (currentUser.role !== "manager" && args.assignedTo !== currentUser._id) {
      throw new Error("Unauthorized: You can only create notes for yourself");
    }

    // Verify assigned user exists
    const assignedUser = await ctx.db.get(args.assignedTo);
    if (!assignedUser) throw new Error("Assigned user not found");

    const now = Date.now();

    // Create note
    const noteId = await ctx.db.insert("stickyNotes", {
      createdBy: currentUser._id,
      assignedTo: args.assignedTo,
      title: args.title,
      content: args.content,
      color: args.color,
      reminderAt: args.reminderAt,
      checklistItems: args.checklistItems,
      positionX: args.positionX,
      positionY: args.positionY,
      width: args.width,
      height: args.height,
      isCompleted: false,
      isDeleted: false,
      reminderTriggered: false,
      isRead: args.assignedTo === currentUser._id, // Mark as read if assigning to self
      createdAt: now,
      updatedAt: now,
    });

    // Send notification if assigned to someone else
    if (args.assignedTo !== currentUser._id) {
      await ctx.db.insert("notifications", {
        userId: args.assignedTo,
        title: "New Sticky Note Assigned",
        message: `${currentUser.fullName} assigned you a new sticky note: "${args.title}"`,
        type: "assignment",
        isRead: false,
        link: "/dashboard?sticky-notes=true", // Query param to trigger opening sticky notes
        metadata: {
          entityId: noteId,
          entityType: "stickyNote",
        },
        createdAt: now,
      });
    }

    return noteId;
  },
});

/**
 * Update a sticky note
 */
export const update = mutation({
  args: {
    noteId: v.id("stickyNotes"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    color: v.optional(
      v.union(
        v.literal("yellow"),
        v.literal("pink"),
        v.literal("blue"),
        v.literal("green"),
        v.literal("purple"),
        v.literal("orange")
      )
    ),
    reminderAt: v.optional(v.number()),
    checklistItems: v.optional(v.array(v.object({
      id: v.string(),
      text: v.string(),
      completed: v.boolean(),
    }))),
    positionX: v.optional(v.number()),
    positionY: v.optional(v.number()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Get current user
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", userId))
      .unique();

    if (!currentUser) throw new Error("User not found");

    // Get note
    const note = await ctx.db.get(args.noteId);
    if (!note) throw new Error("Note not found");

    const isManager = currentUser.role === "manager";
    const isCreator = note.createdBy === currentUser._id;
    const isAssignee = note.assignedTo === currentUser._id;
    const canViewNote = isManager || isAssignee;

    // Check if this is only a position/size update (drag and drop)
    const isOnlyPositionUpdate =
      args.positionX !== undefined ||
      args.positionY !== undefined ||
      args.width !== undefined ||
      args.height !== undefined;

    const hasContentUpdate =
      args.title !== undefined ||
      args.content !== undefined ||
      args.color !== undefined ||
      args.reminderAt !== undefined ||
      args.checklistItems !== undefined;

    // For position/size updates: Allow anyone who can view the note
    if (isOnlyPositionUpdate && !hasContentUpdate) {
      if (!canViewNote) {
        throw new Error("Unauthorized: You can only update notes you can view");
      }
    } else {
      // For content updates: Only assignee can update
      if (!isAssignee) {
        throw new Error("Unauthorized: Only the assigned manager can update this note");
      }
    }

    // Update note
    await ctx.db.patch(args.noteId, {
      ...(args.title !== undefined && { title: args.title }),
      ...(args.content !== undefined && { content: args.content }),
      ...(args.color !== undefined && { color: args.color }),
      ...(args.reminderAt !== undefined && {
        reminderAt: args.reminderAt,
        reminderTriggered: false, // Reset reminder trigger when updating reminder time
      }),
      ...(args.checklistItems !== undefined && { checklistItems: args.checklistItems }),
      ...(args.positionX !== undefined && { positionX: args.positionX }),
      ...(args.positionY !== undefined && { positionY: args.positionY }),
      ...(args.width !== undefined && { width: args.width }),
      ...(args.height !== undefined && { height: args.height }),
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Mark a note as completed
 */
export const complete = mutation({
  args: {
    noteId: v.id("stickyNotes"),
    isCompleted: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Get current user
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", userId))
      .unique();

    if (!currentUser) throw new Error("User not found");

    // Get note
    const note = await ctx.db.get(args.noteId);
    if (!note) throw new Error("Note not found");

    // Check permissions: Only assignee can mark as completed
    if (note.assignedTo !== currentUser._id) {
      throw new Error("Unauthorized: You can only complete notes assigned to you");
    }

    // Update note
    await ctx.db.patch(args.noteId, {
      isCompleted: args.isCompleted,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Delete a sticky note (soft delete)
 */
export const deleteNote = mutation({
  args: {
    noteId: v.id("stickyNotes"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Get current user
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", userId))
      .unique();

    if (!currentUser) throw new Error("User not found");

    // Get note
    const note = await ctx.db.get(args.noteId);
    if (!note) throw new Error("Note not found");

    // Check permissions: Only assignee can delete
    if (note.assignedTo !== currentUser._id) {
      throw new Error("Unauthorized: Only the assigned manager can delete this note");
    }

    // Soft delete
    await ctx.db.patch(args.noteId, {
      isDeleted: true,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Mark reminder as triggered
 */
export const markReminderTriggered = mutation({
  args: {
    noteId: v.id("stickyNotes"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.noteId, {
      reminderTriggered: true,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Get count of unread sticky notes for the current user
 */
export const getUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return 0;

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", userId))
      .unique();

    if (!currentUser) return 0;

    const notes = await ctx.db
      .query("stickyNotes")
      .withIndex("by_assigned_to", (q) => q.eq("assignedTo", currentUser._id))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .filter((q) => q.eq(q.field("isCompleted"), false))
      .filter((q) => q.eq(q.field("isRead"), false))
      .collect();

    return notes.length;
  },
});

/**
 * Mark all notes for the current user as read
 */
export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", userId))
      .unique();

    if (!currentUser) throw new Error("User not found");

    const unreadNotes = await ctx.db
      .query("stickyNotes")
      .withIndex("by_assigned_to", (q) => q.eq("assignedTo", currentUser._id))
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .filter((q) => q.eq(q.field("isCompleted"), false))
      .filter((q) => q.eq(q.field("isRead"), false))
      .collect();

    await Promise.all(
      unreadNotes.map((note) =>
        ctx.db.patch(note._id, { isRead: true })
      )
    );

    return { success: true };
  },
});

