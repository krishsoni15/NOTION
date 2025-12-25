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
import { AddressAutocomplete } from "@/components/vendors/address-autocomplete";

interface SiteFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siteId?: Id<"sites"> | null;
  initialData?: {
    name: string;
    code?: string;
    address?: string;
    description?: string;
    isActive?: boolean;
  } | null;
}

export function SiteFormDialog({
  open,
  onOpenChange,
  siteId,
  initialData,
}: SiteFormDialogProps) {
  const createSite = useMutation(api.sites.createSite);
  const updateSite = useMutation(api.sites.updateSite);
  const allSites = useQuery(api.sites.getAllSites, {});

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    address: "",
    description: "",
    isActive: true,
  });

  // Check for duplicate site name
  useEffect(() => {
    if (formData.name.trim() && !siteId) {
      const siteNameLower = formData.name.trim().toLowerCase();
      const existingSite = allSites?.find(
        (site) => site.name.toLowerCase() === siteNameLower && site.isActive
      );
      if (existingSite) {
        setError(`Site "${formData.name}" already exists`);
      } else {
        setError("");
      }
    } else {
      setError("");
    }
  }, [formData.name, allSites, siteId]);

  // Load initial data when editing
  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name,
        code: initialData.code || "",
        address: initialData.address || "",
        description: initialData.description || "",
        isActive: initialData.isActive !== undefined ? initialData.isActive : true,
      });
    } else {
      setFormData({
        name: "",
        code: "",
        address: "",
        description: "",
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
      setError("Site name is required");
      return;
    }

    // Check for duplicate before submitting (only for new sites)
    if (!siteId) {
      const siteNameLower = formData.name.trim().toLowerCase();
      const existingSite = allSites?.find(
        (site) => site.name.toLowerCase() === siteNameLower && site.isActive
      );
      if (existingSite) {
        setError(`Site "${formData.name}" already exists`);
        return;
      }
    }

    setIsLoading(true);

    try {
      if (siteId) {
        // Update existing site
        await updateSite({
          siteId,
          name: formData.name.trim(),
          code: formData.code.trim() || undefined,
          address: formData.address.trim() || undefined,
          description: formData.description.trim() || undefined,
          isActive: formData.isActive,
        });
        toast.success("Site updated successfully");
      } else {
        // Create new site
        await createSite({
          name: formData.name.trim(),
          code: formData.code.trim() || undefined,
          address: formData.address.trim() || undefined,
          description: formData.description.trim() || undefined,
        });
        toast.success("Site created successfully");
      }

      handleOpenChange(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save site";
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
          <DialogTitle>{siteId ? "Edit Site" : "Add New Site"}</DialogTitle>
          <DialogDescription>
            {siteId
              ? "Update site information. Required fields are marked with *."
              : "Create a new site. Required fields are marked with *."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-sm">Site Name *</Label>
            <Input
              id="name"
              placeholder="Enter site name"
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
              placeholder="Enter site description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              disabled={isLoading}
              className="h-9"
            />
          </div>

          {siteId && (
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
              {isLoading ? "Saving..." : siteId ? "Update Site" : "Create Site"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

