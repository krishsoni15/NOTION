"use client";

/**
 * Header Component
 * 
 * Top navigation bar with user info, theme toggle, chat, and logout.
 */

import Image from "next/image";
import { useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "./user-menu";
import { ChatIcon } from "@/components/chat/chat-icon";
import { ChatWindow } from "@/components/chat/chat-window";
import { ResizableChatSheet } from "@/components/chat/resizable-chat-sheet";
import { useChatWidth } from "@/components/chat/chat-width-provider";
import { StickyNotesIcon } from "@/components/sticky-notes/sticky-notes-icon";
import { StickyNotesWindow } from "@/components/sticky-notes/sticky-notes-window";
import { FloatingStickyNotes } from "@/components/sticky-notes/floating-sticky-notes";
import { ResizableStickyNotesSheet } from "@/components/sticky-notes/resizable-sticky-notes-sheet";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import { MobileSidebar } from "./mobile-sidebar";
import { Role } from "@/lib/auth/roles";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

interface HeaderProps {
  userRole: Role;
}

export function Header({ userRole }: HeaderProps) {
  const currentUser = useQuery(api.users.getCurrentUser);
  const { isChatOpen, setIsChatOpen, isStickyNotesOpen, setIsStickyNotesOpen } = useChatWidth();
  const [logoError, setLogoError] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-4 md:px-6">
        {/* Mobile menu (< md) */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              <VisuallyHidden>
                <SheetTitle>Navigation Menu</SheetTitle>
              </VisuallyHidden>
              <MobileSidebar userRole={userRole} />
            </SheetContent>
          </Sheet>
        </div>

        {/* Desktop: Empty space (brand is in sidebar) */}
        <div className="hidden md:block" />

        {/* Mobile: Brand */}
        <div className="md:hidden flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shrink-0 overflow-hidden p-1">
            {logoError ? (
              <span className="text-lg font-bold text-primary">N</span>
            ) : (
              <Image
                src="/images/logos/Notion_Favicon-removebg-preview.png"
                alt="Notion Logo"
                width={28}
                height={28}
                className="object-contain"
                onError={() => setLogoError(true)}
              />
            )}
          </div>
          <div className="h-10 relative flex items-center">
            {logoError ? (
              <span className="text-lg font-bold text-primary">NOTION</span>
            ) : (
              <Image
                src="/images/logos/Notion_Logo-removebg-preview.png"
                alt="Notion"
                width={140}
                height={40}
                className="object-contain h-full"
                onError={() => setLogoError(true)}
              />
            )}
          </div>
        </div>

        {/* Right side: Sticky Notes + Chat + Theme toggle + Custom User Menu */}
        <div className="flex items-center gap-2 md:gap-4">
          {currentUser && (
            <>
              <StickyNotesIcon 
                onClick={() => {
                  if (isStickyNotesOpen) {
                    // If open, close it
                    setIsStickyNotesOpen(false);
                  } else {
                    // If closed, open it and close chat
                    setIsStickyNotesOpen(true);
                    setIsChatOpen(false);
                  }
                }}
                isActive={isStickyNotesOpen}
              />
            <ChatIcon 
              onClick={() => {
                if (isChatOpen) {
                  // If open, close it
                  setIsChatOpen(false);
                } else {
                  // If closed, open it and close sticky notes
                  setIsChatOpen(true);
                  setIsStickyNotesOpen(false);
                }
              }}
              isActive={isChatOpen}
            />
            </>
          )}
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>

      {/* Chat Sheet with Resizable Left Border */}
      {currentUser && (
        <ResizableChatSheet open={isChatOpen} onOpenChange={setIsChatOpen}>
          <ChatWindow 
            currentUserId={currentUser._id} 
            onClose={() => setIsChatOpen(false)}
          />
        </ResizableChatSheet>
      )}

      {/* Sticky Notes Sheet with Resizable Left Border */}
      {currentUser && (
        <>
          <ResizableStickyNotesSheet open={isStickyNotesOpen} onOpenChange={setIsStickyNotesOpen}>
            <StickyNotesWindow 
              currentUserId={currentUser._id} 
              onClose={() => setIsStickyNotesOpen(false)}
            />
          </ResizableStickyNotesSheet>

          {/* Floating Sticky Notes - Always visible if any notes have been dragged out */}
          <FloatingStickyNotes
            currentUserId={currentUser._id}
          />
        </>
      )}
    </header>
  );
}

