import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Convex Database Schema
 * 
 * Defines all tables for the NOTION CRM system.
 */

export default defineSchema({
  // ============================================================================
  // Users Table
  // ============================================================================
  users: defineTable({
    clerkUserId: v.string(), // Clerk user ID (unique)
    username: v.string(), // Username for login (unique)
    fullName: v.string(),
    phoneNumber: v.string(),
    address: v.string(),
    role: v.union(
      v.literal("site_engineer"),
      v.literal("manager"),
      v.literal("purchase_officer")
    ),
    assignedSites: v.optional(v.array(v.id("sites"))), // Sites assigned to site engineers
    isActive: v.boolean(),
    createdBy: v.optional(v.id("users")), // Manager who created this user (null for first manager)
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_user_id", ["clerkUserId"])
    .index("by_username", ["username"])
    .index("by_role", ["role"])
    .index("by_is_active", ["isActive"]),

  // ============================================================================
  // Requests Table
  // ============================================================================
  requests: defineTable({
    requestNumber: v.string(), // Auto-generated unique identifier
    createdBy: v.id("users"), // Site Engineer
    items: v.array(
      v.object({
        name: v.string(),
        quantity: v.number(),
        unit: v.string(),
        description: v.optional(v.string()),
      })
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
      v.literal("delivered")
    ),
    approvedBy: v.optional(v.id("users")), // Manager
    approvedAt: v.optional(v.number()),
    rejectionReason: v.optional(v.string()),
    deliveryMarkedAt: v.optional(v.number()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_request_number", ["requestNumber"])
    .index("by_created_by", ["createdBy"])
    .index("by_status", ["status"])
    .index("by_created_at", ["createdAt"]),

  // ============================================================================
  // Purchase Orders Table
  // ============================================================================
  purchaseOrders: defineTable({
    poNumber: v.string(), // Auto-generated unique identifier
    requestId: v.id("requests"), // Linked request
    vendorId: v.id("vendors"),
    createdBy: v.id("users"), // Purchase Officer
    items: v.array(
      v.object({
        name: v.string(),
        quantity: v.number(),
        unit: v.string(),
        unitPrice: v.number(),
        totalPrice: v.number(),
      })
    ),
    totalAmount: v.number(),
    status: v.union(
      v.literal("draft"),
      v.literal("sent"),
      v.literal("received"),
      v.literal("completed")
    ),
    expectedDeliveryDate: v.number(),
    actualDeliveryDate: v.optional(v.number()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_po_number", ["poNumber"])
    .index("by_request_id", ["requestId"])
    .index("by_vendor_id", ["vendorId"])
    .index("by_created_by", ["createdBy"])
    .index("by_status", ["status"])
    .index("by_created_at", ["createdAt"]),

  // ============================================================================
  // Vendors Table
  // ============================================================================
  vendors: defineTable({
    companyName: v.string(), // Company Name
    email: v.string(), // Email
    phone: v.optional(v.string()), // Phone (optional)
    gstNumber: v.string(), // GST Number
    address: v.string(), // Address
    isActive: v.boolean(),
    createdBy: v.id("users"), // Purchase Officer
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_company_name", ["companyName"])
    .index("by_is_active", ["isActive"])
    .index("by_created_at", ["createdAt"]),

  // ============================================================================
  // Inventory Table
  // ============================================================================
  inventory: defineTable({
    itemName: v.string(), // Item Name
    unit: v.optional(v.string()), // Unit (e.g., bags, kg, mm, gm, nos, ton) - optional
    centralStock: v.optional(v.number()), // Central Stock quantity - optional
    vendorId: v.optional(v.id("vendors")), // Linked vendor - optional
    images: v.optional(v.array(v.object({
      imageUrl: v.string(), // Cloudflare R2 public URL
      imageKey: v.string(), // R2 object key for deletion/updates
      uploadedBy: v.id("users"), // User who uploaded the image
      uploadedAt: v.number(), // Upload timestamp
    }))), // Array of images (supports multiple images)
    isActive: v.boolean(),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_item_name", ["itemName"])
    .index("by_vendor_id", ["vendorId"])
    .index("by_is_active", ["isActive"])
    .index("by_created_at", ["createdAt"]),

  // ============================================================================
  // Chat Conversations Table
  // ============================================================================
  conversations: defineTable({
    participants: v.array(v.id("users")), // Always 2 users for one-on-one chats
    lastMessageAt: v.optional(v.number()),
    lastMessage: v.optional(v.string()),
    lastMessageSenderId: v.optional(v.id("users")),
    unreadCount: v.any(), // Dynamic object mapping userId to unread count { "userId": count }
    mutedBy: v.optional(v.array(v.id("users"))), // Users who muted this conversation
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_participants", ["participants"])
    .index("by_last_message_at", ["lastMessageAt"]),

  // ============================================================================
  // Chat Messages Table
  // ============================================================================
  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    content: v.string(),
    readBy: v.array(v.id("users")), // Users who have read this message
    deliveredBy: v.optional(v.array(v.id("users"))), // Users who have received/delivered this message
    createdAt: v.number(),
  })
    .index("by_conversation_id", ["conversationId"])
    .index("by_conversation_created", ["conversationId", "createdAt"])
    .index("by_sender_id", ["senderId"]),

  // ============================================================================
  // User Presence Table
  // ============================================================================
  userPresence: defineTable({
    userId: v.id("users"),
    isOnline: v.boolean(),
    lastSeenAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_is_online", ["isOnline"]),

  // ============================================================================
  // Sticky Notes Table
  // ============================================================================
  stickyNotes: defineTable({
    createdBy: v.id("users"), // User who created the note
    assignedTo: v.id("users"), // User who should see the note (can be different for managers)
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
    reminderAt: v.optional(v.number()), // Optional timestamp for reminder notification
    isCompleted: v.boolean(),
    isDeleted: v.boolean(),
    reminderTriggered: v.optional(v.boolean()), // Track if reminder was already triggered
    // Checklist items for todo functionality
    checklistItems: v.optional(v.array(v.object({
      id: v.string(),
      text: v.string(),
      completed: v.boolean(),
    }))),
    // Position and size for draggable/resizable sticky notes
    positionX: v.optional(v.number()), // X position on screen
    positionY: v.optional(v.number()), // Y position on screen
    width: v.optional(v.number()), // Width of the note
    height: v.optional(v.number()), // Height of the note
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_assigned_to", ["assignedTo"])
    .index("by_created_by", ["createdBy"])
    .index("by_reminder_at", ["reminderAt"])
    .index("by_is_deleted", ["isDeleted"])
    .index("by_is_completed", ["isCompleted"]),

  // ============================================================================
  // Sites Table
  // ============================================================================
  sites: defineTable({
    name: v.string(), // Site name
    code: v.optional(v.string()), // Site code/identifier
    address: v.optional(v.string()), // Site address
    description: v.optional(v.string()), // Site description
    isActive: v.boolean(),
    createdBy: v.id("users"), // Manager who created this site
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_name", ["name"])
    .index("by_is_active", ["isActive"])
    .index("by_created_at", ["createdAt"]),
});

