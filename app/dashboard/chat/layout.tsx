/**
 * Chat Page Layout
 * 
 * Custom layout for chat page without sidebar.
 */

import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { Header } from "@/components/layout/header";
import { PresenceProvider } from "@/components/chat/presence-provider";
import { ChatWidthProvider } from "@/components/chat/chat-width-provider";
import { ReminderScheduler } from "@/components/sticky-notes/reminder-scheduler";
import { getUserRole } from "@/lib/auth/get-user-role";

export default async function ChatLayout({ children }: { children: ReactNode }) {
  // Check authentication
  const { userId } = await auth();
  
  if (!userId) {
    redirect("/login");
  }

  // Get user role
  const role = await getUserRole();
  
  if (!role) {
    redirect("/login");
  }

  return (
    <PresenceProvider>
      <ChatWidthProvider>
        <ReminderScheduler />
        <div className="min-h-screen bg-background flex flex-col">
          <Header userRole={role} />
          
          <main className="flex-1 overflow-y-auto">
            <div className="h-full">
              {children}
            </div>
          </main>
        </div>
      </ChatWidthProvider>
    </PresenceProvider>
  );
}

