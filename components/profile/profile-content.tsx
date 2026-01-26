"use client";

import { cn } from "@/lib/utils";

/**
 * Profile Content Component
 * 
 * Main content for the profile page with tabs for different sections.
 */

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { PersonalInfoForm } from "./personal-info-form";

import { PasswordForm } from "./password-form";
import { User, Lock, Shield, MapPin } from "lucide-react";
import { UserAvatar } from "@/components/user-management/user-avatar";

export function ProfileContent() {
  const { user, isLoaded } = useUser();
  const convexUser = useQuery(
    api.users.getUserByClerkId,
    isLoaded && user ? { clerkUserId: user.id } : "skip"
  );

  if (!isLoaded || !user) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-20 w-20 rounded-full bg-muted" />
              <div className="h-4 w-48 bg-muted rounded" />
              <div className="h-4 w-32 bg-muted rounded" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const displayName = convexUser?.fullName || user.username || "User";
  const initials = displayName
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleOpenInMap = (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
    window.open(mapUrl, '_blank');
  };

  // Check if user is a manager
  const isManager = convexUser?.role === "manager";

  return (
    <div className="space-y-6">
      {/* Profile Header Card */}
      {/* Profile Header Card */}
      <Card className="overflow-hidden border-border/50 shadow-md">
        <div className="h-32 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent" />
        <CardContent className="p-6 relative">
          <div className="flex flex-col sm:flex-row items-end sm:items-end gap-6 -mt-12">
            <div className="relative">
              <UserAvatar
                name={displayName}
                image={convexUser?.profileImage}
                size="xl"
                className="h-32 w-32 border-4 border-background shadow-xl rounded-full"
              />
              <div className={cn(
                "absolute bottom-2 right-2 h-5 w-5 rounded-full border-2 border-background",
                convexUser?.isActive ? "bg-green-500" : "bg-destructive"
              )} />
            </div>

            <div className="flex-1 text-center sm:text-left space-y-2 mb-2">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">{displayName}</h2>
                <p className="text-muted-foreground font-medium">@{user.username}</p>
              </div>

              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                {convexUser?.role && (
                  <Badge variant="secondary" className="px-3 py-1 gap-1.5 text-sm font-medium bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
                    <Shield className="h-3.5 w-3.5" />
                    {ROLE_LABELS[convexUser.role]}
                  </Badge>
                )}
                <Badge
                  variant={convexUser?.isActive ? "default" : "destructive"}
                  className="px-3 py-1 text-sm font-medium"
                >
                  {convexUser?.isActive ? "Active Account" : "Inactive Account"}
                </Badge>
              </div>

              {convexUser?.createdAt && (
                <p className="text-xs text-muted-foreground">
                  Member since {new Date(convexUser.createdAt).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for different sections */}
      <Tabs defaultValue="personal" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="personal" className="gap-2">
            <User className="h-4 w-4" />
            Personal Info
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Lock className="h-4 w-4" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                {isManager
                  ? "Update your personal details and contact information"
                  : "View your personal details and contact information"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isManager ? (
                // Manager: Show editable form
                <PersonalInfoForm
                  convexUser={convexUser}
                  clerkUserId={user.id}
                />
              ) : (
                // Non-manager: Show read-only view
                <div className="space-y-6">
                  {/* Username */}
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Username</Label>
                    <p className="text-sm font-medium">@{convexUser?.username || user.username}</p>
                  </div>

                  {/* Full Name */}
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Full Name</Label>
                    <p className="text-sm font-medium">{convexUser?.fullName || "Not set"}</p>
                  </div>

                  {/* Phone Number */}
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Phone Number</Label>
                    <p className="text-sm font-medium">{convexUser?.phoneNumber || "Not set"}</p>
                  </div>

                  {/* Address */}
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Address</Label>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium flex-1">{convexUser?.address || "Not set"}</p>
                      {convexUser?.address && (
                        <button
                          onClick={() => handleOpenInMap(convexUser.address)}
                          className="text-primary hover:text-primary/80 hover:bg-primary/10 rounded-full p-2 transition-colors shrink-0 border border-primary/20 hover:border-primary/40"
                          title="Open in Maps"
                        >
                          <MapPin className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Role */}
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Role</Label>
                    <p className="text-sm font-medium capitalize">
                      {convexUser?.role ? ROLE_LABELS[convexUser.role] : "Not set"}
                    </p>
                  </div>

                  {/* Info Message */}
                  <div className="rounded-lg border bg-muted/50 p-4 flex items-start gap-3">
                    <Shield className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium mb-1">Profile Management</p>
                      <p className="text-sm text-muted-foreground">
                        Only managers can edit user profiles and change passwords. Contact your administrator if you need to update your information.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{isManager ? "Change Password" : "Security Settings"}</CardTitle>
              <CardDescription>
                {isManager
                  ? "Update your password to keep your account secure"
                  : "Your account security information"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isManager ? (
                // Manager: Show password change form
                <PasswordForm />
              ) : (
                // Non-manager: Show read-only view
                <div className="space-y-6">
                  {/* Password Info */}
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Password</Label>
                    <p className="text-sm font-medium">••••••••</p>
                  </div>

                  {/* Last Updated */}
                  {convexUser?.updatedAt && (
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Last Updated</Label>
                      <p className="text-sm font-medium">
                        {new Date(convexUser.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  )}

                  {/* Info Message */}
                  <div className="rounded-lg border bg-muted/50 p-4 flex items-start gap-3">
                    <Lock className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium mb-1">Password Management</p>
                      <p className="text-sm text-muted-foreground">
                        Only managers can change passwords. Contact your administrator if you need to reset your password.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

