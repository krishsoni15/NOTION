/**
 * Chat Window Component
 * 
 * Main chat interface with conversation list and message view.
 */

"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Info, MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ConversationList } from "./conversation-list";
import { LazyImage } from "@/components/ui/lazy-image";
import { MessageList } from "./message-list";
import { MessageInput } from "./message-input";
import { OnlineIndicator } from "./online-indicator";
import { UserProfile } from "./user-profile";
import { useConversation, useMessages } from "@/hooks/use-chat";
import { useUserPresence } from "@/hooks/use-presence";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getRoleLabel } from "@/lib/auth/roles";
import type { Id } from "@/convex/_generated/dataModel";

interface ChatWindowProps {
  currentUserId: Id<"users">;
  onClose?: () => void;
  className?: string;
}

type View = "conversations" | "chat";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function ChatWindow({ currentUserId, onClose, className }: ChatWindowProps) {
  const [view, setView] = useState<View>("conversations");
  const [selectedUserId, setSelectedUserId] = useState<Id<"users"> | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<Id<"conversations"> | null>(null);
  const [showProfile, setShowProfile] = useState(false);

  const conversation = useConversation(selectedConversationId);
  const messages = useMessages(selectedConversationId);
  const otherUserPresence = useUserPresence(selectedUserId);

  const sendMessage = useMutation(api.chat.sendMessage);
  const markAsRead = useMutation(api.chat.markAsRead);
  const getOrCreateConversation = useMutation(api.chat.getOrCreateConversation);

  // Mark messages as read when conversation is opened or new messages arrive
  useEffect(() => {
    if (selectedConversationId && view === "chat" && messages) {
      const hasUnread = messages.some((m) => !m.isRead);
      if (hasUnread) {
        markAsRead({ conversationId: selectedConversationId }).catch(() => { });
      }
    }
  }, [selectedConversationId, view, messages, markAsRead]);

  const handleSelectUser = async (userId: Id<"users">) => {
    try {
      setSelectedUserId(userId);
      const conversationId = await getOrCreateConversation({ otherUserId: userId });
      setSelectedConversationId(conversationId);
      setView("chat");
    } catch (error) {
      toast.error("Failed to start chat. Please try again.");
    }
  };

  const handleSendMessage = async (
    content: string,
    imageUrl?: string,
    imageKey?: string,
    location?: { lat: number, lng: number, address?: string },
    file?: { url: string, key: string, name: string, type: string, size: number }
  ) => {
    if (!selectedConversationId) return;

    try {
      await sendMessage({
        conversationId: selectedConversationId,
        content,
        imageUrl,
        imageKey,
        location: location ? {
          latitude: location.lat,
          longitude: location.lng,
          address: location.address
        } : undefined,
        fileUrl: file?.url,
        fileKey: file?.key,
        fileName: file?.name,
        fileType: file?.type,
        fileSize: file?.size,
      });
    } catch (error) {
      toast.error("Failed to send message. Please try again.");
    }
  };

  const handleBack = () => {
    setView("conversations");
    setSelectedConversationId(null);
    setSelectedUserId(null);
  };

  return (
    <div className={cn("flex flex-col h-full bg-gradient-to-br from-background via-background to-muted/20 overflow-hidden", className)}>
      {/* Header */}
      <div className="relative flex items-center gap-2 sm:gap-3 py-3 sm:py-4 px-4 border-b border-border/50 bg-background/80 backdrop-blur-md shrink-0 shadow-sm">
        {/* Back Button (when in chat view) */}
        {view === "chat" && (
          <Button
            onClick={handleBack}
            size="icon"
            variant="ghost"
            className="shrink-0 h-8 w-8 hover:bg-muted/80 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Button>
        )}

        {/* Title / User Info */}
        <div className="flex-1 min-w-0 pr-2">
          {view === "conversations" && (
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                <MessageCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Messages
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">Chat with your team</p>
              </div>
            </div>
          )}
          {view === "chat" && conversation?.otherUser && (
            <button
              onClick={() => setShowProfile(true)}
              className="flex items-center gap-3 hover:bg-muted/60 rounded-xl p-2.5 -m-2.5 transition-all text-left w-full group"
            >
              <Avatar className="h-11 w-11 ring-2 ring-background shadow-sm overflow-hidden bg-background">
                {conversation.otherUser.profileImage ? (
                  <LazyImage
                    src={conversation.otherUser.profileImage}
                    alt={conversation.otherUser.fullName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <AvatarFallback className="text-sm bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
                    {getInitials(conversation.otherUser.fullName)}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <p className="font-semibold text-base truncate">{conversation.otherUser.fullName}</p>
                  <Badge variant="outline" className="shrink-0 text-[10px] px-2 py-0.5 border-border/50 bg-background/50">
                    {getRoleLabel(conversation.otherUser.role as any)}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <OnlineIndicator
                    isOnline={otherUserPresence?.isOnline ?? false}
                    className="scale-90"
                  />
                  <span className="text-xs text-muted-foreground font-medium">
                    {otherUserPresence?.isOnline ? "Online" : "Offline"}
                  </span>
                </div>
              </div>
              <Info className="h-5 w-5 text-muted-foreground shrink-0 group-hover:text-foreground transition-colors" />
            </button>
          )}
        </div>

        {/* Close Button */}
        {onClose && (
          <Button
            onClick={onClose}
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0 hover:bg-muted/80 rounded-lg transition-colors"
            title="Close chat"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {view === "conversations" && (
          <ConversationList
            onSelectUser={handleSelectUser}
            selectedUserId={selectedUserId}
          />
        )}

        {view === "chat" && (
          <div className="flex flex-col h-full">
            {messages === undefined ? (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-muted-foreground">Loading messages...</p>
              </div>
            ) : (
              <>
                <MessageList
                  messages={messages}
                  currentUserId={currentUserId}
                  otherUserId={conversation?.otherUser?._id}
                />
                <MessageInput
                  onSend={handleSendMessage}
                  placeholder="Type a message..."
                />
              </>
            )}
          </div>
        )}
      </div>

      {/* User Profile Modal */}
      {showProfile && conversation?.otherUser && (
        <UserProfile
          user={conversation.otherUser}
          isOnline={otherUserPresence?.isOnline ?? false}
          onClose={() => setShowProfile(false)}
        />
      )}
    </div>
  );
}

