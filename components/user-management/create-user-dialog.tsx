"use client";

/**
 * Create User Dialog
 * 
 * Dialog for creating new users (Manager only).
 */

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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

import { Eye, EyeOff, Loader2, Camera, X } from "lucide-react";
import { MediaInput } from "@/components/shared/media-input";
import { SiteSelector } from "./site-selector";
import { AddressAutocomplete } from "@/components/vendors/address-autocomplete";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel";

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateUserDialog({ open, onOpenChange }: CreateUserDialogProps) {
  const createUser = useMutation(api.users.createUser);
  const updateUser = useMutation(api.users.updateUser);

  const generateUploadUrl = useMutation(api.users.generateSignatureUploadUrl);

  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Image state
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isImagePopoverOpen, setIsImagePopoverOpen] = useState(false);

  // Signature state
  const [selectedSignature, setSelectedSignature] = useState<File | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    username: "",
    fullName: "",
    phoneNumber: "",
    address: "",
    role: "" as Role | "",
    password: "",
    assignedSites: [] as Id<"sites">[],
  });

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset form when closing
      setFormData({
        username: "",
        fullName: "",
        phoneNumber: "",
        address: "",
        role: "",
        password: "",
        assignedSites: [],
      });
      setShowPassword(false);
      setError("");
      setError("");
      // Reset image
      setSelectedImage(null);
      setImagePreview(null);
      // Reset signature
      setSelectedSignature(null);
    }
    onOpenChange(newOpen);
  };



  const handleImageChange = (file: File | null) => {
    setSelectedImage(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
    setIsImagePopoverOpen(false);
  };

  const handleRemoveImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedImage(null);
    setImagePreview(null);
  };

  const uploadImage = async (file: File, userId: string) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("userId", userId);

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
    setError("");
    setIsLoading(true);

    try {
      // Validate site engineer has at least one site assigned
      if (formData.role === ROLES.SITE_ENGINEER && formData.assignedSites.length === 0) {
        setError("Please assign at least one site to the site engineer");
        setIsLoading(false);
        return;
      }

      // Step 0: Upload Signature if present (Manager only)
      let signatureStorageId: Id<"_storage"> | undefined;
      if (formData.role === ROLES.MANAGER && selectedSignature) {
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
          toast.warning("Failed to upload signature, continuing with user creation...");
        } finally {
          setIsUploading(false);
        }
      }

      // Step 1: Create user in Clerk via API
      const clerkResponse = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
          role: formData.role,
        }),
      });

      if (!clerkResponse.ok) {
        const errorData = await clerkResponse.json();
        throw new Error(errorData.error || "Failed to create user in Clerk");
      }

      const { clerkUserId } = await clerkResponse.json();

      // Step 2: Create user in Convex with assigned sites
      const assignedSites = formData.role === ROLES.SITE_ENGINEER && formData.assignedSites.length > 0
        ? formData.assignedSites
        : undefined;

      const userId = await createUser({
        clerkUserId,
        username: formData.username,
        fullName: formData.fullName,
        phoneNumber: formData.phoneNumber,
        address: formData.address,
        role: formData.role as Role,
        assignedSites: assignedSites,
        signatureStorageId: signatureStorageId,
      });

      // Step 3: Upload image if selected
      if (userId && selectedImage) {
        setIsUploading(true);
        try {
          const imageData = await uploadImage(selectedImage, userId);

          // Step 4: Update user with image
          await updateUser({
            userId,
            profileImage: imageData.imageUrl,
            profileImageKey: imageData.imageKey,
          });
        } catch (uploadError) {
          console.error("Failed to upload profile image:", uploadError);
          toast.warning("User created but profile image failed to upload");
        } finally {
          setIsUploading(false);
        }
      }

      // Show success message with site count
      const successMessage = formData.role === ROLES.SITE_ENGINEER && assignedSites
        ? `User created successfully with ${assignedSites.length} site(s) assigned!`
        : "User created successfully!";
      toast.success(successMessage);

      // Reset form and close dialog - handleOpenChange will reset the form
      handleOpenChange(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create user";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
          <DialogDescription>
            Add a new user to the system.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Profile Image */}
          {/* Profile Image */}
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
                      <Camera className="h-8 w-8 text-muted-foreground/50" />
                    )}

                    {/* Overlay */}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-medium">
                      {imagePreview ? "Change" : "Upload"}
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
                    initialPreview={null} // Don't show preview inside popover, we show it in circle
                  />
                </div>
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">Profile Photo (Optional)</p>
          </div>

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

          <div className="space-y-1.5">
            <Label htmlFor="username" className="text-sm">Username *</Label>
            <Input
              id="username"
              placeholder="johndoe"
              value={formData.username}
              onChange={(e) =>
                setFormData({ ...formData, username: e.target.value })
              }
              required
              disabled={isLoading}
              className="h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-sm">Password *</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter password (min 6 characters)"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required
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

          <AddressAutocomplete
            value={formData.address}
            onChange={(address) => setFormData({ ...formData, address })}
            disabled={isLoading}
            label="Address"
            placeholder="Search address or type manually..."
            id="address"
            showMapLink={true}
          />

          <div className="space-y-1.5">
            <Label htmlFor="role" className="text-sm">Role *</Label>
            <Select
              value={formData.role}
              onValueChange={(value) =>
                setFormData({ ...formData, role: value as Role, assignedSites: [] })
              }
              disabled={isLoading}
            >
              <SelectTrigger>
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

          </div>

          {/* Signature Upload - Only for Managers */}
          {formData.role === ROLES.MANAGER && (
            <div className="space-y-3 pt-1">
              <MediaInput
                label="Digital Signature *"
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

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3 flex items-start gap-2">
              <span className="text-destructive font-semibold">⚠</span>
              <span>{error}</span>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || isUploading}>
              {isLoading || isUploading ? (
                <>
                  <span className="mr-2">
                    {isUploading ? "Uploading..." : "Creating..."}
                  </span>
                  <Loader2 className="h-4 w-4 animate-spin" />
                </>
              ) : (
                "Create User"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog >
  );
}

