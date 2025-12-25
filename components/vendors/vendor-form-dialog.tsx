"use client";

/**
 * Vendor Form Dialog
 * 
 * Dialog for creating and editing vendors (Purchase Officer only).
 */

import { useState, useEffect } from "react";
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
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { AddressAutocomplete } from "./address-autocomplete";

interface VendorFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendorId?: Id<"vendors"> | null;
  initialData?: {
    companyName: string;
    email: string;
    phone?: string;
    gstNumber: string;
    address: string;
  } | null;
}

export function VendorFormDialog({
  open,
  onOpenChange,
  vendorId,
  initialData,
}: VendorFormDialogProps) {
  const createVendor = useMutation(api.vendors.createVendor);
  const updateVendor = useMutation(api.vendors.updateVendor);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    companyName: "",
    email: "",
    phone: "",
    gstNumber: "",
    address: "",
  });

  // Load initial data when editing
  useEffect(() => {
    if (initialData) {
      setFormData({
        companyName: initialData.companyName,
        email: initialData.email,
        phone: initialData.phone || "",
        gstNumber: initialData.gstNumber,
        address: initialData.address,
      });
    } else {
      setFormData({
        companyName: "",
        email: "",
        phone: "",
        gstNumber: "",
        address: "",
      });
    }
    setError("");
  }, [initialData, open]);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setFormData({
        companyName: "",
        email: "",
        phone: "",
        gstNumber: "",
        address: "",
      });
      setError("");
    }
    onOpenChange(newOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (vendorId) {
        // Update existing vendor
        await updateVendor({
          vendorId,
          companyName: formData.companyName,
          email: formData.email,
          phone: formData.phone || undefined,
          gstNumber: formData.gstNumber,
          address: formData.address,
        });
        toast.success("Vendor updated successfully");
      } else {
        // Create new vendor
        await createVendor({
          companyName: formData.companyName,
          email: formData.email,
          phone: formData.phone || undefined,
          gstNumber: formData.gstNumber,
          address: formData.address,
        });
        toast.success("Vendor created successfully");
      }

      handleOpenChange(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save vendor";
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
          <DialogTitle>{vendorId ? "Edit Vendor" : "Add New Vendor"}</DialogTitle>
          <DialogDescription>
            {vendorId
              ? "Update vendor information. Required fields are marked with *."
              : "Create a new vendor. Required fields are marked with *."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="companyName" className="text-sm">Company Name *</Label>
            <Input
              id="companyName"
              placeholder="ABC Company Ltd."
              value={formData.companyName}
              onChange={(e) =>
                setFormData({ ...formData, companyName: e.target.value })
              }
              required
              disabled={isLoading}
              className="h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="contact@company.com"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              required
              disabled={isLoading}
              className="h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="phone" className="text-sm">
              Phone <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+91 9876543210"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              disabled={isLoading}
              className="h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="gstNumber" className="text-sm">GST Number *</Label>
            <Input
              id="gstNumber"
              placeholder="24AAAAA0000A1Z5"
              value={formData.gstNumber}
              onChange={(e) =>
                setFormData({ ...formData, gstNumber: e.target.value.toUpperCase() })
              }
              required
              disabled={isLoading}
              maxLength={15}
              className="h-9"
            />
            <p className="text-xs text-muted-foreground">
              Format: 24AAAAA0000A1Z5 (15 characters)
            </p>
          </div>

          <AddressAutocomplete
            value={formData.address}
            onChange={(address) => setFormData({ ...formData, address })}
            required
            disabled={isLoading}
            label="Address"
            placeholder="Search address or type manually..."
            id="address"
          />

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
                  <span className="mr-2">{vendorId ? "Updating..." : "Creating..."}</span>
                  <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                </>
              ) : (
                vendorId ? "Update Vendor" : "Create Vendor"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

