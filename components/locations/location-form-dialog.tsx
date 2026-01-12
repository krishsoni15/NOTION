"use client";

/**
 * Site Form Dialog
 * 
 * Dialog for creating and editing sites (Manager only).
 */

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
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
import { Checkbox } from "@/components/ui/checkbox";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
// ... imports
import { AddressAutocomplete } from "@/components/vendors/address-autocomplete";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface LocationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId?: Id<"sites"> | null;
  initialData?: {
    name: string;
    code?: string;
    address?: string;
    description?: string;
    type?: "site" | "inventory";
    isActive?: boolean;
  } | null;
}

export function LocationFormDialog({
  open,
  onOpenChange,
  locationId,
  initialData,
}: LocationFormDialogProps) {
  const createLocation = useMutation(api.sites.createSite);
  const updateLocation = useMutation(api.sites.updateSite);
  const allLocations = useQuery(api.sites.getAllSites, {});

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState<{
    name: string;
    code: string;
    address: string;
    description: string;
    type: "site" | "inventory";
    isActive: boolean;
  }>({
    name: "",
    code: "",
    address: "",
    description: "",
    type: "site",
    isActive: true,
  });

  // Check for duplicate location name
  useEffect(() => {
    if (formData.name.trim() && !locationId) {
      const nameLower = formData.name.trim().toLowerCase();
      const existingLocation = allLocations?.find(
        (loc) => loc.name.toLowerCase() === nameLower && loc.isActive
      );
      if (existingLocation) {
        setError(`Location "${formData.name}" already exists`);
      } else {
        setError("");
      }
    } else {
      setError("");
    }
  }, [formData.name, allLocations, locationId]);

  // Load initial data when editing
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        code: initialData.code || "",
        address: initialData.address || "",
        description: initialData.description || "",
        type: (initialData.type as "site" | "inventory") || "site",
        isActive: initialData.isActive !== undefined ? initialData.isActive : true,
      });
    } else {
      setFormData({
        name: "",
        code: "",
        address: "",
        description: "",
        type: "site",
        isActive: true,
      });
    }
    setError("");
  }, [initialData, open]);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setFormData({
        name: "",
        code: "",
        address: "",
        description: "",
        type: "site",
        isActive: true,
      });
      setError("");
    }
    onOpenChange(newOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.name.trim()) {
      setError("Location name is required");
      return;
    }

    // Check for duplicate before submitting (only for new locations)
    if (!locationId) {
      const nameLower = formData.name.trim().toLowerCase();
      const existingLocation = allLocations?.find(
        (loc) => loc.name.toLowerCase() === nameLower && loc.isActive
      );
      if (existingLocation) {
        setError(`Location "${formData.name}" already exists`);
        return;
      }
    }

    setIsLoading(true);

    try {
      if (locationId) {
        // Update existing location
        await updateLocation({
          siteId: locationId,
          name: formData.name.trim(),
          code: formData.type === "site" ? (formData.code.trim() || undefined) : undefined,
          address: formData.address.trim() || undefined,
          description: formData.description.trim() || undefined,
          type: formData.type,
          isActive: formData.isActive,
        });
        toast.success("Location updated successfully");
      } else {
        // Create new location
        await createLocation({
          name: formData.name.trim(),
          code: formData.type === "site" ? (formData.code.trim() || undefined) : undefined,
          address: formData.address.trim() || undefined,
          description: formData.description.trim() || undefined,
          type: formData.type,
        });
        toast.success("Location created successfully");
      }

      handleOpenChange(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save location";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{locationId ? "Edit Location" : "Add New Location"}</DialogTitle>
          <DialogDescription>
            {locationId
              ? "Update location information. Required fields are marked with *."
              : "Create a new location. Required fields are marked with *."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Location Type Selection */}
          <div className="space-y-2">
            <Label>Location Type *</Label>
            <RadioGroup
              defaultValue="site"
              value={formData.type}
              onValueChange={(value) => setFormData({ ...formData, type: value as "site" | "inventory" })}
              className="flex gap-4"
              disabled={isLoading || !!locationId} // Disable type change on edit to prevent confusion or data loss, or allow it? User didn't specify, but usually changing type is rare. Let's allow it for now if new, maybe disable on edit if critical. For now allow.
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="site" id="type-site" />
                <Label htmlFor="type-site" className="cursor-pointer font-normal">Site</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="inventory" id="type-inventory" />
                <Label htmlFor="type-inventory" className="cursor-pointer font-normal">Inventory</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-sm">{formData.type === "inventory" ? "Inventory Name *" : "Site Name *"}</Label>
            <Input
              id="name"
              placeholder={formData.type === "inventory" ? "Enter inventory name" : "Enter site name"}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={isLoading}
              className="h-9"
              required
            />
            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}
          </div>

          {/* Show Code only for Site type */}
          {formData.type === "site" && (
            <div className="space-y-1.5">
              <Label htmlFor="code" className="text-sm">
                Site Code <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <Input
                id="code"
                placeholder="Enter site code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                disabled={isLoading}
                className="h-9"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <AddressAutocomplete
              value={formData.address}
              onChange={(address) => setFormData({ ...formData, address })}
              disabled={isLoading}
              label="Address"
              placeholder="Search address..."
              id="address"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-sm">
              Description <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Input
              id="description"
              placeholder="Enter location description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              disabled={isLoading}
              className="h-9"
            />
          </div>

          {locationId && (
            <div className="flex items-center space-x-2 py-2">
              <Checkbox
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked as boolean })}
                disabled={isLoading}
              />
              <Label htmlFor="isActive" className="text-sm cursor-pointer">Active Status</Label>
            </div>
          )}

          {error && !error.includes("already exists") && (
            <div className="text-sm text-destructive">{error}</div>
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
            <Button type="submit" disabled={isLoading || !!error}>
              {isLoading ? "Saving..." : locationId ? "Update Location" : "Create Location"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

