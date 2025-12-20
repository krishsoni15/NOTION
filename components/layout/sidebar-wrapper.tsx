/**
 * Sidebar Wrapper Component
 * 
 * Client component that handles dynamic sidebar width for layout offset.
 */

"use client";

import { useState, useEffect } from "react";
import { useSidebar } from "./sidebar-provider";
import { useChatWidth } from "@/components/chat/chat-width-provider";
import { Role } from "@/lib/auth/roles";
import { Sidebar } from "./sidebar";
import { cn } from "@/lib/utils";

interface SidebarWrapperProps {
  userRole: Role;
  children: React.ReactNode;
}

export function SidebarWrapper({ userRole, children }: SidebarWrapperProps) {
  const { isCollapsed, isMounted } = useSidebar();
  const { chatWidth, isChatOpen, stickyNotesWidth, isStickyNotesOpen } = useChatWidth();
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile/tablet
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024); // lg breakpoint
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Calculate total right margin (chat + sticky notes)
  const totalRightMargin = !isMobile 
    ? (isChatOpen && chatWidth > 0 ? chatWidth : 0) + (isStickyNotesOpen && stickyNotesWidth > 0 ? stickyNotesWidth : 0)
    : 0;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar - fixed position */}
      <Sidebar userRole={userRole} />

      {/* Main content - offset for sidebar, chat, and sticky notes */}
      <div 
        className={cn(
          "flex-1 flex flex-col min-w-0 transition-all duration-300",
          // Mobile (<md): no offset, Sidebar hidden
          // Tablet/Desktop: offset matches sidebar width (icon vs full)
          isMounted && (isCollapsed ? "md:ml-20" : "md:ml-64")
        )}
        style={{
          // Adjust margin on desktop when chat or sticky notes are open
          marginRight: totalRightMargin > 0 ? `${totalRightMargin}px` : '0',
          transition: 'margin-right 0.3s ease-in-out',
        }}
      >
        {children}
      </div>
    </div>
  );
}

