/**
 * Chat Page Layout
 * 
 * Custom layout for chat page without sidebar.
 */

import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth/jwt";
import { Header } from "@/components/layout/header";
import { ChatWidthProvider } from "@/components/chat/chat-width-provider";
import { ReminderScheduler } from "@/components/sticky-notes/reminder-scheduler";
import { getUserRole } from "@/lib/auth/get-user-role";

// Mark as dynamic since we use cookies()
export const dynamic = 'force-dynamic';

export default async function ChatLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value;

  if (!token) {
    redirect("/login");
  }

  const user = await verifyToken(token);
  if (!user) {
    redirect("/login");
  }

  const role = await getUserRole();
  if (!role) {
    redirect("/login");
  }

  return (
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
  );
}
