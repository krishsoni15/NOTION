"use client";

/**
 * Vendor Table Component
 * 
 * Displays all vendors in a table or card view with actions (Purchase Officer only for CRUD).
 */

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MoreHorizontal, Edit, Trash2, Building2, Mail, Phone, MapPin, Hash, Calendar } from "lucide-react";
import { useUserRole } from "@/hooks/use-user-role";
import { ROLES } from "@/lib/auth/roles";
import { VendorFormDialog } from "./vendor-form-dialog";
import { toast } from "sonner";
import type { Doc } from "@/convex/_generated/dataModel";

type ViewMode = "table" | "card";

interface VendorTableProps {
  vendors: typeof import("@/convex/_generated/api").api.vendors.getAllVendors._returnType | undefined;
  viewMode?: ViewMode;
}

export function VendorTable({ vendors, viewMode = "table" }: VendorTableProps) {
  const userRole = useUserRole();

  const [editingVendor, setEditingVendor] = useState<Doc<"vendors"> | null>(null);
  const [deletingVendor, setDeletingVendor] = useState<Doc<"vendors"> | null>(null);
  const [loadingVendorId, setLoadingVendorId] = useState<string | null>(null);
  const deleteVendor = useMutation(api.vendors.deleteVendor);

  // Check vendor usage when delete dialog opens
  const vendorUsage = useQuery(
    api.vendors.checkVendorUsage,
    deletingVendor ? { vendorId: deletingVendor._id } : "skip"
  );

  const canPerformCRUD = userRole === ROLES.PURCHASE_OFFICER; // Only Purchase Officers can edit/delete
  const canDelete = userRole === ROLES.PURCHASE_OFFICER; // Only Purchase Officers can delete

  const handleDelete = async () => {
    if (!deletingVendor) return;
    
    setLoadingVendorId(deletingVendor._id);
    try {
      await deleteVendor({ vendorId: deletingVendor._id });
      toast.success("Vendor deleted permanently");
      setDeletingVendor(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete vendor";
      toast.error(errorMessage);
    } finally {
      setLoadingVendorId(null);
    }
  };

  if (!vendors) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  if (vendors.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No vendors found. Add your first vendor to get started.
      </div>
    );
  }

  const VendorCard = ({ vendor }: { vendor: Doc<"vendors"> }) => {
    return (
      <Card className="hover:shadow-lg transition-all border-border/50">
        <CardHeader className="pb-4 border-b border-border/50">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-semibold flex items-center gap-2 mb-1">
                <Building2 className="h-4 w-4 text-primary shrink-0" />
                <span className="truncate">{vendor.companyName}</span>
              </CardTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Hash className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{vendor.gstNumber}</span>
              </div>
            </div>
            {canPerformCRUD && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setEditingVendor(vendor)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Vendor
                  </DropdownMenuItem>
                  {canDelete && (
                    <DropdownMenuItem
                      onClick={() => setDeletingVendor(vendor)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Vendor
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-start gap-2 text-sm">
            <Mail className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-muted-foreground text-xs">Email</p>
              <p className="truncate">{vendor.email}</p>
            </div>
          </div>
          {vendor.phone && (
            <div className="flex items-start gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-muted-foreground text-xs">Phone</p>
                <p>{vendor.phone}</p>
              </div>
            </div>
          )}
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-muted-foreground text-xs">Address</p>
              <p className="line-clamp-2">{vendor.address}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
            <Calendar className="h-3.5 w-3.5" />
            <span>Created {new Date(vendor.createdAt).toLocaleDateString()}</span>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      {/* Table View */}
      {viewMode === "table" && (
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>GST Number</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Created</TableHead>
                  {canPerformCRUD && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendors.map((vendor) => (
                  <TableRow key={vendor._id}>
                    <TableCell className="font-medium">{vendor.companyName}</TableCell>
                    <TableCell>{vendor.email}</TableCell>
                    <TableCell>{vendor.phone || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{vendor.gstNumber}</Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{vendor.address}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(vendor.createdAt).toLocaleDateString()}
                    </TableCell>
                    {canPerformCRUD && (
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setEditingVendor(vendor)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Vendor
                            </DropdownMenuItem>
                            {canDelete && (
                              <DropdownMenuItem
                                onClick={() => setDeletingVendor(vendor)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Vendor
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Card View */}
      {viewMode === "card" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {vendors.map((vendor) => (
            <VendorCard key={vendor._id} vendor={vendor} />
          ))}
        </div>
      )}

      {/* Edit Vendor Dialog */}
      <VendorFormDialog
        open={editingVendor !== null}
        onOpenChange={(open) => !open && setEditingVendor(null)}
        vendorId={editingVendor?._id}
        initialData={editingVendor ? {
          companyName: editingVendor.companyName,
          email: editingVendor.email,
          phone: editingVendor.phone,
          gstNumber: editingVendor.gstNumber,
          address: editingVendor.address,
        } : null}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deletingVendor !== null} onOpenChange={(open) => !open && setDeletingVendor(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {vendorUsage?.isInUse ? (
                <div className="space-y-2">
                  <p>
                    Cannot delete <strong>{deletingVendor?.companyName}</strong> because it is currently in use.
                  </p>
                  {vendorUsage.usedInInventory > 0 && (
                    <p className="text-destructive">
                      • Used in {vendorUsage.usedInInventory} inventory item(s)
                    </p>
                  )}
                  <p className="mt-2">
                    Please remove the vendor from inventory items before deleting.
                  </p>
                </div>
              ) : (
                <p>
                  This will <strong>permanently delete</strong> vendor <strong>{deletingVendor?.companyName}</strong>. This action cannot be undone and the vendor will be removed permanently.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={vendorUsage?.isInUse || loadingVendorId === deletingVendor?._id}
              className={vendorUsage?.isInUse ? "opacity-50 cursor-not-allowed" : "bg-destructive text-destructive-foreground hover:bg-destructive/90"}
            >
              {loadingVendorId === deletingVendor?._id ? "Deleting..." : "Delete Vendor"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

