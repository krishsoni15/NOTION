"use client";

/**
 * Client Component for Site Engineer Dashboard
 *
 * Dashboard with create request button, chat, and sticky notes in responsive grid.
 */

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function SiteEngineerDashboardClient() {

  return (
    <div className="space-y-6 pb-safe">
      {/* BIG CREATE REQUEST BUTTON - Clean */}
      <Button
        onClick={() => {
          // Navigate to requests page and trigger form opening
          window.location.href = '/dashboard/site/requests?create=true';
        }}
        className="w-full h-16 text-lg font-semibold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all active:scale-95 touch-manipulation rounded-xl"
      >
        <Plus className="h-6 w-6 mr-3" />
        Create New Request
      </Button>
    </div>
  );
}
