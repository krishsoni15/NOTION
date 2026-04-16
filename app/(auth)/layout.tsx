/**
 * Auth Layout
 * 
 * Layout for authentication pages (login).
 * Beautiful split-screen design for desktop, full-screen for mobile.
 */

import { ReactNode } from "react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header with theme toggle - Removed as it's duped in Login Form
      <header className="absolute top-0 right-0 p-4 z-10">
        <ThemeToggle />
      </header> 
      */}

      {/* Full height content */}
      <main className="flex-1 flex">
        {children}
      </main>
    </div>
  );
}

