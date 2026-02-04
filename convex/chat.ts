/**
 * Chat Functions
 * 
 * Handles all chat-related operations including conversations, messages,
 * and role-based permissions.
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc, Id } from "./_generated/dataModel";

/**
 * Check if a user with a given role can chat with another user with a given role
 */
function canChatWith(userRole: string, targetRole: string): boolean {
  // Site Engineers can chat with Purchase Officers and Managers
  // But NOT with other Site Engineers
  if (userRole === "site_engineer") {
    return targetRole === "purchase_officer" || targetRole === "manager";
  }

  // Purchase Officers can chat with everyone
  if (userRole === "purchase_officer") {
    return true;
  }

  // Managers can chat with everyone
  if (userRole === "manager") {
    return true;
  }

  return false;
}

/**
 * Get or create a conversation between two users
 */
export const getOrCreateConversation = mutation({
  args: {
    otherUserId: v.id("users"),
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

    // Get other user
    const otherUser = await ctx.db.get(args.otherUserId);
    if (!otherUser) throw new Error("Other user not found");

    // Check if chat is allowed
    if (!canChatWith(currentUser.role, otherUser.role)) {
      throw new Error("Chat not allowed between these roles");
    }

    // Check if conversation already exists between these two users
    const allConversations = await ctx.db.query("conversations").collect();
    const existingConversation = allConversations.find((conv) => {
      if (conv.participants.length !== 2) return false;
      return (
        (conv.participants[0] === currentUser._id && conv.participants[1] === args.otherUserId) ||
        (conv.participants[0] === args.otherUserId && conv.participants[1] === currentUser._id)
      );
    });

    if (existingConversation) {
      return existingConversation._id;
    }

    // Create new conversation
    const now = Date.now();
    const conversationId = await ctx.db.insert("conversations", {
      participants: [currentUser._id, args.otherUserId],
      unreadCount: {},
      createdAt: now,
      updatedAt: now,
    });

    return conversationId;
  },
});

/**
 * Get all conversations for the current user
 */
export const getConversations = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Get current user
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", userId))
      .unique();

    if (!currentUser) return [];

    // Get all conversations and filter for ones where user is a participant
    const allConversations = await ctx.db
      .query("conversations")
      .order("desc")
      .collect();

    const conversations = allConversations.filter((conv) =>
      conv.participants.includes(currentUser._id)
    );

    // Enrich conversations with other user's data
    const enrichedConversations = await Promise.all(
      conversations.map(async (conversation) => {
        const otherUserId = conversation.participants.find(
          (id) => id !== currentUser._id
        );
        const otherUser = otherUserId ? await ctx.db.get(otherUserId) : null;

        // Get unread count for current user
        const unreadCount = (conversation.unreadCount as any)[currentUser._id] || 0;

        return {
          ...conversation,
          otherUser: otherUser
            ? {
              _id: otherUser._id,
              fullName: otherUser.fullName,
              role: otherUser.role,
              username: otherUser.username,
              profileImage: otherUser.profileImage,
            }
            : null,
          unreadCount,
        };
      })
    );

    // Sort by lastMessageAt (most recent first)
    return enrichedConversations.sort((a, b) => {
      const aTime = a.lastMessageAt || a.createdAt;
      const bTime = b.lastMessageAt || b.createdAt;
      return bTime - aTime;
    });
  },
});

/**
 * Get a specific conversation by ID
 */
export const getConversation = query({
  args: {
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    // Get current user
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", userId))
      .unique();

    if (!currentUser) return null;

    // Get conversation
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return null;

    // Check if user is a participant
    if (!conversation.participants.includes(currentUser._id)) {
      throw new Error("Not authorized to view this conversation");
    }

    // Get other user
    const otherUserId = conversation.participants.find(
      (id) => id !== currentUser._id
    );
    const otherUser = otherUserId ? await ctx.db.get(otherUserId) : null;

    return {
      ...conversation,
      otherUser: otherUser
        ? {
          _id: otherUser._id,
          fullName: otherUser.fullName,
          role: otherUser.role,
          username: otherUser.username,
          phoneNumber: otherUser.phoneNumber,
          address: otherUser.address,
          profileImage: otherUser.profileImage,
        }
        : null,
    };
  },
});

/**
 * Get messages for a conversation
 */
export const getMessages = query({
  args: {
    conversationId: v.id("conversations"),
    limit: v.optional(v.number()),
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

    // Get conversation
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) return [];

    // Check if user is a participant
    if (!conversation.participants.includes(currentUser._id)) {
      throw new Error("Not authorized to view this conversation");
    }

    // Get messages
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversation_created", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .order("desc")
      .take(args.limit || 100);

    // Get other user ID for delivery status
    const otherUserId = conversation.participants.find(
      (id) => id !== currentUser._id
    );

    // Enrich messages with sender data
    const enrichedMessages = await Promise.all(
      messages.map(async (message) => {
        const sender = await ctx.db.get(message.senderId);
        return {
          ...message,
          sender: sender
            ? {
              _id: sender._id,
              fullName: sender.fullName,
              role: sender.role,
              username: sender.username,
              profileImage: sender.profileImage,
            }
            : null,
          isRead: message.readBy.includes(currentUser._id),
          isDelivered: otherUserId
            ? (message.deliveredBy || []).includes(otherUserId)
            : false,
        };
      })
    );

    // Return in chronological order (oldest first)
    return enrichedMessages.reverse();
  },
});

/**
 * Send a message
 */
export const sendMessage = mutation({
  args: {
    conversationId: v.id("conversations"),
    content: v.string(),
    imageUrl: v.optional(v.string()),
    imageKey: v.optional(v.string()),
    fileUrl: v.optional(v.string()), // Generic file attachment
    fileKey: v.optional(v.string()),
    fileName: v.optional(v.string()),
    fileType: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    location: v.optional(v.object({
      latitude: v.number(),
      longitude: v.number(),
      address: v.optional(v.string()),
    })),
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

    // Get conversation
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");

    // Check if user is a participant
    if (!conversation.participants.includes(currentUser._id)) {
      throw new Error("Not authorized to send messages in this conversation");
    }

    // Validate content - allow either text content, image, or location
    const trimmedContent = args.content.trim();
    const hasContent = trimmedContent || args.imageUrl || args.location || args.fileUrl;

    if (!hasContent) {
      throw new Error("Message content cannot be empty");
    }

    if (trimmedContent.length > 5000) {
      throw new Error("Message content too long (max 5000 characters)");
    }

    // Check if receiver is online (for delivery status)
    const otherUserId = conversation.participants.find(
      (id) => id !== currentUser._id
    );
    let deliveredBy: Id<"users">[] = [currentUser._id]; // Sender has delivered their own message

    if (otherUserId) {
      // Check if other user is online
      const otherUserPresence = await ctx.db
        .query("userPresence")
        .withIndex("by_user_id", (q) => q.eq("userId", otherUserId))
        .unique();

      // If receiver is online, mark as delivered immediately
      if (otherUserPresence?.isOnline) {
        deliveredBy.push(otherUserId);
      }
    }

    // Create message
    const now = Date.now();
    const messageId = await ctx.db.insert("messages", {
      conversationId: args.conversationId,
      senderId: currentUser._id,
      content: trimmedContent,
      imageUrl: args.imageUrl,
      imageKey: args.imageKey,
      fileUrl: args.fileUrl,
      fileKey: args.fileKey,
      fileName: args.fileName,
      fileType: args.fileType,
      fileSize: args.fileSize,
      location: args.location,
      readBy: [currentUser._id], // Sender has read their own message
      deliveredBy: deliveredBy,
      createdAt: now,
    });

    // Update conversation
    // otherUserId is already declared above, reuse it
    const currentUnreadCount = (conversation.unreadCount as any) || {};
    const otherUserUnreadCount = currentUnreadCount[otherUserId as string] || 0;

    await ctx.db.patch(args.conversationId, {
      lastMessageAt: now,
      lastMessage: trimmedContent.substring(0, 100), // Preview
      lastMessageSenderId: currentUser._id,
      unreadCount: {
        ...currentUnreadCount,
        [currentUser._id as string]: 0, // Reset sender's unread count
        [otherUserId as string]: otherUserUnreadCount + 1, // Increment other user's unread count
      },
      updatedAt: now,
    });

    // Send notification to the recipient
    if (otherUserId) {
      await ctx.db.insert("notifications", {
        userId: otherUserId,
        title: "New Message",
        message: `${currentUser.fullName}: ${trimmedContent.substring(0, 50)}${trimmedContent.length > 50 ? "..." : ""}`,
        type: "info",
        isRead: false,
        link: `/dashboard?chat=${args.conversationId}`, // Or wherever chat opens
        metadata: {
          entityId: args.conversationId,
          entityType: "conversation",
        },
        createdAt: now,
      });
    }

    return messageId;
  },
});

/**
 * Mark messages as read
 */
export const markAsRead = mutation({
  args: {
    conversationId: v.id("conversations"),
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

    // Get conversation
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) throw new Error("Conversation not found");

    // Check if user is a participant
    if (!conversation.participants.includes(currentUser._id)) {
      throw new Error("Not authorized");
    }

    // Get all messages in this conversation
    const allMessages = await ctx.db
      .query("messages")
      .withIndex("by_conversation_id", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    // Mark all messages as delivered (if not already) and read
    await Promise.all(
      allMessages.map((message) => {
        const currentDeliveredBy = message.deliveredBy || [];
        const currentReadBy = message.readBy;
        const isDelivered = currentDeliveredBy.includes(currentUser._id);
        const isRead = currentReadBy.includes(currentUser._id);

        // Always mark as delivered when user opens conversation
        const newDeliveredBy = isDelivered
          ? currentDeliveredBy
          : [...currentDeliveredBy, currentUser._id];

        // Mark as read if not already read
        const newReadBy = isRead
          ? currentReadBy
          : [...currentReadBy, currentUser._id];

        return ctx.db.patch(message._id, {
          readBy: newReadBy,
          deliveredBy: newDeliveredBy,
        });
      })
    );

    // Reset unread count for current user
    const currentUnreadCount = (conversation.unreadCount as any) || {};
    await ctx.db.patch(args.conversationId, {
      unreadCount: {
        ...currentUnreadCount,
        [currentUser._id as string]: 0,
      },
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Get list of users that current user can chat with
 */
export const getChattableUsers = query({
  args: {
    searchQuery: v.optional(v.string()),
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

    // Get all active users
    const allUsers = await ctx.db
      .query("users")
      .withIndex("by_is_active", (q) => q.eq("isActive", true))
      .collect();

    // Filter users based on chat permissions
    const chattableUsers = allUsers.filter((user) => {
      // Don't include current user
      if (user._id === currentUser._id) return false;

      // Check if chat is allowed
      return canChatWith(currentUser.role, user.role);
    });

    // Apply search filter if provided
    let filteredUsers = chattableUsers;
    if (args.searchQuery) {
      const query = args.searchQuery.toLowerCase();
      filteredUsers = chattableUsers.filter(
        (user) =>
          user.fullName.toLowerCase().includes(query) ||
          user.username.toLowerCase().includes(query)
      );
    }

    // Return user info with contact details
    return filteredUsers.map((user) => ({
      _id: user._id,
      fullName: user.fullName,
      username: user.username,
      role: user.role,
      phoneNumber: user.phoneNumber,
      address: user.address,
      profileImage: user.profileImage,
    }));
  },
});

/**
 * Search conversations by user name
 */
export const searchConversations = query({
  args: {
    searchQuery: v.string(),
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

    // Get all conversations and filter for user's conversations
    const allConversations = await ctx.db.query("conversations").collect();
    const conversations = allConversations.filter((conv) =>
      conv.participants.includes(currentUser._id)
    );

    // Enrich and filter conversations - normalize search query
    const query = args.searchQuery.trim().replace(/\s+/g, " ").toLowerCase();
    const enrichedConversations = await Promise.all(
      conversations.map(async (conversation) => {
        const otherUserId = conversation.participants.find(
          (id) => id !== currentUser._id
        );
        const otherUser = otherUserId ? await ctx.db.get(otherUserId) : null;

        if (!otherUser) return null;

        // Check if search query matches
        const matches =
          otherUser.fullName.toLowerCase().includes(query) ||
          otherUser.username.toLowerCase().includes(query);

        if (!matches) return null;

        const unreadCount = (conversation.unreadCount as any)[currentUser._id] || 0;

        return {
          ...conversation,
          otherUser: {
            _id: otherUser._id,
            fullName: otherUser.fullName,
            role: otherUser.role,
            username: otherUser.username,
            profileImage: otherUser.profileImage,
          },
          unreadCount,
        };
      })
    );

    // Filter out nulls and sort by lastMessageAt
    const filteredConversations = enrichedConversations.filter(
      (c) => c !== null
    ) as any[];

    return filteredConversations.sort((a, b) => {
      const aTime = a.lastMessageAt || a.createdAt;
      const bTime = b.lastMessageAt || b.createdAt;
      return bTime - aTime;
    });
  },
});

/**
 * Get total unread message count for current user
 */
export const getUnreadCount = query({
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

    // Get all conversations and filter for ones where user is a participant
    const allConversations = await ctx.db.query("conversations").collect();
    const userConversations = allConversations.filter((conv) =>
      conv.participants.includes(currentUser._id)
    );

    // Sum up unread counts
    const totalUnread = userConversations.reduce((sum, conversation) => {
      const unreadCount = (conversation.unreadCount as any)[currentUser._id] || 0;
      return sum + unreadCount;
    }, 0);

    return totalUnread;
  },
});

/**
 * Get dashboard stats for site engineers
 */
export const getSiteEngineerStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { total: 0, pending: 0, approved: 0, delivered: 0 };

    // Get current user
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", userId))
      .unique();

    if (!currentUser || currentUser.role !== "site_engineer") {
      return { total: 0, pending: 0, approved: 0, delivered: 0 };
    }

    // Get all requests created by this user
    const userRequests = await ctx.db
      .query("requests")
      .withIndex("by_created_by", (q) => q.eq("createdBy", currentUser._id))
      .collect();

    // Count by status
    const stats = {
      total: userRequests.length,
      pending: userRequests.filter(r => r.status === "pending").length,
      approved: userRequests.filter(r => r.status === "approved").length,
      delivered: userRequests.filter(r => r.status === "delivered").length,
    };

    return stats;
  },
});

