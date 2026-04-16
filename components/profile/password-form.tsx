"use client";

/**
 * Password Form Component
 * 
 * Form for changing user's password.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Save, Eye, EyeOff } from "lucide-react";

export function PasswordForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validate passwords match
      if (formData.newPassword !== formData.confirmPassword) {
        toast.error("New passwords do not match!");
        setIsLoading(false);
        return;
      }

      // Validate password length
      if (formData.newPassword.length < 6) {
        toast.error("Password must be at least 6 characters long!");
        setIsLoading(false);
        return;
      }

      // Call API to change password
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to change password");
      }

      toast.success("Password changed successfully!");
      
      // Reset form
      setFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to change password";
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Current Password */}
      <div className="space-y-2">
        <Label htmlFor="currentPassword">Current Password *</Label>
        <div className="relative">
          <Input
            id="currentPassword"
            type={showCurrentPassword ? "text" : "password"}
            value={formData.currentPassword}
            onChange={(e) =>
              setFormData({ ...formData, currentPassword: e.target.value })
            }
            disabled={isLoading}
            required
            placeholder="Enter current password"
            className="pr-10"
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

      {/* New Password */}
      <div className="space-y-2">
        <Label htmlFor="newPassword">New Password *</Label>
        <div className="relative">
          <Input
            id="newPassword"
            type={showNewPassword ? "text" : "password"}
            value={formData.newPassword}
            onChange={(e) =>
              setFormData({ ...formData, newPassword: e.target.value })
            }
            disabled={isLoading}
            required
            minLength={6}
            placeholder="Enter new password"
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowNewPassword(!showNewPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            disabled={isLoading}
            tabIndex={-1}
          >
            {showNewPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          At least 6 characters required
        </p>
      </div>

      {/* Confirm New Password */}
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm New Password *</Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            value={formData.confirmPassword}
            onChange={(e) =>
              setFormData({ ...formData, confirmPassword: e.target.value })
            }
            disabled={isLoading}
            required
            minLength={6}
            placeholder="Confirm new password"
            className="pr-10"
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

      {/* Password Requirements */}
      <div className="rounded-lg border bg-muted/50 p-4">
        <p className="text-sm font-medium mb-2">Password Requirements:</p>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li className="flex items-center gap-2">
            <span className={formData.newPassword.length >= 6 ? "text-green-500" : ""}>
              {formData.newPassword.length >= 6 ? "✓" : "○"}
            </span>
            At least 6 characters
          </li>
        </ul>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isLoading}
        className="gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Changing Password...
          </>
        ) : (
          <>
            <Save className="h-4 w-4" />
            Change Password
          </>
        )}
      </Button>
    </form>
  );
}

