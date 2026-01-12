/**
 * Message List Component
 * 
 * Displays messages with timestamps, read receipts, and auto-scroll.
 * Supports image grouping (grid layout) for consecutive images.
 */

"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { format, isToday, isYesterday } from "date-fns";
import { MessageSquare, MapPin, ExternalLink, Map as MapIcon, FileText, Download, Eye, X } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ReadReceipt } from "./read-receipt";
import dynamic from "next/dynamic";
const LocationMessage = dynamic(() => import("@/components/chat/location-message").then(mod => mod.LocationMessage), { ssr: false });
import { cn } from "@/lib/utils";
import { ImageGallery } from "@/components/ui/image-gallery";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Message {
  _id: string;
  content: string;
  imageUrl?: string;
  imageKey?: string;
  fileUrl?: string;
  fileKey?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
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
  const [previewPdf, setPreviewPdf] = useState<{ url: string, name: string } | null>(null);

  // Gallery state
  const [galleryState, setGalleryState] = useState<{
    open: boolean;
    startIndex: number;
    images: Array<{ imageUrl: string; imageKey: string }>;
  }>({
    open: false,
    startIndex: 0,
    images: [],
  });

  // Collect all images from messages for the gallery navigation
  const allChatImages = messages
    .filter(m => m.imageUrl)
    .map(m => ({
      imageUrl: m.imageUrl!,
      imageKey: m._id,
      alt: "Shared image"
    }));

  // Auto-scroll logic (existing)
  useEffect(() => {
    if (isFirstLoad) {
      messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
      setIsFirstLoad(false);
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isFirstLoad]);

  const handleImageClick = (imageUrl: string) => {
    const index = allChatImages.findIndex(img => img.imageUrl === imageUrl);
    if (index !== -1) {
      setGalleryState({
        open: true,
        startIndex: index,
        images: allChatImages
      });
    }
  };

  const handleLocationClick = (lat: number, lng: number) => {
    window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
  };

  const handleFileClick = (url: string, name: string, type?: string) => {
    if (type === 'application/pdf') {
      setPreviewPdf({ url, name });
    } else {
      window.open(url, '_blank');
    }
  };

  // Group messages for grid display
  const clusteredMessages = useMemo(() => {
    const clusters: Array<{ type: 'group' | 'single', senderId: string, messages: Message[], id: string }> = [];

    let currentGroup: Message[] = [];

    messages.forEach((msg, i) => {
      const prevMsg = i > 0 ? messages[i - 1] : null;

      // Determine if we should start a new group or add to existing
      // We only group contiguous image-only messages from same sender within similar timeframe
      const isImageOnly = msg.imageUrl && !msg.content;
      const isSameSender = prevMsg ? prevMsg.senderId === msg.senderId : true;
      const isWithinTimeWindow = prevMsg ? msg.createdAt - prevMsg.createdAt < 60000 : true; // 1 min

      if (isImageOnly && isSameSender && isWithinTimeWindow) {
        currentGroup.push(msg);
      } else {
        // Flush previous group if exists
        if (currentGroup.length > 0) {
          clusters.push({
            type: currentGroup.length > 1 ? 'group' : 'single',
            senderId: currentGroup[0].senderId,
            messages: [...currentGroup],
            id: currentGroup[0]._id
          });
          currentGroup = [];
        }

        // If current is image, start new group, else push single
        if (isImageOnly) {
          currentGroup.push(msg);
        } else {
          clusters.push({
            type: 'single',
            senderId: msg.senderId,
            messages: [msg],
            id: msg._id
          });
        }
      }
    });

    // Flush final group
    if (currentGroup.length > 0) {
      clusters.push({
        type: currentGroup.length > 1 ? 'group' : 'single',
        senderId: currentGroup[0].senderId,
        messages: currentGroup,
        id: currentGroup[0]._id
      });
    }

    return clusters;
  }, [messages]);

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
    <>
      <div
        ref={containerRef}
        className={cn("flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 bg-gradient-to-b from-background via-background to-muted/10", className)}
      >
        {clusteredMessages.map((cluster, index) => {
          const firstMessage = cluster.messages[0];
          const isOwnMessage = firstMessage.senderId === currentUserId;
          const previousCluster = index > 0 ? clusteredMessages[index - 1] : null;
          const previousMessage = previousCluster ? previousCluster.messages[previousCluster.messages.length - 1] : null;

          const showDateSeparator = shouldShowDateSeparator(firstMessage, previousMessage);

          // Check strict consecutiveness for avatar hiding
          const isConsecutive = previousMessage &&
            previousMessage.senderId === firstMessage.senderId &&
            firstMessage.createdAt - previousMessage.createdAt < 60000;

          return (
            <div key={cluster.id}>
              {/* Date Separator */}
              {showDateSeparator && (
                <div className="flex items-center justify-center my-8">
                  <div className="bg-muted/80 backdrop-blur-md px-4 py-2 rounded-full text-xs font-medium text-muted-foreground border border-border/50 shadow-sm">
                    {formatDateSeparator(firstMessage.createdAt)}
                  </div>
                </div>
              )}

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
                      {firstMessage.sender ? getInitials(firstMessage.sender.fullName) : "?"}
                    </AvatarFallback>
                  </Avatar>
                )}

                {/* Content Area */}
                <div
                  className={cn(
                    "flex flex-col gap-1.5 max-w-[85%] sm:max-w-[75%] md:max-w-[70%]",
                    isOwnMessage ? "items-end" : "items-start"
                  )}
                >
                  {/* Sender Name */}
                  {!isOwnMessage && firstMessage.sender && !isConsecutive && (
                    <span className="text-xs font-semibold text-muted-foreground px-2 mb-0.5">
                      {firstMessage.sender.fullName}
                    </span>
                  )}

                  {/* Message/Grid Render */}
                  {cluster.type === 'group' ? (
                    /* Grid Layout for Multiple Images */
                    <div className={cn(
                      "grid gap-1 rounded-2xl overflow-hidden",
                      // Smart grid layout based on count
                      cluster.messages.length >= 2 ? "grid-cols-2" : "grid-cols-1",
                      // Max width constraints for grid to not be huge
                      "max-w-xs sm:max-w-sm"
                    )}>
                      {cluster.messages.map((msg, i) => (
                        <div
                          key={msg._id}
                          className={cn(
                            "relative aspect-square cursor-pointer overflow-hidden bg-muted",
                            // Handle 3 items: last one spans 2 cols
                            cluster.messages.length === 3 && i === 2 ? "col-span-2 aspect-[2/1]" : ""
                          )}
                          onClick={() => handleImageClick(msg.imageUrl!)}
                        >
                          <img
                            src={msg.imageUrl}
                            alt="Shared image"
                            className="w-full h-full object-cover hover:scale-105 transition-transform"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Single Message */
                    <div
                      className={cn(
                        "rounded-2xl px-3 py-2.5 sm:px-4 sm:py-3 break-words shadow-md transition-all backdrop-blur-sm",
                        isOwnMessage
                          ? firstMessage.imageUrl
                            ? "bg-transparent text-foreground shadow-sm p-0 overflow-hidden" // Single Image
                            : firstMessage.location || firstMessage.fileUrl
                              ? "bg-transparent text-foreground shadow-none p-0 overflow-hidden" // Location/File - Transparent Wrapper
                              : "bg-primary text-primary-foreground shadow-primary/30 hover:shadow-lg" // Text
                          : "bg-card/90 border border-border/50 hover:shadow-lg", // Received
                        (firstMessage.imageUrl || firstMessage.location || firstMessage.fileUrl) && "p-0 bg-transparent border-none shadow-none focus:shadow-none hover:shadow-none" // Remove padding/bg for rich media
                      )}
                    >
                      {/* Single Image Render */}
                      {firstMessage.imageUrl && (
                        <div className="relative group">
                          <img
                            src={firstMessage.imageUrl}
                            alt="Shared image"
                            className="max-w-full max-h-72 rounded-2xl object-cover cursor-pointer hover:opacity-90 transition-opacity shadow-sm"
                            onClick={() => handleImageClick(firstMessage.imageUrl!)}
                          />
                        </div>
                      )}

                      {/* Location Render */}
                      {firstMessage.location && (
                        <LocationMessage
                          latitude={firstMessage.location.latitude}
                          longitude={firstMessage.location.longitude}
                          address={firstMessage.location.address}
                          isOwnMessage={isOwnMessage}
                          onClick={() => handleLocationClick(firstMessage.location!.latitude, firstMessage.location!.longitude)}
                        />
                      )}

                      {/* File Render */}
                      {firstMessage.fileUrl && (
                        <div
                          className="flex items-center gap-3 p-3 w-[240px] bg-card border border-border/50 rounded-xl cursor-pointer hover:bg-muted/50 transition-colors shadow-sm group"
                          onClick={() => handleFileClick(firstMessage.fileUrl!, firstMessage.fileName || "Document", firstMessage.fileType)}
                        >
                          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                            {firstMessage.fileType === 'application/pdf' ? <Eye className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate text-foreground leading-none mb-1">{firstMessage.fileName || "Document"}</p>
                            <p className="text-[10px] text-muted-foreground">{firstMessage.fileSize ? (firstMessage.fileSize / 1024).toFixed(1) + ' KB' : 'Unknown size'} • {firstMessage.fileType ? firstMessage.fileType.split('/')[1].toUpperCase() : 'FILE'}</p>
                          </div>

                          {/* Download Button (stop propagation to avoid triggering preview) */}
                          <div
                            className="h-8 w-8 rounded-full hover:bg-background/80 flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(firstMessage.fileUrl, '_blank');
                            }}
                            title="Download"
                          >
                            <Download className="h-4 w-4" />
                          </div>
                        </div>
                      )}

                      {/* Text Content in Bubble */}
                      {firstMessage.content && !firstMessage.location && !firstMessage.fileUrl && (
                        <p className={cn(
                          "text-sm leading-relaxed whitespace-pre-wrap",
                          // Restore padding if mixed content
                          firstMessage.imageUrl && "px-3 pb-2 pt-1"
                        )}>
                          {firstMessage.content}
                        </p>
                      )}

                      {/* Image-only placeholder removal if single mode handles it */}
                      {!firstMessage.content && !firstMessage.imageUrl && !firstMessage.location && !firstMessage.fileUrl && (
                        <p className="text-sm text-muted-foreground italic px-3 py-1">Message content hidden</p>
                      )}
                    </div>
                  )}

                  {/* Timestamp (use last message time for group) */}
                  <div
                    className={cn(
                      "flex items-center gap-1.5 px-2 mt-0.5",
                      isOwnMessage ? "flex-row-reverse" : "flex-row"
                    )}
                  >
                    <span className="text-[10px] sm:text-xs text-muted-foreground/70 font-medium">
                      {formatMessageTime(cluster.messages[cluster.messages.length - 1].createdAt)}
                    </span>
                    {isOwnMessage && (
                      <ReadReceipt
                        isRead={otherUserId ? cluster.messages.every(m => m.readBy.includes(otherUserId)) : false}
                        isDelivered={otherUserId ? cluster.messages.every(m => (m.deliveredBy || []).includes(otherUserId)) : false}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div >

      <ImageGallery
        images={galleryState.images}
        initialIndex={galleryState.startIndex}
        open={galleryState.open}
        onOpenChange={(open) => setGalleryState(prev => ({ ...prev, open }))}
        title="Chat Images"
      />

      {/* PDF Preview Dialog */}
      <Dialog open={!!previewPdf} onOpenChange={(open) => !open && setPreviewPdf(null)}>
        <DialogContent className="max-w-4xl h-[90vh] p-0 flex flex-col gap-0">
          <DialogHeader className="px-4 py-3 border-b flex flex-row items-center justify-between bg-muted/20">
            <DialogTitle className="text-base font-medium truncate pr-8 flex-1">
              {previewPdf?.name || "Document Preview"}
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground"
                onClick={() => window.open(previewPdf?.url, '_blank')}
                title="Download"
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground"
                onClick={() => setPreviewPdf(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 bg-muted/50 w-full overflow-hidden relative">
            {previewPdf && (
              <object
                data={previewPdf.url}
                type="application/pdf"
                className="w-full h-full"
              >
                <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-6 bg-background">
                  <div className="rounded-full bg-muted p-4">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div className="space-y-2">
                    <p className="font-medium text-foreground">Unable to preview PDF</p>
                    <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                      Your browser might not support embedding PDFs, or the file is strict about cross-origin embedding.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => window.open(previewPdf.url, '_blank')}
                  >
                    Download PDF
                  </Button>
                </div>
              </object>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}


