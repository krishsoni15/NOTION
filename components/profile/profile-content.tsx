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
import { Button } from "@/components/ui/button";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { PersonalInfoForm } from "./personal-info-form";
import { PasswordForm } from "./password-form";
import { SignatureUploadDialog } from "./signature-upload-dialog";
import { User, Lock, Shield, MapPin, Camera, Pen } from "lucide-react";
import { UserAvatar } from "@/components/user-management/user-avatar";

export function ProfileContent() {
  const { user, isLoaded } = useUser();
  const convexUser = useQuery(
    api.users.getUserByClerkId,
    isLoaded && user ? { clerkUserId: user.id } : "skip"
  );

  // All hooks must be called before any conditional returns
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);

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
      <Card className="overflow-hidden border-border/50 shadow-md">
        <div className="h-32 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent" />
        <CardContent className="p-6 relative">
          <div className="flex flex-col sm:flex-row items-end sm:items-end gap-6 -mt-12">
            <div className="relative group cursor-pointer" onClick={() => {
              const input = document.getElementById('personal-profile-image-upload') as HTMLInputElement;
              if (input) {
                // Smooth scroll to the form first if not visible
                document.querySelector('.personal-info-card')?.scrollIntoView({ behavior: 'smooth' });
                // We need to trigger edit mode first, but since the input is hidden, 
                // we'll just handle this gracefully in the form component or by clicking it directly.
                input.click();
              }
            }}>
              <UserAvatar
                name={displayName}
                image={convexUser?.profileImage}
                size="xl"
                className="h-32 w-32 border-4 border-background shadow-xl rounded-full transition-transform group-hover:scale-[1.02]"
              />
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border-4 border-white/20">
                <Camera className="h-8 w-8 text-white" />
              </div>
              <div className={cn(
                "absolute bottom-2 right-2 h-6 w-6 rounded-full border-2 border-background flex items-center justify-center",
                convexUser?.isActive ? "bg-green-500" : "bg-destructive"
              )}>
                {convexUser?.isActive && <div className="h-2 w-2 bg-white rounded-full animate-pulse" />}
              </div>
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
          <Card className="personal-info-card">
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Update your personal details and profile photo to keep your account information current.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Show editable form for all users on their own profile */}
              <PersonalInfoForm
                convexUser={convexUser}
                clerkUserId={user.id}
              />

              {/* Admin Info Message */}
              {!isManager && (
                <div className="mt-6 rounded-lg border bg-muted/50 p-4 flex items-start gap-3">
                  <Shield className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium mb-1">Profile Permissions</p>
                    <p className="text-sm text-muted-foreground">
                      You can update your personal details and profile photo. Contact your administrator if you need to change your assigned role or site locations.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Signature Section - Manager Only */}
          {isManager && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Pen className="h-5 w-5" />
                  Digital Signature
                </CardTitle>
                <CardDescription>
                  Your signature will appear on approved Purchase Orders
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  {/* Current Signature Preview */}
                  <div className="flex-1 border rounded-lg bg-white dark:bg-slate-900 p-4 min-h-[80px] flex items-center justify-center">
                    {convexUser?.signatureUrl ? (
                      <img
                        src={convexUser.signatureUrl}
                        alt="Your signature"
                        className="max-h-16 max-w-full object-contain"
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground italic">No signature uploaded</p>
                    )}
                  </div>

                  {/* Upload Button */}
                  <Button
                    variant={convexUser?.signatureUrl ? "outline" : "default"}
                    onClick={() => setSignatureDialogOpen(true)}
                    className="shrink-0"
                  >
                    <Pen className="h-4 w-4 mr-2" />
                    {convexUser?.signatureUrl ? "Change" : "Add Signature"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Signature Upload Dialog */}
          <SignatureUploadDialog
            open={signatureDialogOpen}
            onOpenChange={setSignatureDialogOpen}
          />
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>{isManager ? "Change Password" : "Security Settings"}</CardTitle>
              <CardDescription>
                Update your password regularly to keep your account secure.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PasswordForm />

              {!isManager && (
                <div className="mt-6 rounded-lg border bg-muted/50 p-4 flex items-start gap-3">
                  <Lock className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium mb-1">Account Security</p>
                    <p className="text-sm text-muted-foreground">
                      Keep your account secure by using a strong password. If you forget your password, please contact your manager for a reset.
                    </p>
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
