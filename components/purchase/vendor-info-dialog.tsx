"use client";

/**
 * Vendor Info Dialog Component
 *
 * Shows detailed vendor information, purchase history, and allows editing for Purchase Officers.
 */

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  Hash,
  Calendar,
  Edit,
  Package,
  ShoppingCart,
  DollarSign,
  User
} from "lucide-react";
import { useUserRole } from "@/hooks/use-user-role";
import { ROLES } from "@/lib/auth/roles";
import { VendorFormDialog } from "../vendors/vendor-form-dialog";
import type { Id } from "@/convex/_generated/dataModel";

interface VendorInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendorId: Id<"vendors"> | null;
}

export function VendorInfoDialog({ open, onOpenChange, vendorId }: VendorInfoDialogProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const userRole = useUserRole();
  const canEdit = userRole === ROLES.PURCHASE_OFFICER;

  const vendor = useQuery(
    api.vendors.getVendorById,
    vendorId ? { vendorId } : "skip"
  );

  const vendorPurchaseStats = useQuery(
    api.vendors.getVendorPurchaseStats,
    vendorId ? { vendorId } : "skip"
  );

  if (!vendor) {
    return null;
  }

  const handleOpenInMap = (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
    window.open(mapUrl, '_blank');
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {vendor.companyName}
            </DialogTitle>
            <DialogDescription>
              Vendor details and purchase history
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Vendor Details Card */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">Vendor Information</CardTitle>
                  {canEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditDialogOpen(true)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Company Name</p>
                      <p className="text-sm text-muted-foreground">{vendor.companyName}</p>
                    </div>
                  </div>

                  {vendor.contactName && (
                    <div className="flex items-start gap-3">
                      <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Contact Name</p>
                        <p className="text-sm text-muted-foreground">{vendor.contactName}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Email</p>
                      <p className="text-sm text-muted-foreground">{vendor.email}</p>
                    </div>
                  </div>

                  {vendor.phone && (
                    <div className="flex items-start gap-3">
                      <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Phone</p>
                        <p className="text-sm text-muted-foreground">{vendor.phone}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <Hash className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">GST Number</p>
                      <Badge variant="outline">{vendor.gstNumber}</Badge>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="flex items-start gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Address</p>
                    <div className="flex items-start gap-2">
                      <p className="text-sm text-muted-foreground flex-1">{vendor.address}</p>
                      <button
                        onClick={() => handleOpenInMap(vendor.address)}
                        className="text-muted-foreground hover:text-primary transition-colors p-1 rounded hover:bg-muted/50"
                        title="Open in Maps"
                      >
                        <MapPin className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground pt-2 border-t">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Created {new Date(vendor.createdAt).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>

            {/* Purchase Statistics Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Purchase Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                {vendorPurchaseStats ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">
                        {vendorPurchaseStats.totalItems}
                      </div>
                      <p className="text-xs text-muted-foreground">Items Purchased</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        ₹{vendorPurchaseStats.totalValue.toLocaleString()}
                      </div>
                      <p className="text-xs text-muted-foreground">Total Value</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {vendorPurchaseStats.totalOrders}
                      </div>
                      <p className="text-xs text-muted-foreground">Purchase Orders</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {vendorPurchaseStats.activeItems}
                      </div>
                      <p className="text-xs text-muted-foreground">Active Items</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    Loading purchase statistics...
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Inventory Items Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Associated Inventory Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                {vendorPurchaseStats?.inventoryItems && vendorPurchaseStats.inventoryItems.length > 0 ? (
                  <div className="space-y-3">
                    {vendorPurchaseStats.inventoryItems.map((item) => (
                      <div key={item._id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{item.itemName}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                            <span>Stock: {item.centralStock} {item.unit}</span>
                            <span>Last Updated: {new Date(item.updatedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <Badge variant="outline">
                          Active
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    No associated inventory items
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Vendor Dialog */}
      {canEdit && (
        <VendorFormDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          vendorId={vendorId}
          initialData={{
            companyName: vendor.companyName,
            contactName: vendor.contactName,
            email: vendor.email,
            phone: vendor.phone,
            gstNumber: vendor.gstNumber,
            address: vendor.address,
          }}
        />
      )}
    </>
  );
}
