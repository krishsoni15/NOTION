"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MoreHorizontal, Edit, Trash2, MapPin, Power, PowerOff, Hash } from "lucide-react";
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
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<Doc<"sites">["_id"] | null>(null);

  const deleteLocation = useMutation(api.sites.deleteSite);
  const toggleStatus = useMutation(api.sites.toggleSiteStatus);

  const locationUsage = useQuery(api.sites.checkSiteUsage, deletingLocation ? { siteId: deletingLocation._id } : "skip");
  const deactivateUsage = useQuery(api.sites.checkSiteUsage, deactivatingLocation ? { siteId: deactivatingLocation._id } : "skip");

  const openInMap = (address: string) => {
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, "_blank");
  };

  const handleToggleStatus = async (location: Doc<"sites">) => {
    if (location.isActive) { setDeactivatingLocation(location); return; }
    setLoadingId(location._id);
    try {
      await toggleStatus({ siteId: location._id });
      toast.success("Location activated");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setLoadingId(null); }
  };

  const handleConfirmDeactivate = async () => {
    if (!deactivatingLocation) return;
    setLoadingId(deactivatingLocation._id);
    try {
      await toggleStatus({ siteId: deactivatingLocation._id });
      toast.success("Location deactivated");
      setDeactivatingLocation(null);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); setDeactivatingLocation(null); }
    finally { setLoadingId(null); }
  };

  const handleDelete = async () => {
    if (!deletingLocation) return;
    setLoadingId(deletingLocation._id);
    try {
      await deleteLocation({ siteId: deletingLocation._id });
      toast.success("Location deleted");
      setDeletingLocation(null);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setLoadingId(null); }
  };

  if (!locations) return <div className="text-center py-12 text-muted-foreground text-sm">Loading...</div>;
  if (locations.length === 0) return (
    <div className="text-center py-16 text-muted-foreground">
      <MapPin className="h-10 w-10 mx-auto mb-3 opacity-20" />
      <p className="font-medium">No locations found</p>
      <p className="text-sm mt-1 opacity-70">Add your first location to get started</p>
    </div>
  );

  const ActionMenu = ({ location }: { location: Doc<"sites"> }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={() => setEditingLocation(location)}>
          <Edit className="h-4 w-4 mr-2" /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleToggleStatus(location)} disabled={loadingId === location._id}>
          {location.isActive
            ? <><PowerOff className="h-4 w-4 mr-2" /> Deactivate</>
            : <><Power className="h-4 w-4 mr-2" /> Activate</>}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setDeletingLocation(location)} className="text-destructive focus:text-destructive">
          <Trash2 className="h-4 w-4 mr-2" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <>
      {/* ── TABLE VIEW ── */}
      {viewMode === "table" && (
        <div className="rounded-xl border overflow-hidden bg-background shadow-sm">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="pl-4 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Location Name</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Code</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Address</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Description</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Status</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Created</TableHead>
                <TableHead className="pr-4 text-right font-semibold text-xs uppercase tracking-wider text-muted-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations.map((loc, i) => (
                <TableRow
                  key={loc._id}
                  className={`group hover:bg-primary/5 transition-colors border-b last:border-0 ${i % 2 === 0 ? "bg-background" : "bg-muted/10"}`}
                >
                  <TableCell className="pl-4 py-3.5">
                    <button
                      onClick={() => setSelectedLocationId(loc._id)}
                      className="font-semibold text-sm text-foreground hover:text-primary transition-colors hover:underline underline-offset-4 text-left"
                    >
                      {loc.name}
                    </button>
                  </TableCell>
                  <TableCell className="py-3.5">
                    {loc.code
                      ? <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded border border-border/50 text-muted-foreground">{loc.code}</span>
                      : <span className="text-muted-foreground/30 text-sm">—</span>}
                  </TableCell>
                  <TableCell className="py-3.5 max-w-[220px]">
                    {loc.address ? (
                      <div className="flex items-start gap-1.5 group/addr">
                        <span className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{loc.address}</span>
                        <button onClick={() => openInMap(loc.address!)} className="text-primary hover:text-primary/80 p-0.5 shrink-0 mt-0.5" title="Open in Maps">
                          <MapPin className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : <span className="text-muted-foreground/30 text-sm">—</span>}
                  </TableCell>
                  <TableCell className="py-3.5 max-w-[180px] text-sm text-muted-foreground italic">
                    {loc.description
                      ? <span className="line-clamp-2">{loc.description}</span>
                      : <span className="text-muted-foreground/30 not-italic">—</span>}
                  </TableCell>
                  <TableCell className="py-3.5">
                    <Badge variant={loc.isActive ? "default" : "secondary"} className="text-[10px] px-2 h-5 font-bold uppercase tracking-wide">
                      {loc.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3.5 text-xs text-muted-foreground/70 whitespace-nowrap">
                    {new Date(loc.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="py-3.5 pr-4 text-right">
                    <ActionMenu location={loc} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── CARD VIEW ── */}
      {viewMode === "card" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {locations.map((loc, i) => (
            <Card
              key={loc._id}
              className="group flex flex-col hover:shadow-lg hover:border-primary/20 transition-all duration-200 rounded-xl overflow-hidden"
              style={{ animationDelay: `${i * 40}ms` }}
            >
              {/* Card top accent */}
              <div className="h-1.5 bg-gradient-to-r from-primary/60 to-primary/20" />

              <CardContent className="p-4 flex flex-col gap-3 flex-1">
                {/* Header row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <button
                      onClick={() => setSelectedLocationId(loc._id)}
                      className="font-bold text-base text-foreground hover:text-primary transition-colors text-left leading-tight hover:underline underline-offset-4 w-full truncate block"
                    >
                      {loc.name}
                    </button>
                    {loc.code && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground font-mono mt-1">
                        <Hash className="h-3 w-3" />{loc.code}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge variant={loc.isActive ? "default" : "secondary"} className="text-[10px] h-5 px-1.5 font-bold uppercase">
                      {loc.isActive ? "Active" : "Off"}
                    </Badge>
                    <ActionMenu location={loc} />
                  </div>
                </div>

                {/* Address */}
                {loc.address && (
                  <button
                    onClick={() => openInMap(loc.address!)}
                    className="flex items-start gap-2 text-left group/addr hover:text-primary transition-colors"
                  >
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground group-hover/addr:text-primary shrink-0 mt-0.5" />
                    <span className="text-xs text-muted-foreground group-hover/addr:text-primary line-clamp-2 leading-relaxed">{loc.address}</span>
                  </button>
                )}

                {/* Description */}
                {loc.description && (
                  <p className="text-xs text-muted-foreground/70 italic line-clamp-2 leading-relaxed border-t border-border/30 pt-2">
                    {loc.description}
                  </p>
                )}

                {/* Footer */}
                <div className="mt-auto pt-2 border-t border-border/30 text-[11px] text-muted-foreground/50">
                  {new Date(loc.createdAt).toLocaleDateString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit dialog */}
      <LocationFormDialog
        open={!!editingLocation}
        onOpenChange={(open) => !open && setEditingLocation(null)}
        locationId={editingLocation?._id}
        initialData={editingLocation ? {
          name: editingLocation.name,
          code: editingLocation.code || "",
          address: editingLocation.address || "",
          description: editingLocation.description || "",
          isActive: editingLocation.isActive,
        } : null}
      />

      {/* Deactivate dialog */}
      <AlertDialog open={!!deactivatingLocation} onOpenChange={(open) => !open && setDeactivatingLocation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{deactivateUsage?.isInUse ? "Cannot Deactivate" : "Deactivate Location"}</AlertDialogTitle>
            <AlertDialogDescription>
              {deactivateUsage?.isInUse ? (
                <span>
                  <strong>{deactivatingLocation?.name}</strong> is assigned to {deactivateUsage.assignedToUsers} user(s). Unassign first.
                </span>
              ) : (
                <span>Deactivate <strong>{deactivatingLocation?.name}</strong>? It will be marked inactive.</span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {!deactivateUsage?.isInUse && (
              <AlertDialogAction onClick={handleConfirmDeactivate} disabled={loadingId === deactivatingLocation?._id}>
                {loadingId === deactivatingLocation?._id ? "Deactivating..." : "Deactivate"}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete dialog */}
      <AlertDialog open={!!deletingLocation} onOpenChange={(open) => !open && setDeletingLocation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Location?</AlertDialogTitle>
            <AlertDialogDescription>
              {locationUsage?.isInUse ? (
                <span>
                  Cannot delete <strong>{deletingLocation?.name}</strong> — it's used in {locationUsage.usedInRequests} request(s) or assigned to {locationUsage.assignedToUsers} user(s).
                </span>
              ) : (
                <span>Permanently delete <strong>{deletingLocation?.name}</strong>? This cannot be undone.</span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={!!locationUsage?.isInUse || loadingId === deletingLocation?._id}
              className={locationUsage?.isInUse ? "opacity-50 cursor-not-allowed" : "bg-destructive text-destructive-foreground hover:bg-destructive/90"}
            >
              {loadingId === deletingLocation?._id ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Info dialog */}
      <LocationInfoDialog
        open={!!selectedLocationId}
        onOpenChange={(open) => !open && setSelectedLocationId(null)}
        locationId={selectedLocationId}
      />
    </>
  );
}
