/**
 * Message Input Component
 * 
 * Input field for composing and sending messages.
 */

"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface MessageInputProps {
  onSend: (content: string) => void;
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
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || disabled) return;

    onSend(trimmedMessage);
    setMessage("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={cn("flex items-center gap-2 sm:gap-3 p-3 sm:p-4 md:p-5 border-t border-border/50 bg-background/80 backdrop-blur-md shadow-sm safe-area-inset-bottom", className)}>
      <Input
        ref={inputRef}
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 bg-background/80 backdrop-blur-sm border-border/50 focus:border-primary/50 rounded-xl h-11 sm:h-12 text-base"
        maxLength={5000}
      />
      <Button
        onClick={handleSend}
        disabled={disabled || !message.trim()}
        size="icon"
        className="shrink-0 rounded-xl h-11 w-11 sm:h-12 sm:w-12 bg-primary hover:bg-primary/90 disabled:opacity-50 transition-all shadow-md hover:shadow-lg touch-manipulation active:scale-95"
      >
        <Send className="h-5 w-5 sm:h-4 sm:w-4" />
        <span className="sr-only">Send message</span>
      </Button>
    </div>
  );
}

