/**
 * Conversation List Component
 * 
 * Shows all users you can chat with. Active conversations appear on top.
 * Like WhatsApp - all contacts in one list.
 */

"use client";

import { useState } from "react";
import { Search, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useChat } from "@/hooks/use-chat";
import { LazyImage } from "@/components/ui/lazy-image";
import { useChattableUsers } from "@/hooks/use-chat";
import { useUserPresence } from "@/hooks/use-presence";
import { OnlineIndicator } from "./online-indicator";
import { format, isToday, isYesterday } from "date-fns";
import { getRoleLabel } from "@/lib/auth/roles";
import { cn } from "@/lib/utils";
import type { Id } from "@/convex/_generated/dataModel";

interface ConversationListProps {
  onSelectUser: (userId: Id<"users">) => void;
  selectedUserId?: Id<"users"> | null;
  className?: string;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatLastMessageTime(timestamp: number): string {
  const date = new Date(timestamp);

  if (isToday(date)) {
    return format(date, "h:mm a");
  } else if (isYesterday(date)) {
    return "Yesterday";
  } else {
    return format(date, "MMM d");
  }
}

interface UserItemProps {
  user: {
    _id: Id<"users">;
    fullName: string;
    username: string;

    role: string;
    profileImage?: string;
  };
  conversation?: {
    lastMessage?: string;
    lastMessageAt?: number;
    unreadCount: number;
  };
  isSelected: boolean;
  onSelect: () => void;
}

function UserItem({ user, conversation, isSelected, onSelect }: UserItemProps) {
  const presence = useUserPresence(user._id);

  return (
    <button
      onClick={onSelect}
      className={cn(
        "w-full flex items-start gap-3 p-4 sm:p-4 rounded-xl transition-all text-left backdrop-blur-sm touch-manipulation",
        "active:scale-[0.98] active:opacity-80",
        isSelected
          ? "bg-primary/10 border border-primary/20 shadow-md"
          : "hover:bg-muted/60 border border-transparent hover:border-border/50 hover:shadow-sm bg-background/50"
      )}
    >
      <div className="relative shrink-0">

        <Avatar className="h-12 w-12 sm:h-13 sm:w-13 ring-2 ring-background shadow-sm overflow-hidden bg-background">
          {user.profileImage ? (
            <LazyImage
              src={user.profileImage}
              alt={user.fullName}
              className="h-full w-full object-cover"
            />
          ) : (
            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
              {getInitials(user.fullName)}
            </AvatarFallback>
          )}
        </Avatar>
        <div className="absolute -bottom-0.5 -right-0.5">
          <OnlineIndicator isOnline={presence?.isOnline ?? false} />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <p className="font-semibold text-sm truncate">{user.fullName}</p>
            <Badge variant="outline" className="shrink-0 text-[10px] px-2 py-0.5 border-border/50 bg-background/50">
              {getRoleLabel(user.role as any)}
            </Badge>
          </div>
          {conversation?.lastMessageAt && (
            <span className="text-[10px] sm:text-xs text-muted-foreground/70 shrink-0 font-medium">
              {formatLastMessageTime(conversation.lastMessageAt)}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className="text-xs sm:text-sm text-muted-foreground truncate">
            {conversation?.lastMessage || (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
                <MessageSquare className="h-3 w-3" />
                Start chatting
              </span>
            )}
          </p>
          {conversation && conversation.unreadCount > 0 && (
            <Badge variant="default" className="shrink-0 h-5 min-w-5 px-1.5 text-[10px] font-semibold bg-primary shadow-sm">
              {conversation.unreadCount > 99 ? "99+" : conversation.unreadCount}
            </Badge>
          )}
        </div>
      </div>
    </button>
  );
}

export function ConversationList({
  onSelectUser,
  selectedUserId,
  className,
}: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { conversations } = useChat();
  const allUsers = useChattableUsers(searchQuery);

  // Create a map of conversations by user ID for quick lookup
  const conversationMap = new Map();
  conversations?.forEach((conv) => {
    if (conv.otherUser) {
      conversationMap.set(conv.otherUser._id, {
        conversationId: conv._id,
        lastMessage: conv.lastMessage,
        lastMessageAt: conv.lastMessageAt,
        unreadCount: conv.unreadCount,
      });
    }
  });

  // Combine users and conversations
  const allItems = (allUsers || []).map((user) => ({
    user,
    conversation: conversationMap.get(user._id),
  }));

  // Sort: Users with conversations first (by lastMessageAt), then alphabetically
  const sortedItems = allItems.sort((a, b) => {
    // Both have conversations - sort by most recent message
    if (a.conversation?.lastMessageAt && b.conversation?.lastMessageAt) {
      return b.conversation.lastMessageAt - a.conversation.lastMessageAt;
    }
    // Only A has conversation - A comes first
    if (a.conversation?.lastMessageAt) return -1;
    // Only B has conversation - B comes first
    if (b.conversation?.lastMessageAt) return 1;
    // Neither has conversation - sort alphabetically
    return a.user.fullName.localeCompare(b.user.fullName);
  });

  return (
    <div className={cn("flex flex-col h-full bg-gradient-to-br from-background via-background to-muted/20", className)}>
      {/* Search Header */}
      <div className="p-3 sm:p-4 md:p-5 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by name or username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 sm:h-11 bg-background/80 backdrop-blur-sm border-border/50 focus:border-primary/50 rounded-xl text-base"
          />
        </div>
      </div>

      {/* User List */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4">
        {sortedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-4 text-center py-16">
            <div className="inline-flex h-16 w-16 rounded-full bg-muted/50 items-center justify-center mb-4">
              <MessageSquare className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm font-semibold mb-1">
              {searchQuery ? "No users found" : "No users available"}
            </p>
            <p className="text-xs text-muted-foreground/70">
              {searchQuery ? "Try a different search term" : "Start a conversation with your team"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {sortedItems.map((item) => (
              <UserItem
                key={item.user._id}
                user={item.user}
                conversation={item.conversation}
                isSelected={selectedUserId === item.user._id}
                onSelect={() => onSelectUser(item.user._id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
