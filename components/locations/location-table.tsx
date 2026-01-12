"use client";

/**
 * Site Table Component
 * 
 * Displays all sites in a table or card view with actions (Manager only).
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
// ... imports
import { MoreHorizontal, Edit, Trash2, Building2, MapPin, Hash, Calendar, Info, Power, PowerOff } from "lucide-react";
import { LocationFormDialog } from "./location-form-dialog";
import { LocationInfoDialog } from "./location-info-dialog";
import { toast } from "sonner";
import type { Doc } from "@/convex/_generated/dataModel";

type ViewMode = "table" | "card";

interface LocationTableProps {
  locations: typeof import("@/convex/_generated/api").api.sites.getAllSites._returnType | undefined;
  viewMode?: ViewMode;
}

export function LocationTable({ locations, viewMode = "table" }: LocationTableProps) {
  const [editingLocation, setEditingLocation] = useState<Doc<"sites"> | null>(null);
  const [deletingLocation, setDeletingLocation] = useState<Doc<"sites"> | null>(null);
  const [deactivatingLocation, setDeactivatingLocation] = useState<Doc<"sites"> | null>(null);
  const [loadingLocationId, setLoadingLocationId] = useState<string | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<Doc<"sites">["_id"] | null>(null);
  const deleteLocation = useMutation(api.sites.deleteSite);
  const toggleLocationStatus = useMutation(api.sites.toggleSiteStatus);

  // Check location usage when delete dialog opens
  const locationUsage = useQuery(
    api.sites.checkSiteUsage,
    deletingLocation ? { siteId: deletingLocation._id } : "skip"
  );

  // Check location usage when deactivate dialog opens
  const deactivateLocationUsage = useQuery(
    api.sites.checkSiteUsage,
    deactivatingLocation ? { siteId: deactivatingLocation._id } : "skip"
  );

  const handleToggleStatus = async (location: Doc<"sites">) => {
    // If trying to deactivate, check usage first
    if (location.isActive) {
      setDeactivatingLocation(location);
      return;
    }

    // Activating - proceed directly
    setLoadingLocationId(location._id);
    try {
      await toggleLocationStatus({ siteId: location._id });
      toast.success("Location activated successfully");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to activate location";
      toast.error(errorMessage);
    } finally {
      setLoadingLocationId(null);
    }
  };

  const handleConfirmDeactivate = async () => {
    if (!deactivatingLocation) return;

    setLoadingLocationId(deactivatingLocation._id);
    try {
      await toggleLocationStatus({ siteId: deactivatingLocation._id });
      toast.success("Location deactivated successfully");
      setDeactivatingLocation(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to deactivate location";
      toast.error(errorMessage);
      setDeactivatingLocation(null);
    } finally {
      setLoadingLocationId(null);
    }
  };

  const handleDelete = async () => {
    if (!deletingLocation) return;

    setLoadingLocationId(deletingLocation._id);
    try {
      await deleteLocation({ siteId: deletingLocation._id });
      toast.success("Location deleted permanently");
      setDeletingLocation(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete location";
      toast.error(errorMessage);
    } finally {
      setLoadingLocationId(null);
    }
  };

  if (!locations) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  if (locations.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No locations found. Add your first location to get started.
      </div>
    );
  }

  const LocationCard = ({ location }: { location: Doc<"sites"> }) => {
    return (
      <Card className="hover:shadow-lg transition-all border-border/50">
        <CardHeader className="pb-4 border-b border-border/50">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-semibold flex items-center gap-2 mb-1">
                <Building2 className="h-4 w-4 text-primary shrink-0" />
                <button
                  onClick={() => setSelectedLocationId(location._id)}
                  className="truncate text-foreground hover:text-primary hover:bg-muted/50 rounded-full px-3 py-1.5 -mx-2 -my-1 transition-colors cursor-pointer text-left border border-transparent hover:border-primary/20"
                >
                  {location.name}
                </button>
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs capitalize">
                {location.type || "site"}
              </Badge>
              <Badge variant={location.isActive ? "default" : "secondary"} className="text-xs">
                {location.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
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
                <DropdownMenuItem onClick={() => setEditingLocation(location)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Location
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleToggleStatus(location)}
                  disabled={loadingLocationId === location._id}
                >
                  {location.isActive ? (
                    <>
                      <PowerOff className="h-4 w-4 mr-2" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <Power className="h-4 w-4 mr-2" />
                      Activate
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setDeletingLocation(location)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Location
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-3">
          {location.address && (
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-muted-foreground text-xs">Address</p>
                <p className="line-clamp-2">{location.address}</p>
              </div>
            </div>
          )}
          {location.description && (
            <div className="flex items-start gap-2 text-sm">
              <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-muted-foreground text-xs">Description</p>
                <p className="line-clamp-2">{location.description}</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
            <Calendar className="h-3.5 w-3.5" />
            <span>Created {new Date(location.createdAt).toLocaleDateString()}</span>
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
                  <TableHead>Location Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.map((location) => (
                  <TableRow key={location._id}>
                    <TableCell className="font-medium">
                      <button
                        onClick={() => setSelectedLocationId(location._id)}
                        className="text-foreground hover:text-primary hover:bg-muted/50 rounded-full px-3 py-1.5 -mx-2 -my-1 transition-colors cursor-pointer text-left border border-transparent hover:border-primary/20"
                      >
                        {location.name}
                      </button>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {location.type || "site"}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {location.address || "—"}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {location.description || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={location.isActive ? "default" : "secondary"}>
                        {location.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(location.createdAt).toLocaleDateString()}
                    </TableCell>
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
                          <DropdownMenuItem onClick={() => setEditingLocation(location)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Location
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleToggleStatus(location)}
                            disabled={loadingLocationId === location._id}
                          >
                            {location.isActive ? (
                              <>
                                <PowerOff className="h-4 w-4 mr-2" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <Power className="h-4 w-4 mr-2" />
                                Activate
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeletingLocation(location)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Location
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
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
          {locations.map((location) => (
            <LocationCard key={location._id} location={location} />
          ))}
        </div>
      )}

      {/* Edit Location Dialog */}
      <LocationFormDialog
        open={editingLocation !== null}
        onOpenChange={(open) => !open && setEditingLocation(null)}
        locationId={editingLocation?._id}
        initialData={editingLocation ? {
          name: editingLocation.name,
          code: editingLocation.code || "",
          address: editingLocation.address || "",
          description: editingLocation.description || "",
          isActive: editingLocation.isActive,
          type: editingLocation.type || "site",
        } : null}
      />

      {/* Deactivate Error/Confirmation Dialog */}
      <AlertDialog open={deactivatingLocation !== null} onOpenChange={(open) => !open && setDeactivatingLocation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deactivateLocationUsage?.isInUse ? "Cannot Deactivate Location" : "Deactivate Location"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deactivateLocationUsage?.isInUse ? (
                <div className="space-y-2">
                  <p>
                    Cannot deactivate <strong>{deactivatingLocation?.name}</strong> because it is currently assigned to users.
                  </p>
                  {deactivateLocationUsage.assignedToUsers > 0 && (
                    <p className="text-destructive">
                      • Assigned to {deactivateLocationUsage.assignedToUsers} user(s)
                    </p>
                  )}
                  <p className="mt-2">
                    Please unassign the location from users before deactivating it.
                  </p>
                </div>
              ) : (
                <p>
                  Are you sure you want to deactivate <strong>{deactivatingLocation?.name}</strong>? The location will be marked as inactive.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {!deactivateLocationUsage?.isInUse && (
              <AlertDialogAction
                onClick={handleConfirmDeactivate}
                disabled={loadingLocationId === deactivatingLocation?._id}
              >
                {loadingLocationId === deactivatingLocation?._id ? "Deactivating..." : "Deactivate"}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deletingLocation !== null} onOpenChange={(open) => !open && setDeletingLocation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {locationUsage?.isInUse ? (
                <div className="space-y-2">
                  <p>
                    Cannot delete <strong>{deletingLocation?.name}</strong> because it is currently in use.
                  </p>
                  {locationUsage.assignedToUsers > 0 && (
                    <p className="text-destructive">
                      • Assigned to {locationUsage.assignedToUsers} user(s)
                    </p>
                  )}
                  {locationUsage.usedInRequests > 0 && (
                    <p className="text-destructive">
                      • Used in {locationUsage.usedInRequests} request(s)
                    </p>
                  )}
                  <p className="mt-2">
                    Please unassign the location from users and ensure no requests are using it before deleting.
                  </p>
                </div>
              ) : (
                <p>
                  This will <strong>permanently delete</strong> <strong>{deletingLocation?.name}</strong>. This action cannot be undone and the location will be removed permanently.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={locationUsage?.isInUse || loadingLocationId === deletingLocation?._id}
              className={locationUsage?.isInUse ? "opacity-50 cursor-not-allowed" : "bg-destructive text-destructive-foreground hover:bg-destructive/90"}
            >
              {loadingLocationId === deletingLocation?._id ? "Deleting..." : "Delete Location"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <LocationInfoDialog
        open={!!selectedLocationId}
        onOpenChange={(open) => {
          if (!open) setSelectedLocationId(null);
        }}
        locationId={selectedLocationId}
      />
    </>
  );
}

