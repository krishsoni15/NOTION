"use client";

/**
 * Personal Info Form Component
 * 
 * Form for editing user's personal information.
 */

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Save, X, Edit, Camera } from "lucide-react";
import { Doc } from "@/convex/_generated/dataModel";
import { AddressAutocomplete } from "@/components/vendors/address-autocomplete";

interface PersonalInfoFormProps {
  convexUser: Doc<"users"> | null | undefined;
  clerkUserId: string;
}

export function PersonalInfoForm({ convexUser, clerkUserId }: PersonalInfoFormProps) {
  const updateProfile = useMutation(api.users.updateProfile);

  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    fullName: "",
    phoneNumber: "",
    address: "",
  });

  // Image upload state
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [shouldRemoveImage, setShouldRemoveImage] = useState(false);

  // Initialize form data when convexUser is loaded
  useEffect(() => {
    if (convexUser) {
      setFormData({
        fullName: convexUser.fullName || "",
        phoneNumber: convexUser.phoneNumber || "",
        address: convexUser.address || "",
      });
      // Set initial image preview
      setImagePreview(convexUser.profileImage || null);
      setSelectedImage(null);
      setShouldRemoveImage(false);
    }
  }, [convexUser]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }
      setSelectedImage(file);
      setShouldRemoveImage(false);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setShouldRemoveImage(true);
  };

  const uploadImage = async (file: File) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      // We use the clerkUserId as a reference since we might not have the Convex ID easily accessible if not passed? 
      // Actually convexUser._id is available
      formData.append("userId", convexUser!._id);

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
    setIsLoading(true);

    try {
      // Handle Image Upload
      let profileImage = convexUser!.profileImage;
      let profileImageKey = convexUser!.profileImageKey;

      if (shouldRemoveImage) {
        profileImage = undefined;
        profileImageKey = undefined;
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

      await updateProfile({
        clerkUserId,
        fullName: formData.fullName,
        phoneNumber: formData.phoneNumber,
        address: formData.address,
        profileImage,
        profileImageKey,
      });

      toast.success("Profile updated successfully!");
      setIsEditing(false);
    } catch (error) {
      toast.error("Failed to update your profile. Please try again.");
    } finally {
      setIsLoading(false);
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    // Reset form to original values
    if (convexUser) {
      setFormData({
        fullName: convexUser.fullName || "",
        phoneNumber: convexUser.phoneNumber || "",
        address: convexUser.address || "",
      });
      // Reset image too
      setImagePreview(convexUser.profileImage || null);
      setSelectedImage(null);
      setShouldRemoveImage(false);
    }
    setIsEditing(false);
  };

  if (!convexUser) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Loading profile information...
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Username (read-only) */}
      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          value={convexUser.username}
          disabled
          className="bg-muted"
        />
        <p className="text-xs text-muted-foreground">
          Username cannot be changed for security reasons
        </p>
      </div>

      {/* Profile Image - Only show when editing, or read-only view in header handles it */}
      {isEditing && (
        <div className="flex flex-col gap-2">
          <Label>Profile Photo</Label>
          <div className="flex items-center gap-4">
            <div className="relative group">
              <div className="h-20 w-20 rounded-full overflow-hidden border-2 border-border relative bg-muted flex items-center justify-center">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Profile"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Camera className="h-8 w-8 text-muted-foreground/50" />
                )}

                {/* Overlay for edit */}
                <label
                  htmlFor="personal-profile-image-upload"
                  className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white text-xs font-medium"
                >
                  {imagePreview ? "Change" : "Upload"}
                </label>
              </div>

              {imagePreview && (
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-1 shadow-sm hover:bg-destructive/90 transition-colors"
                  title="Remove photo"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">Profile Photo</p>
              <p className="text-xs text-muted-foreground">Click to upload or change your photo.</p>
            </div>

            <input
              id="personal-profile-image-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
              disabled={isLoading || isUploading}
            />
          </div>
        </div>
      )}

      {/* Full Name */}
      <div className="space-y-2">
        <Label htmlFor="fullName">Full Name *</Label>
        <Input
          id="fullName"
          value={formData.fullName}
          onChange={(e) =>
            setFormData({ ...formData, fullName: e.target.value })
          }
          disabled={!isEditing || isLoading}
          required
          placeholder="John Doe"
          className={!isEditing ? "bg-muted cursor-not-allowed" : "bg-background border-2 border-primary focus:border-primary"}
        />
      </div>

      {/* Phone Number */}
      <div className="space-y-2">
        <Label htmlFor="phoneNumber">
          Phone Number <span className="text-muted-foreground text-xs">(optional)</span>
        </Label>
        <Input
          id="phoneNumber"
          type="tel"
          value={formData.phoneNumber}
          onChange={(e) =>
            setFormData({ ...formData, phoneNumber: e.target.value })
          }
          disabled={!isEditing || isLoading}
          placeholder="+1234567890"
          className={!isEditing ? "bg-muted cursor-not-allowed" : "bg-background border-2 border-primary focus:border-primary"}
        />
      </div>

      {/* Address */}
      <AddressAutocomplete
        value={formData.address}
        onChange={(address) => setFormData({ ...formData, address })}
        disabled={!isEditing || isLoading}
        label="Address"
        placeholder="Search address or type manually..."
        id="address"
        showMapLink={true}
      />

      {/* Role (read-only) */}
      <div className="space-y-2">
        <Label htmlFor="role">Role</Label>
        <Input
          id="role"
          value={convexUser.role.toUpperCase().replace("_", " ")}
          disabled
          className="bg-muted"
        />
        <p className="text-xs text-muted-foreground">
          Contact your administrator to change your role
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-6 border-t">
        {!isEditing ? (
          <Button
            type="button"
            onClick={() => setIsEditing(true)}
            size="lg"
            className="gap-2"
          >
            <Edit className="h-4 w-4" />
            Edit Profile
          </Button>
        ) : (
          <div className="flex gap-3 w-full">
            <Button
              type="submit"
              disabled={isLoading || isUploading}
              size="lg"
              className="gap-2 flex-1"
            >
              {isLoading || isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isUploading ? "Uploading..." : "Saving..."}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading || isUploading}
              size="lg"
              className="gap-2"
            >
              <X className="h-4 w-4" />
              Cancel
            </Button>
          </div>
        )}
      </div>
    </form>
  );
}

