/**
 * Message Input Component
 *
 * Input field for composing and sending messages.
 */

"use client";

import { useState, useRef, KeyboardEvent, ChangeEvent } from "react";
import { Send, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface MessageInputProps {
  onSend: (content: string, imageUrl?: string, imageKey?: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function MessageInput({
  onSend,
  disabled = false,
  placeholder = "Type a message...",
  className,
}: MessageInputProps) {
  const [message, setMessage] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadImage = async (file: File): Promise<{ imageUrl: string; imageKey: string }> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/upload/chat-image', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload image');
    }

    const data = await response.json();
    return {
      imageUrl: data.imageUrl,
      imageKey: data.imageKey,
    };
  };

  const handleSend = async () => {
    const trimmedMessage = message.trim();
    const hasContent = trimmedMessage || selectedImage;

    if (!hasContent || disabled || isUploading) return;

    setIsUploading(true);
    try {
      let imageUrl: string | undefined;
      let imageKey: string | undefined;

      if (selectedImage) {
        const uploadResult = await uploadImage(selectedImage);
        imageUrl = uploadResult.imageUrl;
        imageKey = uploadResult.imageKey;
      }

      onSend(trimmedMessage, imageUrl, imageKey);
      setMessage("");
      setSelectedImage(null);
      inputRef.current?.focus();
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }

      setSelectedImage(file);
    }
  };

  const removeSelectedImage = () => {
    setSelectedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={cn("flex flex-col gap-2 p-3 sm:p-4 md:p-5 border-t border-border/50 bg-background/80 backdrop-blur-md shadow-sm safe-area-inset-bottom", className)}>
      {/* Image Preview */}
      {selectedImage && (
        <div className="relative inline-block">
          <img
            src={URL.createObjectURL(selectedImage)}
            alt="Selected image"
            className="max-h-32 max-w-64 rounded-lg border border-border/50 object-contain"
          />
          <Button
            onClick={removeSelectedImage}
            size="icon"
            variant="destructive"
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
          >
            <span className="text-xs">×</span>
          </Button>
        </div>
      )}

      {/* Input and Buttons */}
      <div className="flex items-center gap-2 sm:gap-3">
        <Input
          ref={inputRef}
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isUploading}
          className="flex-1 bg-background/80 backdrop-blur-sm border-border/50 focus:border-primary/50 rounded-xl h-11 sm:h-12 text-base"
          maxLength={5000}
        />

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
        />

        {/* Image picker button */}
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isUploading}
          size="icon"
          variant="outline"
          className="shrink-0 rounded-xl h-11 w-11 sm:h-12 sm:w-12 border-border/50 hover:bg-muted/50 transition-all touch-manipulation active:scale-95"
          title="Attach image"
        >
          <ImageIcon className="h-5 w-5 sm:h-4 sm:w-4" />
          <span className="sr-only">Attach image</span>
        </Button>

        {/* Send button */}
        <Button
          onClick={handleSend}
          disabled={disabled || isUploading || (!message.trim() && !selectedImage)}
          size="icon"
          className="shrink-0 rounded-xl h-11 w-11 sm:h-12 sm:w-12 bg-primary hover:bg-primary/90 disabled:opacity-50 transition-all shadow-md hover:shadow-lg touch-manipulation active:scale-95"
        >
          <Send className="h-5 w-5 sm:h-4 sm:w-4" />
          <span className="sr-only">Send message</span>
        </Button>
      </div>
    </div>
  );
}

