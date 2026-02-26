"use client";

/**
 * Custom User Menu
 * Dropdown menu for user profile using custom auth.
 */

import { useState, useEffect } from "react";
import { useAuth } from "@/app/providers/auth-provider";
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
import { UserAvatar } from "@/components/user-management/user-avatar";
import { Button } from "@/components/ui/button";
import {
  User,
  LogOut,
  Settings,
  ChevronDown,
  Shield,
  Phone,
  Maximize
} from "lucide-react";
import { ROLE_LABELS } from "@/lib/auth/roles";


export function UserMenu() {
  const { user: authUser, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const setOffline = useMutation(api.presence.setOffline);
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Get user data from Convex (includes role)
  const convexUser = useQuery(
    api.users.getUserByClerkId,
    isAuthenticated && authUser ? { clerkUserId: authUser.userId } : "skip"
  );

  if (!isMounted || !isAuthenticated || !authUser) {
    return (
      <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const displayName = convexUser?.fullName || authUser.name || "User";
  const initials = getInitials(displayName);
  const role = convexUser?.role;

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await setOffline();
    } catch (error) {
      console.warn("Failed to set offline status:", error);
    }
    await logout();
    router.push("/login");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-10 gap-2 rounded-full pl-2 pr-3 hover:bg-accent/50 transition-all hover:shadow-sm"
        >
          <div className="relative">
            <UserAvatar
              name={displayName}
              image={convexUser?.profileImage}
              size="sm"
              className="border-2 border-primary/20"
            />
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 ring-2 ring-background shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
          </div>
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
        <DropdownMenuLabel className="font-normal p-0">
          <div className="flex flex-col space-y-2 py-2 px-1">
            <div className="flex items-center gap-3">
              <div className="relative">
                <UserAvatar
                  name={displayName}
                  image={convexUser?.profileImage}
                  size="lg"
                  className="border-2 border-primary/20"
                />
                <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-green-500 ring-4 ring-popover" />
              </div>
              <div className="flex flex-col">
                <p className="text-sm font-semibold leading-none">{displayName}</p>
                <p className="text-xs text-muted-foreground mt-1">@{authUser.username}</p>
              </div>
            </div>

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

        {convexUser && convexUser.phoneNumber && (
          <>
            <DropdownMenuItem className="cursor-default focus:bg-transparent hover:bg-transparent">
              <Phone className="mr-2 h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{convexUser.phoneNumber}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        <DropdownMenuItem onClick={() => router.push("/dashboard/profile")}>
          <User className="mr-2 h-4 w-4" />
          <span>My Profile</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => router.push("/dashboard/settings")}>
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => {
            if (!document.fullscreenElement) {
              document.documentElement.requestFullscreen().catch(console.error);
            } else {
              document.exitFullscreen();
            }
          }}
        >
          <Maximize className="mr-2 h-4 w-4" />
          <span>Full Screen</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleSignOut}
          className="text-destructive focus:text-destructive focus:bg-destructive/10"
          disabled={isLoading}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
