/**
 * User Profile Component
 * 
 * Shows user details in a modal (name, username, phone, address, role, online status)
 */

"use client";

import { useEffect } from "react";
import { X, User, Phone, MapPin, Briefcase, AtSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { OnlineIndicator } from "./online-indicator";
import { getRoleLabel } from "@/lib/auth/roles";
import { cn } from "@/lib/utils";
import type { Id } from "@/convex/_generated/dataModel";
import { LazyImage } from "@/components/ui/lazy-image";

interface UserProfileProps {
  user: {
    _id: Id<"users">;
    fullName: string;
    username: string;
    role: string;
    phoneNumber?: string;

    address?: string;
    profileImage?: string;
  };
  isOnline?: boolean;
  onClose: () => void;
  className?: string;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function UserProfile({ user, isOnline = false, onClose, className }: UserProfileProps) {
  // Handle ESC key to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    // Prevent body scroll when modal is open
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [onClose]);

  return (
    <div
      className={cn(
        "fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200",
        className
      )}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-title"
    >
      <div
        className="bg-background rounded-xl max-w-md w-full shadow-2xl border border-border/50 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with prominent close button */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b bg-gradient-to-r from-muted/50 to-muted/30 shrink-0">
          <h3 id="profile-title" className="text-lg sm:text-xl font-semibold">User Profile</h3>
          <Button
            onClick={onClose}
            size="icon"
            variant="ghost"
            className="shrink-0 hover:bg-destructive/10 hover:text-destructive transition-colors"
            aria-label="Close profile"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content - Scrollable */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto flex-1">
          {/* Avatar and Name */}
          <div className="flex flex-col items-center text-center pb-2">
            <div className="relative mb-4">
              <Avatar className="h-20 w-20 sm:h-24 sm:w-24 ring-4 ring-primary/10 overflow-hidden bg-background">
                {user.profileImage ? (
                  <LazyImage
                    src={user.profileImage}
                    alt={user.fullName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <AvatarFallback className="text-xl sm:text-2xl bg-gradient-to-br from-primary/20 to-primary/10">
                    {getInitials(user.fullName)}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="absolute -bottom-0.5 -right-0.5">
                <OnlineIndicator isOnline={isOnline} className="scale-150" />
              </div>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold mb-1.5">{user.fullName}</h2>
            <div className="flex items-center gap-2 mb-2">
              <span className={cn(
                "text-xs sm:text-sm font-medium px-2 py-0.5 rounded-full",
                isOnline ? "text-green-600 bg-green-50 dark:bg-green-950/30" : "text-muted-foreground bg-muted"
              )}>
                {isOnline ? "● Online" : "○ Offline"}
              </span>
            </div>
            <Badge variant="secondary" className="text-xs sm:text-sm px-3 py-1">
              {getRoleLabel(user.role as any)}
            </Badge>
          </div>

          {/* Details - Paper card style */}
          <div className="space-y-2.5 sm:space-y-3">
            {/* Username */}
            <div className="flex items-start gap-3 p-3 sm:p-4 rounded-lg border border-border/50 bg-card/50 shadow-sm hover:shadow-md hover:bg-card transition-all">
              <div className="p-2 rounded-md bg-primary/10 shrink-0">
                <AtSign className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wide">Username</p>
                <p className="font-semibold text-foreground break-all">@{user.username}</p>
              </div>
            </div>

            {/* Phone Number */}
            {user.phoneNumber && (
              <div className="flex items-start gap-3 p-3 sm:p-4 rounded-lg border border-border/50 bg-card/50 shadow-sm hover:shadow-md hover:bg-card transition-all">
                <div className="p-2 rounded-md bg-primary/10 shrink-0">
                  <Phone className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wide">Phone</p>
                  <a
                    href={`tel:${user.phoneNumber}`}
                    className="font-semibold text-foreground hover:text-primary transition-colors break-all"
                  >
                    {user.phoneNumber}
                  </a>
                </div>
              </div>
            )}

            {/* Address */}
            {user.address && (
              <div className="flex items-start gap-3 p-3 sm:p-4 rounded-lg border border-border/50 bg-card/50 shadow-sm hover:shadow-md hover:bg-card transition-all">
                <div className="p-2 rounded-md bg-primary/10 shrink-0">
                  <MapPin className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wide">Address</p>
                  <p className="font-semibold text-foreground break-words">{user.address}</p>
                </div>
              </div>
            )}

            {/* Role */}
            <div className="flex items-start gap-3 p-3 sm:p-4 rounded-lg border border-border/50 bg-card/50 shadow-sm hover:shadow-md hover:bg-card transition-all">
              <div className="p-2 rounded-md bg-primary/10 shrink-0">
                <Briefcase className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wide">Role</p>
                <Badge variant="secondary" className="mt-1 text-xs sm:text-sm">
                  {getRoleLabel(user.role as any)}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Footer with close button */}
        <div className="p-4 sm:p-5 border-t bg-gradient-to-r from-muted/30 to-muted/50 shrink-0">
          <Button
            onClick={onClose}
            variant="outline"
            className="w-full font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

