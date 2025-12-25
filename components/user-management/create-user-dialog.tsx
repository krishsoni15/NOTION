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
import { Eye, EyeOff } from "lucide-react";
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

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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
    }
    onOpenChange(newOpen);
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
      
      await createUser({
        clerkUserId,
        username: formData.username,
        fullName: formData.fullName,
        phoneNumber: formData.phoneNumber,
        address: formData.address,
        role: formData.role as Role,
        assignedSites: assignedSites,
      });

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
            Create a new user account and assign a role. Required fields are marked with *.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
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
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <span className="mr-2">Creating...</span>
                  <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                </>
              ) : (
                "Create User"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

