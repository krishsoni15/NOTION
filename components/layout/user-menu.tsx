"use client";

/**
 * Custom User Menu
 * 
 * Custom dropdown menu for user profile (replaces Clerk's UserButton).
 * Built with shadcn components for full control.
 */

import { useState, useEffect } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  User,
  LogOut,
  Settings,
  ChevronDown,
  Shield,
  Mail,
  Phone
} from "lucide-react";
import { ROLE_LABELS } from "@/lib/auth/roles";

export function UserMenu() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const setOffline = useMutation(api.presence.setOffline);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Get user data from Convex (includes role)
  const convexUser = useQuery(
    api.users.getUserByClerkId,
    isLoaded && user ? { clerkUserId: user.id } : "skip"
  );

  if (!isMounted || !isLoaded || !user) {
    return (
      <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
    );
  }

  // Get user initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const displayName = convexUser?.fullName || user.username || "User";
  const initials = getInitials(displayName);
  const role = convexUser?.role;

  const handleSignOut = async () => {
    // Set user offline before signing out
    try {
      await setOffline();
    } catch (error) {
      // Continue even if setting offline fails
      console.warn("Failed to set offline status:", error);
    }

    // Sign out and redirect
    await signOut();
    router.push("/login");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-10 gap-2 rounded-full pl-2 pr-3 hover:bg-accent/50 transition-all hover:shadow-sm"
        >
          <Avatar className="h-8 w-8 border-2 border-primary/20">
            <AvatarImage src={user.imageUrl} alt={displayName} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="hidden md:inline-block text-sm font-medium max-w-[120px] truncate">
            {displayName}
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-64 bg-popover/95 backdrop-blur-md border-border/50 shadow-lg"
        align="end"
        sideOffset={8}
      >
        {/* User Info Header */}
        <DropdownMenuLabel className="font-normal p-0">
          <div className="flex flex-col space-y-2 py-2 px-1">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12 border-2 border-primary/20">
                <AvatarImage src={user.imageUrl} alt={displayName} />
                <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <p className="text-sm font-semibold leading-none">{displayName}</p>
                <p className="text-xs text-muted-foreground mt-1">@{user.username}</p>
              </div>
            </div>

            {/* Role Badge */}
            {role && (
              <div className="flex items-center gap-2 px-2 py-1.5 bg-primary/10 rounded-md">
                <Shield className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium text-primary">
                  {ROLE_LABELS[role]}
                </span>
              </div>
            )}
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* Additional User Info */}
        {convexUser && (
          <>
            {convexUser.phoneNumber && (
              <DropdownMenuItem className="cursor-default focus:bg-transparent hover:bg-transparent">
                <Phone className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{convexUser.phoneNumber}</span>
              </DropdownMenuItem>
            )}

            {user.primaryEmailAddress && (
              <DropdownMenuItem className="cursor-default focus:bg-transparent hover:bg-transparent">
                <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{user.primaryEmailAddress.emailAddress}</span>
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />
          </>
        )}

        {/* Profile Action */}
        <DropdownMenuItem onClick={() => router.push("/dashboard/profile")}>
          <User className="mr-2 h-4 w-4" />
          <span>My Profile</span>
        </DropdownMenuItem>

        {/* Settings Action */}
        <DropdownMenuItem onClick={() => router.push("/dashboard/settings")}>
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Sign Out */}
        <DropdownMenuItem
          onClick={handleSignOut}
          className="text-destructive focus:text-destructive focus:bg-destructive/10"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

