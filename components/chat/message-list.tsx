/**
 * Message List Component
 * 
 * Displays messages with timestamps, read receipts, and auto-scroll.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { format, isToday, isYesterday } from "date-fns";
import { MessageSquare } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ReadReceipt } from "./read-receipt";
import { cn } from "@/lib/utils";

interface Message {
  _id: string;
  content: string;
  createdAt: number;
  senderId: string;
  isRead: boolean;
  isDelivered?: boolean;
  readBy: string[];
  deliveredBy?: string[];
  sender: {
    _id: string;
    fullName: string;
    username: string;
    role: string;
  } | null;
}

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  otherUserId?: string | null; // The other user in the conversation (for read receipts)
  className?: string;
}

function formatMessageTime(timestamp: number): string {
  const date = new Date(timestamp);
  
  if (isToday(date)) {
    return format(date, "h:mm a");
  } else if (isYesterday(date)) {
    return `Yesterday ${format(date, "h:mm a")}`;
  } else {
    return format(date, "MMM d, h:mm a");
  }
}

function formatDateSeparator(timestamp: number): string {
  const date = new Date(timestamp);
  
  if (isToday(date)) {
    return "Today";
  } else if (isYesterday(date)) {
    return "Yesterday";
  } else {
    return format(date, "MMMM d, yyyy");
  }
}

function shouldShowDateSeparator(
  currentMessage: Message,
  previousMessage: Message | null
): boolean {
  if (!previousMessage) return true;
  
  const currentDate = new Date(currentMessage.createdAt);
  const previousDate = new Date(previousMessage.createdAt);
  
  return currentDate.toDateString() !== previousDate.toDateString();
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function MessageList({ messages, currentUserId, otherUserId, className }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (isFirstLoad) {
      // Instant scroll on first load
      messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
      setIsFirstLoad(false);
    } else {
      // Smooth scroll for new messages
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isFirstLoad]);

  if (messages.length === 0) {
    return (
      <div className={cn("flex-1 flex items-center justify-center p-8", className)}>
        <div className="text-center space-y-3">
          <div className="inline-flex h-16 w-16 rounded-full bg-muted/50 items-center justify-center mb-2">
            <MessageSquare className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground font-semibold">
            No messages yet
          </p>
          <p className="text-sm text-muted-foreground/70">
            Start the conversation!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn("flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 bg-gradient-to-b from-background via-background to-muted/10", className)}
    >
      {messages.map((message, index) => {
        const isOwnMessage = message.senderId === currentUserId;
        const previousMessage = index > 0 ? messages[index - 1] : null;
        const showDateSeparator = shouldShowDateSeparator(message, previousMessage);
        const isConsecutive = previousMessage && 
          previousMessage.senderId === message.senderId && 
          message.createdAt - previousMessage.createdAt < 60000; // Same sender within 1 minute

        return (
          <div key={message._id}>
            {/* Date Separator */}
            {showDateSeparator && (
              <div className="flex items-center justify-center my-8">
                <div className="bg-muted/80 backdrop-blur-md px-4 py-2 rounded-full text-xs font-medium text-muted-foreground border border-border/50 shadow-sm">
                  {formatDateSeparator(message.createdAt)}
                </div>
              </div>
            )}

            {/* Message */}
            <div
              className={cn(
                "flex gap-3 sm:gap-4",
                isOwnMessage ? "flex-row-reverse" : "flex-row"
              )}
            >
              {/* Avatar */}
              {!isOwnMessage && (
                <Avatar className={cn(
                  "h-9 w-9 shrink-0 transition-opacity shadow-sm",
                  isConsecutive ? "opacity-0" : "opacity-100"
                )}>
                  <AvatarFallback className="text-xs bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-medium">
                    {message.sender ? getInitials(message.sender.fullName) : "?"}
                  </AvatarFallback>
                </Avatar>
              )}

              {/* Message Content */}
              <div
                className={cn(
                  "flex flex-col gap-1.5 max-w-[85%] sm:max-w-[75%] md:max-w-[70%]",
                  isOwnMessage ? "items-end" : "items-start"
                )}
              >
                {/* Sender Name (for other users) */}
                {!isOwnMessage && message.sender && !isConsecutive && (
                  <span className="text-xs font-semibold text-muted-foreground px-2 mb-0.5">
                    {message.sender.fullName}
                  </span>
                )}

                {/* Message Bubble */}
                <div
                  className={cn(
                    "rounded-2xl px-3 py-2.5 sm:px-4 sm:py-3 break-words shadow-md transition-all backdrop-blur-sm",
                    isOwnMessage
                      ? "bg-primary text-primary-foreground shadow-primary/30 hover:shadow-lg"
                      : "bg-card/90 border border-border/50 hover:shadow-lg"
                  )}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                </div>

                {/* Timestamp and Read Receipt */}
                <div
                  className={cn(
                    "flex items-center gap-1.5 px-2 mt-0.5",
                    isOwnMessage ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  <span className="text-[10px] sm:text-xs text-muted-foreground/70 font-medium">
                    {formatMessageTime(message.createdAt)}
                  </span>
                  {isOwnMessage && (
                    <ReadReceipt 
                      isRead={otherUserId ? message.readBy.includes(otherUserId) : false}
                      isDelivered={otherUserId ? (message.deliveredBy || []).includes(otherUserId) : false}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
}

