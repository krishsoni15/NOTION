/**
 * useChat Hook
 * 
 * Custom hook for chat operations including conversations, messages, and sending.
 */

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export function useChat() {
  // Queries
  const conversations = useQuery(api.chat.getConversations);
  const unreadCount = useQuery(api.chat.getUnreadCount);
  const chattableUsers = useQuery(api.chat.getChattableUsers, {});

  // Mutations
  const sendMessage = useMutation(api.chat.sendMessage);
  const markAsRead = useMutation(api.chat.markAsRead);
  const getOrCreateConversation = useMutation(api.chat.getOrCreateConversation);

  return {
    // Data
    conversations,
    unreadCount,
    chattableUsers,

    // Actions
    sendMessage,
    markAsRead,
    getOrCreateConversation,
  };
}

/**
 * Hook to get a specific conversation
 */
export function useConversation(conversationId: Id<"conversations"> | null) {
  const conversation = useQuery(
    api.chat.getConversation,
    conversationId ? { conversationId } : "skip"
  );

  return conversation;
}

/**
 * Hook to get messages for a conversation
 */
export function useMessages(conversationId: Id<"conversations"> | null, limit?: number) {
  const messages = useQuery(
    api.chat.getMessages,
    conversationId ? { conversationId, limit } : "skip"
  );

  return messages;
}

/**
 * Hook to search conversations
 */
export function useSearchConversations(searchQuery: string) {
  const results = useQuery(
    api.chat.searchConversations,
    searchQuery ? { searchQuery } : "skip"
  );

  return results;
}

/**
 * Hook to get chattable users with search
 */
export function useChattableUsers(searchQuery?: string) {
  const users = useQuery(api.chat.getChattableUsers, {
    searchQuery,
  });

  return users;
}

