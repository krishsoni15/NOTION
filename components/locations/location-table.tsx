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

  const handleOpenInMap = (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
    window.open(mapUrl, '_blank');
  };

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
      <Card className="h-full flex flex-col hover:shadow-md transition-all duration-200 border border-border bg-card group rounded-xl overflow-hidden hover:border-primary/20">
        <CardHeader className="p-4 pb-3 border-b border-border/40 bg-gradient-to-br from-primary/5 to-transparent">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="h-9 w-9 rounded-lg bg-background/60 backdrop-blur-sm flex items-center justify-center shrink-0 border border-primary/10 overflow-hidden shadow-sm">
                  <Building2 className="h-4.5 w-4.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => setSelectedLocationId(location._id)}
                    className="text-base font-bold truncate pr-2 leading-tight hover:underline decoration-primary/30 underline-offset-4 transition-all text-left w-full"
                  >
                    {location.name}
                  </button>
                </div>
              </div>
              <div className="pl-11 flex flex-wrap items-center gap-2 mt-1">
                {location.code && (
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-mono bg-background/50 border border-primary/10 text-muted-foreground">
                    {location.code}
                  </Badge>
                )}
                <Badge variant="outline" className="text-[10px] h-5 px-1.5 capitalize text-muted-foreground border-border/50 bg-background/30 backdrop-blur-sm">
                  {location.type || "site"}
                </Badge>
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-muted-foreground hover:text-foreground">
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
        <CardContent className="p-4 pt-4 space-y-4 flex-1 flex flex-col text-sm">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <span className="text-[10px] uppercase font-bold tracking-wider opacity-70">Status</span>
            </div>
            <Badge variant={location.isActive ? "default" : "secondary"} className="h-5 text-[10px] px-2 font-bold tracking-wide w-fit border-0">
              {location.isActive ? "ACTIVE" : "INACTIVE"}
            </Badge>
          </div>

          {(location.address || location.description) && (
            <div className="space-y-3 pt-1 border-t border-border/40">
              {location.address && (
                <div className="space-y-1 pt-2">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span className="text-[10px] uppercase font-bold tracking-wider opacity-70">Address</span>
                  </div>
                  <div className="pl-5 flex items-start gap-2">
                    <p className="text-balance text-muted-foreground leading-relaxed line-clamp-2 text-xs">{location.address}</p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenInMap(location.address!);
                      }}
                      className="text-primary hover:text-primary/80 hover:bg-primary/5 p-1 rounded-md transition-colors shrink-0"
                      title="Open in Maps"
                    >
                      <MapPin className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
              {location.description && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Info className="h-3 w-3" />
                    <span className="text-[10px] uppercase font-bold tracking-wider opacity-70">Description</span>
                  </div>
                  <p className="pl-5 text-balance text-muted-foreground leading-relaxed line-clamp-2 text-xs italic">{location.description}</p>
                </div>
              )}
            </div>
          )}

          <div className="mt-auto pt-4 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground/60">
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5" />
              <span>Created {new Date(location.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      {/* Table View */}
      {viewMode === "table" && (
        <div className="border rounded-xl overflow-hidden shadow-sm bg-background">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-[200px] font-semibold text-xs uppercase tracking-wider text-muted-foreground/80">Location Name</TableHead>
                  <TableHead className="w-[100px] font-semibold text-xs uppercase tracking-wider text-muted-foreground/80">Code</TableHead>
                  <TableHead className="w-[100px] font-semibold text-xs uppercase tracking-wider text-muted-foreground/80">Type</TableHead>
                  <TableHead className="min-w-[200px] font-semibold text-xs uppercase tracking-wider text-muted-foreground/80">Address</TableHead>
                  <TableHead className="w-[120px] font-semibold text-xs uppercase tracking-wider text-muted-foreground/80">Description</TableHead>
                  <TableHead className="w-[100px] font-semibold text-xs uppercase tracking-wider text-muted-foreground/80">Status</TableHead>
                  <TableHead className="w-[100px] font-semibold text-xs uppercase tracking-wider text-muted-foreground/80">Created</TableHead>
                  <TableHead className="w-[60px] text-right font-semibold text-xs uppercase tracking-wider text-muted-foreground/80">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.map((location, index) => (
                  <TableRow
                    key={location._id}
                    className={`
                        group transition-all duration-300 border-b last:border-0 hover:bg-primary/5 hover:shadow-sm hover:z-10 hover:relative
                        ${index % 2 === 0 ? "bg-background" : "bg-muted/20"}
                        animate-in fade-in slide-in-from-bottom-3
                     `}
                    style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
                  >
                    <TableCell className="align-top py-4 pl-4 font-medium">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 border border-primary/10 text-primary">
                          <Building2 className="h-4 w-4" />
                        </div>
                        <button
                          onClick={() => setSelectedLocationId(location._id)}
                          className="text-sm font-bold text-foreground hover:text-primary transition-colors cursor-pointer text-left hover:underline decoration-primary/30 underline-offset-4"
                        >
                          {location.name}
                        </button>
                      </div>
                    </TableCell>
                    <TableCell className="align-top py-4">
                      <span className="font-mono text-xs text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded border border-border/50">
                        {location.code || "-"}
                      </span>
                    </TableCell>
                    <TableCell className="align-top py-4">
                      <Badge variant="outline" className="text-[10px] bg-background/50 h-5 px-2 capitalize">
                        {location.type || "site"}
                      </Badge>
                    </TableCell>
                    <TableCell className="align-top py-4 max-w-xs text-sm text-muted-foreground leading-relaxed">
                      {location.address ? (
                        <div className="flex items-start gap-2 group/addr">
                          <span className="line-clamp-2">{location.address}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenInMap(location.address!);
                            }}
                            className="text-primary p-1 hover:bg-primary/10 rounded shrink-0"
                            title="Open in Maps"
                          >
                            <MapPin className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground/30">—</span>
                      )}
                    </TableCell>
                    <TableCell className="align-top py-4 max-w-xs text-sm text-muted-foreground italic leading-relaxed">
                      {location.description || <span className="text-muted-foreground/30">—</span>}
                    </TableCell>
                    <TableCell className="align-top py-4">
                      <Badge variant={location.isActive ? "default" : "secondary"} className="h-5 text-[10px] px-2 uppercase tracking-wider font-bold">
                        {location.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="align-top py-4 text-xs text-muted-foreground/70">
                      {new Date(location.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="align-top py-4 text-right pr-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6 pt-2 pb-10">
          {locations.map((location, index) => (
            <div
              key={location._id}
              className="animate-in fade-in slide-in-from-bottom-5 h-full"
              style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
            >
              <LocationCard location={location} />
            </div>
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

