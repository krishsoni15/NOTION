"use client";

/**
 * Inline Vendor Creation Form
 *
 * Allows creating vendors directly from cost comparison dialog
 * without navigating away from the current workflow.
 */

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Save, X } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

interface VendorCreationFormProps {
  onVendorCreated: (vendorId: Id<"vendors">) => void;
  onCancel: () => void;
  itemName?: string; // For auto-linking vendor to item
  initialCompanyName?: string; // Pre-fill company name from search
}

export function VendorCreationForm({ onVendorCreated, onCancel, itemName, initialCompanyName }: VendorCreationFormProps) {
  const [formData, setFormData] = useState({
    companyName: initialCompanyName || "",
    email: "",
    phone: "",
    gstNumber: "",
    address: "",
  });
  const [isCreating, setIsCreating] = useState(false);

  const createVendor = useMutation(api.vendors.createVendor);
  const linkVendorToItem = useMutation(api.inventory.linkVendorToItem);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.companyName.trim() || !formData.email.trim() || !formData.gstNumber.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsCreating(true);
    try {
      const vendorId = await createVendor({
        companyName: formData.companyName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        gstNumber: formData.gstNumber.trim(),
        address: formData.address.trim(),
      });

      // If itemName is provided, link the vendor to the inventory item
      if (itemName) {
        try {
          await linkVendorToItem({
            itemName: itemName,
            vendorId: vendorId,
          });
          toast.success("Vendor created and linked to item!");
        } catch (linkError) {
          console.warn("Vendor created but failed to link to item:", linkError);
          toast.success("Vendor created successfully!");
        }
      } else {
        toast.success("Vendor created successfully!");
      }

      onVendorCreated(vendorId);
    } catch (error: any) {
      toast.error(error.message || "Failed to create vendor");
    } finally {
      setIsCreating(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Create New Vendor</h3>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {itemName && (
        <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="text-sm text-blue-700 dark:text-blue-300">
            <strong>Tip:</strong> This vendor will be automatically linked to "{itemName}" in your inventory for future suggestions.
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="companyName" className="text-sm font-medium">
              Company Name *
            </Label>
            <Input
              id="companyName"
              value={formData.companyName}
              onChange={(e) => handleInputChange("companyName", e.target.value)}
              placeholder="ABC Suppliers Ltd."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              Email *
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              placeholder="contact@company.com"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm font-medium">
              Phone
            </Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => handleInputChange("phone", e.target.value)}
              placeholder="+91 98765 43210"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gstNumber" className="text-sm font-medium">
              GST Number *
            </Label>
            <Input
              id="gstNumber"
              value={formData.gstNumber}
              onChange={(e) => handleInputChange("gstNumber", e.target.value)}
              placeholder="22AAAAA0000A1Z5"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="address" className="text-sm font-medium">
            Address *
          </Label>
          <Textarea
            id="address"
            value={formData.address}
            onChange={(e) => handleInputChange("address", e.target.value)}
            placeholder="Full business address..."
            rows={3}
            required
          />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isCreating}>
            Cancel
          </Button>
          <Button type="submit" disabled={isCreating}>
            {isCreating ? (
              "Creating..."
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Create Vendor
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
