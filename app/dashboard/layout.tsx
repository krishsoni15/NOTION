/**
 * Dashboard Layout
 * 
 * Main layout for all dashboard pages.
 * Includes sidebar navigation, header, and presence tracking.
 */

import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { SidebarProvider } from "@/components/layout/sidebar-provider";
import { SidebarWrapper } from "@/components/layout/sidebar-wrapper";
import { Header } from "@/components/layout/header";
import { PresenceProvider } from "@/components/chat/presence-provider";
import { ChatWidthProvider } from "@/components/chat/chat-width-provider";
import { ReminderScheduler } from "@/components/sticky-notes/reminder-scheduler";
import { getUserRole } from "@/lib/auth/get-user-role";
import { UserSync } from "@/components/auth/user-sync";

// Mark as dynamic since we use auth() which requires headers()
export const dynamic = 'force-dynamic';

export default async function DashboardLayout({ children }: { children: ReactNode }) {
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
      <ChatWidthProvider>
        <SidebarProvider>
        <PresenceProvider>
          <UserSync />
          <ReminderScheduler />
          <SidebarWrapper userRole={role}>
            <Header userRole={role} />
            
            <main className="flex-1 overflow-y-auto">
              <div className="container mx-auto px-4 py-6 md:px-6 md:py-8">
                {children}
              </div>
            </main>
          </SidebarWrapper>
        </PresenceProvider>
        </SidebarProvider>
      </ChatWidthProvider>
  );
}

