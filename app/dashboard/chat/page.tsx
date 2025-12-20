/**
 * Chat Page
 * 
 * Main chat page route for the dashboard.
 */

"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ChatWindow } from "@/components/chat/chat-window";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ChatPage() {
  const currentUser = useQuery(api.users.getCurrentUser);
  const router = useRouter();

  useEffect(() => {
    if (currentUser === null) {
      router.push("/login");
    }
  }, [currentUser, router]);

  if (currentUser === undefined) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)] md:h-[calc(100vh-5rem)]">
        <p className="text-muted-foreground">Loading chat...</p>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  return (
    <div className="h-[calc(100vh-4rem)] md:h-[calc(100vh-5rem)] w-full">
      <ChatWindow currentUserId={currentUser._id} />
    </div>
  );
}

