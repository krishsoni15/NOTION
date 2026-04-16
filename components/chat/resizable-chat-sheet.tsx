/**
 * Resizable Chat Sheet Component
 * 
 * Chat sheet that can be resized by dragging the left border.
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { Sheet, SheetTitle } from "@/components/ui/sheet";
import { NonModalSheetContent } from "./non-modal-sheet-content";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import { cn } from "@/lib/utils";
import { useChatWidth } from "./chat-width-provider";

interface ResizableChatSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

const MIN_WIDTH = 400;
const MAX_WIDTH = 1200;
const DEFAULT_WIDTH = 600;

export function ResizableChatSheet({ open, onOpenChange, children }: ResizableChatSheetProps) {
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const { setChatWidth, setIsChatOpen } = useChatWidth();

  // Detect mobile/tablet
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load saved width from localStorage
  useEffect(() => {
    const savedWidth = localStorage.getItem("chat-sheet-width");
    if (savedWidth) {
      try {
        const w = parseInt(savedWidth, 10);
        if (w >= MIN_WIDTH && w <= MAX_WIDTH) {
          setWidth(w);
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, []);

  // Save width to localStorage and update context
  useEffect(() => {
    if (!isMobile && width !== DEFAULT_WIDTH) {
      localStorage.setItem("chat-sheet-width", width.toString());
    }
    // On mobile, use full width; on desktop, use saved width
    const effectiveWidth = isMobile ? window.innerWidth : width;
    setChatWidth(open ? effectiveWidth : 0);
    setIsChatOpen(open);
  }, [width, open, isMobile, setChatWidth, setIsChatOpen]);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Don't allow resizing on mobile
    if (isMobile) return;
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!sheetRef.current) return;
      
      const sheetRect = sheetRef.current.getBoundingClientRect();
      const newWidth = window.innerWidth - e.clientX;
      
      // Constrain width between min and max
      const constrainedWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, newWidth));
      setWidth(constrainedWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing]);

  return (
    <Sheet open={open} onOpenChange={(newOpen) => {
      // Only close if explicitly set to false
      if (!newOpen && onOpenChange) {
        onOpenChange(false);
      }
    }} modal={false}>
      <NonModalSheetContent
        ref={sheetRef}
        side="right"
        className={cn(
          "p-0 transition-none",
          isResizing && "select-none",
          // Mobile: full width, Desktop: custom width
          isMobile ? "w-full" : ""
        )}
        style={isMobile ? {
          width: '100%',
          maxWidth: '100%',
          right: 0,
        } : {
          width: `${width}px`,
          maxWidth: `${width}px`,
          right: 0,
        }}
        onInteractOutside={(e) => {
          // On mobile, allow closing by clicking outside
          if (isMobile && onOpenChange) {
            onOpenChange(false);
            return;
          }
          // On desktop, prevent closing when clicking outside
          e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          // On mobile, allow closing with escape
          if (isMobile && onOpenChange) {
            onOpenChange(false);
            return;
          }
          // On desktop, prevent closing on escape
          e.preventDefault();
        }}
      >
        <VisuallyHidden>
          <SheetTitle>Chat</SheetTitle>
        </VisuallyHidden>
        
        {/* Resize Handle on Left Border - Only on Desktop */}
        {!isMobile && (
          <div
            onMouseDown={handleMouseDown}
            className={cn(
              "absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize z-50 group",
              "hover:bg-primary/60 transition-colors",
              isResizing && "bg-primary"
            )}
            title="Drag to resize"
          >
            {/* Visual indicator line */}
            <div className="absolute left-0.5 top-0 bottom-0 w-0.5 bg-primary/30 group-hover:bg-primary/60 transition-colors" />
          </div>
        )}
        
        {children}
      </NonModalSheetContent>
    </Sheet>
  );
}


