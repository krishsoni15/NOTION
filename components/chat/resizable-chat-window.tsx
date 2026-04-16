/**
 * Resizable Chat Window Component
 * 
 * Chat window that can be resized and dragged like sticky notes.
 */

"use client";

import { useState, useEffect } from "react";
import { Rnd } from "react-rnd";
import { X, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatWindow } from "./chat-window";
import type { Id } from "@/convex/_generated/dataModel";

interface ResizableChatWindowProps {
  currentUserId: Id<"users">;
  onClose?: () => void;
}

const DEFAULT_WIDTH = 500;
const DEFAULT_HEIGHT = 700;
const MIN_WIDTH = 400;
const MIN_HEIGHT = 500;
const MAX_WIDTH = 1200;
const MAX_HEIGHT = 1000;

export function ResizableChatWindow({
  currentUserId,
  onClose,
}: ResizableChatWindowProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT });
  const [prevState, setPrevState] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  // Load saved position and size from localStorage
  useEffect(() => {
    const savedPosition = localStorage.getItem("chat-window-position");
    const savedSize = localStorage.getItem("chat-window-size");
    
    if (savedPosition) {
      try {
        const pos = JSON.parse(savedPosition);
        setPosition(pos);
      } catch (e) {
        // Ignore parse errors
      }
    } else {
      // Default position: right side of screen
      setPosition({ 
        x: window.innerWidth - DEFAULT_WIDTH - 20, 
        y: 80 
      });
    }
    
    if (savedSize) {
      try {
        const s = JSON.parse(savedSize);
        setSize(s);
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, []);

  // Save position and size to localStorage
  useEffect(() => {
    if (position.x !== 0 || position.y !== 0) {
      localStorage.setItem("chat-window-position", JSON.stringify(position));
    }
  }, [position]);

  useEffect(() => {
    if (size.width !== DEFAULT_WIDTH || size.height !== DEFAULT_HEIGHT) {
      localStorage.setItem("chat-window-size", JSON.stringify(size));
    }
  }, [size]);

  const handleToggleMaximize = () => {
    if (isMaximized) {
      // Restore previous state
      if (prevState) {
        setPosition({ x: prevState.x, y: prevState.y });
        setSize({ width: prevState.width, height: prevState.height });
      }
      setIsMaximized(false);
    } else {
      // Save current state and maximize
      setPrevState({ ...position, ...size });
      setPosition({ x: 0, y: 0 });
      setSize({ width: window.innerWidth, height: window.innerHeight });
      setIsMaximized(true);
    }
  };

  const handleDragStop = (e: any, d: any) => {
    setPosition({ x: d.x, y: d.y });
  };

  const handleResizeStop = (e: any, direction: any, ref: any, delta: any, position: any) => {
    const newWidth = parseInt(ref.style.width);
    const newHeight = parseInt(ref.style.height);
    setSize({ width: newWidth, height: newHeight });
    setPosition({ x: position.x, y: position.y });
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-[100]">
        <Button
          onClick={() => setIsMinimized(false)}
          size="sm"
          className="shadow-lg"
        >
          <Maximize2 className="h-4 w-4 mr-2" />
          Show Chat
        </Button>
      </div>
    );
  }

  return (
    <Rnd
      size={isMaximized ? { width: window.innerWidth, height: window.innerHeight } : size}
      position={isMaximized ? { x: 0, y: 0 } : position}
      minWidth={isMaximized ? window.innerWidth : MIN_WIDTH}
      minHeight={isMaximized ? window.innerHeight : MIN_HEIGHT}
      maxWidth={isMaximized ? window.innerWidth : MAX_WIDTH}
      maxHeight={isMaximized ? window.innerHeight : MAX_HEIGHT}
      bounds="window"
      onDragStop={handleDragStop}
      onResizeStop={handleResizeStop}
      disableResizing={isMaximized}
      className="z-[100]"
      style={{
        zIndex: 100,
      }}
      dragHandleClassName="chat-drag-handle"
      resizeHandleClasses={{
        bottom: "hover:bg-primary/30 transition-colors",
        bottomRight: "hover:bg-primary/30 transition-colors",
        bottomLeft: "hover:bg-primary/30 transition-colors",
        left: "hover:bg-primary/30 transition-colors",
        right: "hover:bg-primary/30 transition-colors",
        top: "hover:bg-primary/30 transition-colors",
        topLeft: "hover:bg-primary/30 transition-colors",
        topRight: "hover:bg-primary/30 transition-colors",
      }}
    >
      <div className="h-full w-full bg-background border border-border rounded-lg shadow-2xl overflow-hidden flex flex-col relative group">
        {/* Drag Handle Area */}
        <div className="chat-drag-handle absolute top-0 left-0 right-0 h-12 cursor-move z-40" />
        
        {/* Control Buttons */}
        <div className="absolute top-2 right-2 z-50 flex gap-2">
          <Button
            onClick={() => setIsMinimized(true)}
            size="icon"
            variant="ghost"
            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-background/80 hover:bg-background shadow-md hover:shadow-lg rounded-full"
            title="Minimize"
          >
            <Minimize2 className="h-4 w-4" />
          </Button>
          <Button
            onClick={handleToggleMaximize}
            size="icon"
            variant="ghost"
            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-background/80 hover:bg-background shadow-md hover:shadow-lg rounded-full"
            title={isMaximized ? "Restore" : "Maximize"}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
          {onClose && (
            <Button
              onClick={onClose}
              size="icon"
              variant="ghost"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-background/80 hover:bg-background shadow-md hover:shadow-lg rounded-full"
              title="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Chat Window Content */}
        <div className="h-full w-full overflow-hidden">
          <ChatWindow 
            currentUserId={currentUserId} 
            onClose={onClose}
          />
        </div>
      </div>
    </Rnd>
  );
}

