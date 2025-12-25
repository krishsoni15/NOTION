/**
 * Create Site Dialog Component
 * 
 * Dialog for creating new sites.
 */

"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
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

interface CreateSiteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (data: {
    name: string;
    code?: string;
    address?: string;
    description?: string;
  }) => Promise<void>;
}

export function CreateSiteDialog({
  open,
  onOpenChange,
  onCreate,
}: CreateSiteDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    address: "",
    description: "",
  });

  const allSites = useQuery(api.sites.getAllSites, {});

  // Check for duplicate site name
  useEffect(() => {
    if (formData.name.trim()) {
      const siteNameLower = formData.name.trim().toLowerCase();
      const existingSite = allSites?.find(
        (site: { name: string }) => site.name.toLowerCase() === siteNameLower
      );
      if (existingSite) {
        setError(`Site "${formData.name}" already exists`);
      } else {
        setError("");
      }
    } else {
      setError("");
    }
  }, [formData.name, allSites]);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setFormData({
        name: "",
        code: "",
        address: "",
        description: "",
      });
      setError("");
    }
    // Only close this dialog, don't propagate to parent
    onOpenChange(newOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event from bubbling to parent form
    if (!formData.name.trim()) return;

    // Check for duplicate before submitting
    const siteNameLower = formData.name.trim().toLowerCase();
    const existingSite = allSites?.find(
      (site: { name: string }) => site.name.toLowerCase() === siteNameLower
    );
    if (existingSite) {
      setError(`Site "${formData.name}" already exists`);
      return;
    }

    setIsLoading(true);
    setError("");
    try {
      await onCreate({
        name: formData.name.trim(),
        code: formData.code.trim() || undefined,
        address: formData.address.trim() || undefined,
        description: formData.description.trim() || undefined,
      });
      // Reset form and close only this dialog
      setFormData({
        name: "",
        code: "",
        address: "",
        description: "",
      });
      setError("");
      onOpenChange(false);
    } catch (error: any) {
      // Check if error is about duplicate site
      if (error.message?.includes("already exists") || error.message?.includes("duplicate")) {
        setError(`Site "${formData.name}" already exists`);
      } else {
        setError(error.message || "Failed to create site");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} modal={true}>
      <DialogContent 
        className="sm:max-w-[500px] z-[110]"
        onPointerDownOutside={(e) => {
          // Prevent closing parent dialog when clicking outside
          e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          // Allow ESC to close only this dialog, prevent propagation
          e.preventDefault();
          handleOpenChange(false);
        }}
      >
        <DialogHeader>
          <DialogTitle>Create New Site</DialogTitle>
          <DialogDescription>
            Add a new site to the system. Site name is required.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="siteName">Site Name *</Label>
            <Input
              id="siteName"
              placeholder="Site A, Building 1, etc."
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
              disabled={isLoading}
              className={error ? "border-destructive" : ""}
            />
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="siteCode">
              Site Code <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Input
              id="siteCode"
              placeholder="SITE-001"
              value={formData.code}
              onChange={(e) =>
                setFormData({ ...formData, code: e.target.value })
              }
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="siteAddress">
              Address <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Input
              id="siteAddress"
              placeholder="123 Main St, City, State"
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="siteDescription">
              Description <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <textarea
              id="siteDescription"
              placeholder="Additional details about the site..."
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isLoading}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !formData.name.trim() || !!error}>
              {isLoading ? "Creating..." : "Create Site"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

