"use client";

/**
 * Edit User Dialog Component
 * 
 * Dialog for editing existing users (Manager only).
 * Includes password change capability.
 */

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { useAuth } from "@/app/providers/auth-provider";
import { api } from "@/convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROLES, ROLE_LABELS, Role } from "@/lib/auth/roles";
import { Eye, EyeOff, Loader2, Save, X, Camera } from "lucide-react";
import { MediaInput } from "@/components/shared/media-input";
import { Doc } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { SiteSelector } from "./site-selector";
import { AddressAutocomplete } from "@/components/vendors/address-autocomplete";
import type { Id } from "@/convex/_generated/dataModel";

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: Doc<"users"> | null;
}

export function EditUserDialog({ open, onOpenChange, user }: EditUserDialogProps) {
  const updateUser = useMutation(api.users.updateUser);

  const generateUploadUrl = useMutation(api.users.generateSignatureUploadUrl);
  const { user: authUser } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Check if editing yourself
  const isEditingSelf = user?.clerkUserId === authUser?.userId;

  // Image upload state
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isImagePopoverOpen, setIsImagePopoverOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [shouldRemoveImage, setShouldRemoveImage] = useState(false);

  // Signature state
  const [selectedSignature, setSelectedSignature] = useState<File | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    fullName: "",
    phoneNumber: "",
    address: "",
    role: "" as Role | "",
    assignedSites: [] as Id<"sites">[],
    password: "", // Optional - only if manager wants to change it
    currentPassword: "", // For self password change
    confirmPassword: "", // For password confirmation
  });

  // Initialize form when user changes or dialog opens
  useEffect(() => {
    if (user && open) {
      setFormData({
        fullName: user.fullName || "",
        phoneNumber: user.phoneNumber || "",
        address: user.address || "",
        role: user.role,
        assignedSites: user.assignedSites || [],
        password: "", // Always empty for security
        currentPassword: "",
        confirmPassword: "",
      });
      // Set initial image preview
      setImagePreview(user.profileImage || null);
      setSelectedImage(null);
      setShouldRemoveImage(false);

      // Set initial signature preview
      setSelectedSignature(null);
    }
  }, [user, open]);



  const handleImageChange = (file: File | null) => {
    setSelectedImage(file);
    if (file) {
      setShouldRemoveImage(false);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      // If setting to null (removing), or just cancelling?
      // If we are just clearing selection:
      // But MediaInput usually returns a file if selected.
      // If cleared, we assume removal?
      // MediaInput returns null on clear.
      // So if null, we might be removing or just resetting.
    }
    setIsImagePopoverOpen(false);
  };

  const handleRemoveImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedImage(null);
    setImagePreview(null);
    setShouldRemoveImage(true);
  };

  const uploadImage = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      // We don't have itemId, let's use userId or just generic upload
      // Ideally backend handles key generation if no ID provided, or we pass userId
      formData.append("userId", user!._id);

      const response = await fetch("/api/upload/image", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload image");
      }

      const data = await response.json();
      return { imageUrl: data.imageUrl, imageKey: data.imageKey };
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);

    try {
      // If editing yourself and changing password, validate
      if (isEditingSelf && formData.password) {
        if (!formData.currentPassword) {
          toast.error("Current password is required to change your password");
          setIsLoading(false);
          return;
        }
        if (formData.password !== formData.confirmPassword) {
          toast.error("New passwords do not match!");
          setIsLoading(false);
          return;
        }
        if (formData.password.length < 6) {
          toast.error("Password must be at least 6 characters!");
          setIsLoading(false);
          return;
        }
      }

      // Handle Image Upload
      let profileImage = user.profileImage;
      let profileImageKey = user.profileImageKey;

      if (shouldRemoveImage) {
        profileImage = undefined;
        profileImageKey = undefined;
        // Ideally verify deletion from storage too, but Convex handles cleanup or we leave it (orphaned)
      } else if (selectedImage) {
        setIsUploading(true);
        try {
          const imageData = await uploadImage(selectedImage);
          profileImage = imageData.imageUrl;
          profileImageKey = imageData.imageKey;
        } catch (uploadError) {
          toast.error("Failed to upload profile image");
          setIsLoading(false);
          setIsUploading(false);
          return;
        }
      }

      // Handle Signature Upload
      let signatureStorageId: Id<"_storage"> | undefined;
      if (selectedSignature && formData.role === ROLES.MANAGER) {
        setIsUploading(true);
        try {
          // Get upload URL
          const postUrl = await generateUploadUrl();

          // Upload file
          const result = await fetch(postUrl, {
            method: "POST",
            headers: { "Content-Type": selectedSignature.type },
            body: selectedSignature,
          });

          if (!result.ok) {
            throw new Error(`Upload failed: ${result.statusText}`);
          }

          const { storageId } = await result.json();
          signatureStorageId = storageId;
        } catch (uploadError) {
          console.error("Failed to upload signature:", uploadError);
          toast.warning("Failed to upload signature, continuing with update...");
        }
      }

      // If password is provided, get it hashed first via the API
      let newPasswordHash: string | undefined = undefined;

      if (formData.password && formData.password.length >= 6) {
        if (isEditingSelf) {
          // For self: use change-password API with current password
          const response = await fetch("/api/auth/change-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              currentPassword: formData.currentPassword,
              newPassword: formData.password,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to change password");
          }
          const data = await response.json();
          newPasswordHash = data.passwordHash;
        } else {
          // For others: use admin API (no current password needed)
          const response = await fetch("/api/admin/update-user-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              clerkUserId: user.clerkUserId,
              newPassword: formData.password,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to update password");
          }
          const data = await response.json();
          newPasswordHash = data.passwordHash;
        }
      }

      // Update user in Convex
      await updateUser({
        userId: user._id,
        fullName: formData.fullName,
        phoneNumber: formData.phoneNumber,
        address: formData.address,
        role: formData.role as Role,
        assignedSites: formData.assignedSites,
        profileImage,
        profileImageKey,
        signatureStorageId,
        passwordHash: newPasswordHash,
      });

      toast.success(isEditingSelf ? "Profile updated successfully!" : "User updated successfully!");
      onOpenChange(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update user";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset form when closing
      setFormData({
        fullName: "",
        phoneNumber: "",
        address: "",
        role: "",
        assignedSites: [],
        password: "",
        currentPassword: "",
        confirmPassword: "",
      });
      setShowPassword(false);
      setShowCurrentPassword(false);
      setShowConfirmPassword(false);
      setSelectedSignature(null);
      setShowConfirmPassword(false);
      setSelectedSignature(null);
    }
    onOpenChange(newOpen);
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditingSelf ? "Edit Your Profile" : "Edit User"}</DialogTitle>
          <DialogDescription>
            {isEditingSelf
              ? "Update your profile information. Your role cannot be changed for security."
              : "Update user information and permissions. Leave password empty to keep unchanged."
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Username (read-only) */}
          <div className="space-y-1.5">
            <Label htmlFor="username" className="text-sm">Username</Label>
            <Input
              id="username"
              value={user.username}
              disabled
              className="bg-muted h-9"
            />
          </div>

          {/* Profile Image */}
          <div className="flex flex-col items-center gap-4 py-2">
            <Popover open={isImagePopoverOpen} onOpenChange={setIsImagePopoverOpen}>
              <PopoverTrigger asChild>
                <div className="relative group cursor-pointer">
                  <div className="h-24 w-24 rounded-full overflow-hidden border-2 border-border relative bg-muted flex items-center justify-center transition-all hover:border-primary/50">
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Profile"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-3xl font-bold text-muted-foreground/50">
                        {user.fullName?.[0]?.toUpperCase() || "U"}
                      </span>
                    )}

                    {/* Overlay for edit */}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-medium">
                      Change
                    </div>
                  </div>

                  {imagePreview && (
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-1 shadow-sm hover:bg-destructive/90 transition-colors z-10"
                      title="Remove photo"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="center">
                <div className="p-4">
                  <h4 className="font-medium mb-2">Update Profile Photo</h4>
                  <MediaInput
                    onValueChange={handleImageChange}
                    type="image"
                    className="w-full"
                    initialPreview={null}
                  />
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Full Name */}
          <div className="space-y-1.5">
            <Label htmlFor="fullName" className="text-sm">Full Name *</Label>
            <Input
              id="fullName"
              placeholder="John Doe"
              value={formData.fullName}
              onChange={(e) =>
                setFormData({ ...formData, fullName: e.target.value })
              }
              required
              disabled={isLoading}
              className="h-9"
            />
          </div>

          {/* Password Section */}
          {isEditingSelf ? (
            // Self: Show current + new + confirm password
            <>
              <div className="space-y-1.5">
                <Label htmlFor="currentPassword" className="text-sm">
                  Current Password <span className="text-muted-foreground text-xs">(required to change password)</span>
                </Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? "text" : "password"}
                    placeholder="Enter current password"
                    value={formData.currentPassword}
                    onChange={(e) =>
                      setFormData({ ...formData, currentPassword: e.target.value })
                    }
                    disabled={isLoading}
                    className="pr-10 h-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    disabled={isLoading}
                    tabIndex={-1}
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm">
                  New Password <span className="text-muted-foreground text-xs">(optional - leave empty to keep current)</span>
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter new password (min 6 characters)"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    disabled={isLoading}
                    minLength={6}
                    className="pr-10 h-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    disabled={isLoading}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-sm">
                  Confirm New Password <span className="text-muted-foreground text-xs">(optional)</span>
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm new password"
                    value={formData.confirmPassword}
                    onChange={(e) =>
                      setFormData({ ...formData, confirmPassword: e.target.value })
                    }
                    disabled={isLoading}
                    minLength={6}
                    className="pr-10 h-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    disabled={isLoading}
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : (
            // Others: Just new password (no current password needed)
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm">
                New Password <span className="text-muted-foreground text-xs">(leave empty to keep current)</span>
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password (min 6 characters)"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  disabled={isLoading}
                  minLength={6}
                  className="pr-10 h-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  disabled={isLoading}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {formData.password && formData.password.length < 6 && (
                <p className="text-xs text-destructive">
                  Password must be at least 6 characters
                </p>
              )}
            </div>
          )}

          {/* Phone Number */}
          <div className="space-y-1.5">
            <Label htmlFor="phoneNumber" className="text-sm">
              Phone <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Input
              id="phoneNumber"
              type="tel"
              placeholder="+91 9876543210"
              value={formData.phoneNumber}
              onChange={(e) =>
                setFormData({ ...formData, phoneNumber: e.target.value })
              }
              disabled={isLoading}
              className="h-9"
            />
          </div>

          {/* Address */}
          <AddressAutocomplete
            value={formData.address}
            onChange={(address) => setFormData({ ...formData, address })}
            disabled={isLoading}
            label="Address"
            placeholder="Search address or type manually..."
            id="address"
            showMapLink={true}
          />

          {/* Role */}
          <div className="space-y-1.5">
            <Label htmlFor="role" className="text-sm">Role *</Label>
            <Select
              value={formData.role}
              onValueChange={(value) =>
                setFormData({ ...formData, role: value as Role, assignedSites: [] })
              }
              disabled={isLoading || isEditingSelf}
            >
              <SelectTrigger className={isEditingSelf ? "bg-muted" : ""}>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ROLES.SITE_ENGINEER}>
                  {ROLE_LABELS[ROLES.SITE_ENGINEER]}
                </SelectItem>
                <SelectItem value={ROLES.MANAGER}>
                  {ROLE_LABELS[ROLES.MANAGER]}
                </SelectItem>
                <SelectItem value={ROLES.PURCHASE_OFFICER}>
                  {ROLE_LABELS[ROLES.PURCHASE_OFFICER]}
                </SelectItem>
              </SelectContent>
            </Select>
            {isEditingSelf && (
              <p className="text-xs text-muted-foreground">
                You cannot change your own role for security reasons
              </p>
            )}
          </div>

          {/* Signature Upload - Only for Managers */}
          {formData.role === ROLES.MANAGER && (
            <div className="space-y-3 pt-1">
              <MediaInput
                initialPreview={user.signatureUrl}
                label="Digital Signature"
                onValueChange={setSelectedSignature}
                type="signature"
              />
              <p className="text-[10px] text-muted-foreground">
                This signature will be applied to approved Purchase Orders.
              </p>
            </div>
          )}

          {/* Site Selection - Only for Site Engineers */}
          {formData.role === ROLES.SITE_ENGINEER && (
            <div className="space-y-1.5">
              <SiteSelector
                selectedSites={formData.assignedSites}
                onSelectionChange={(sites) =>
                  setFormData({ ...formData, assignedSites: sites })
                }
                disabled={isLoading}
              />
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading || isUploading}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || isUploading} className="gap-2">
              {isLoading || isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isUploading ? "Uploading..." : "Updating..."}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog >
  );
}

