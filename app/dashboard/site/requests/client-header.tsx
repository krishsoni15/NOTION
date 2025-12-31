"use client";

/**
 * Client Component for Site Requests Page Header
 *
 * Contains interactive elements that can't be in server components.
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function SiteRequestsHeader() {
  return (
    <>
      {/* Mobile Header with Back Button */}
      <div className="flex items-center justify-between">
        <Link href="/dashboard/site">
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-lg font-semibold">My Requests</h1>
        <div className="w-9" /> {/* Spacer for centering */}
      </div>

      {/* Quick Create Button - Mobile First */}
      <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
        <CardContent className="p-4">
          <Button
            onClick={() => {
              // Trigger the form open - this will be handled by the content component
              const event = new CustomEvent('openRequestForm');
              window.dispatchEvent(event);
            }}
            className="w-full h-12 text-base font-semibold shadow-md hover:shadow-lg transition-all active:scale-95 touch-manipulation"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create New Request
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
