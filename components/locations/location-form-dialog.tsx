"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { AddressAutocomplete } from "@/components/vendors/address-autocomplete";

interface LocationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId?: Id<"sites"> | null;
  initialData?: {
    name: string;
    code?: string;
    address?: string;
    description?: string;
    type?: "site" | "inventory" | "other";
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

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    address: "",
    description: "",
    isActive: true,
  });

  // Duplicate name check
  useEffect(() => {
    if (formData.name.trim()) {
      const nameLower = formData.name.trim().toLowerCase();
      const exists = allLocations?.find(
        (loc) => loc.name.toLowerCase() === nameLower && loc.isActive && loc._id !== locationId
      );
      setError(exists ? `"${formData.name}" already exists` : "");
    } else {
      setError("");
    }
  }, [formData.name, allLocations, locationId]);

  // Load initial data
  useEffect(() => {
    if (open) {
      if (initialData) {
        setFormData({
          name: initialData.name,
          code: initialData.code || "",
          address: initialData.address || "",
          description: initialData.description || "",
          isActive: initialData.isActive !== undefined ? initialData.isActive : true,
        });
      } else {
        setFormData({ name: "", code: "", address: "", description: "", isActive: true });
      }
      setError("");
    }
  }, [locationId, open]);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setFormData({ name: "", code: "", address: "", description: "", isActive: true });
      setError("");
    }
    onOpenChange(newOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.name.trim()) { setError("Location name is required"); return; }
    if (!formData.address.trim()) { setError("Address is required"); return; }

    const nameLower = formData.name.trim().toLowerCase();
    const exists = allLocations?.find(
      (loc) => loc.name.toLowerCase() === nameLower && loc.isActive && loc._id !== locationId
    );
    if (exists) { setError(`"${formData.name}" already exists`); return; }

    setIsLoading(true);
    try {
      if (locationId) {
        await updateLocation({
          siteId: locationId,
          name: formData.name.trim(),
          code: formData.code.trim() || undefined,
          address: formData.address.trim() || undefined,
          description: formData.description.trim() || undefined,
          type: "site",
          isActive: formData.isActive,
        });
        toast.success("Location updated");
      } else {
        await createLocation({
          name: formData.name.trim(),
          code: formData.code.trim() || undefined,
          address: formData.address.trim() || undefined,
          description: formData.description.trim() || undefined,
          type: "site",
        });
        toast.success("Location created");
      }
      handleOpenChange(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save location";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{locationId ? "Edit Location" : "Add Location"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Location Name */}
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-sm font-medium">
              Location Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="e.g. Ahmedabad Site, Main Warehouse"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={isLoading}
              className="h-9"
              autoFocus
            />
            {error && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3 shrink-0" /> {error}
              </p>
            )}
          </div>

          {/* Address */}
          <div className="space-y-1.5">
            <AddressAutocomplete
              value={formData.address}
              onChange={(address) => setFormData({ ...formData, address })}
              disabled={isLoading}
              label="Address"
              placeholder="Search or enter address..."
              id="address"
              required={true}
              showMapLink={true}
            />
          </div>

          {/* Code (optional) */}
          <div className="space-y-1.5">
            <Label htmlFor="code" className="text-sm font-medium">
              Location Code <span className="text-xs text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              id="code"
              placeholder="e.g. AHM-01"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              disabled={isLoading}
              className="h-9"
            />
          </div>

          {/* Description (optional) */}
          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-sm font-medium">
              Description <span className="text-xs text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              id="description"
              placeholder="Brief notes about this location"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              disabled={isLoading}
              className="h-9"
            />
          </div>

          {/* Active status (edit only) */}
          {locationId && (
            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: !!checked })}
                disabled={isLoading}
              />
              <Label htmlFor="isActive" className="text-sm cursor-pointer">Active</Label>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !!error}>
              {isLoading ? "Saving..." : locationId ? "Update" : "Create Location"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
