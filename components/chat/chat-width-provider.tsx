/**
 * Chat Width Provider
 * 
 * Context to track chat panel width for auto-layout adjustment.
 */

"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface ChatWidthContextType {
  chatWidth: number;
  setChatWidth: (width: number) => void;
  isChatOpen: boolean;
  setIsChatOpen: (open: boolean) => void;
  stickyNotesWidth: number;
  setStickyNotesWidth: (width: number) => void;
  isStickyNotesOpen: boolean;
  setIsStickyNotesOpen: (open: boolean) => void;
}

const ChatWidthContext = createContext<ChatWidthContextType | undefined>(undefined);

export function ChatWidthProvider({ children }: { children: ReactNode }) {
  const [chatWidth, setChatWidth] = useState(0);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [stickyNotesWidth, setStickyNotesWidth] = useState(0);
  const [isStickyNotesOpen, setIsStickyNotesOpen] = useState(false);

  return (
    <ChatWidthContext.Provider value={{ 
      chatWidth, 
      setChatWidth, 
      isChatOpen, 
      setIsChatOpen,
      stickyNotesWidth,
      setStickyNotesWidth,
      isStickyNotesOpen,
      setIsStickyNotesOpen,
    }}>
      {children}
    </ChatWidthContext.Provider>
  );
}

export function useChatWidth() {
  const context = useContext(ChatWidthContext);
  if (context === undefined) {
    throw new Error("useChatWidth must be used within a ChatWidthProvider");
  }
  return context;
}

