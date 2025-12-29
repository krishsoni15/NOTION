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
import { MoreHorizontal, Edit, Trash2, Building2, MapPin, Hash, Calendar, Info, Power, PowerOff } from "lucide-react";
import { SiteFormDialog } from "./site-form-dialog";
import { SiteInfoDialog } from "../requests/site-info-dialog";
import { toast } from "sonner";
import type { Doc } from "@/convex/_generated/dataModel";

type ViewMode = "table" | "card";

interface SiteTableProps {
  sites: typeof import("@/convex/_generated/api").api.sites.getAllSites._returnType | undefined;
  viewMode?: ViewMode;
}

export function SiteTable({ sites, viewMode = "table" }: SiteTableProps) {
  const [editingSite, setEditingSite] = useState<Doc<"sites"> | null>(null);
  const [deletingSite, setDeletingSite] = useState<Doc<"sites"> | null>(null);
  const [deactivatingSite, setDeactivatingSite] = useState<Doc<"sites"> | null>(null);
  const [loadingSiteId, setLoadingSiteId] = useState<string | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState<Doc<"sites">["_id"] | null>(null);
  const deleteSite = useMutation(api.sites.deleteSite);
  const toggleSiteStatus = useMutation(api.sites.toggleSiteStatus);
  
  // Check site usage when delete dialog opens
  const siteUsage = useQuery(
    api.sites.checkSiteUsage,
    deletingSite ? { siteId: deletingSite._id } : "skip"
  );

  // Check site usage when deactivate dialog opens
  const deactivateSiteUsage = useQuery(
    api.sites.checkSiteUsage,
    deactivatingSite ? { siteId: deactivatingSite._id } : "skip"
  );

  const handleToggleStatus = async (site: Doc<"sites">) => {
    // If trying to deactivate, check usage first
    if (site.isActive) {
      setDeactivatingSite(site);
      return;
    }
    
    // Activating - proceed directly
    setLoadingSiteId(site._id);
    try {
      await toggleSiteStatus({ siteId: site._id });
      toast.success("Site activated successfully");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to activate site";
      toast.error(errorMessage);
    } finally {
      setLoadingSiteId(null);
    }
  };

  const handleConfirmDeactivate = async () => {
    if (!deactivatingSite) return;
    
    setLoadingSiteId(deactivatingSite._id);
    try {
      await toggleSiteStatus({ siteId: deactivatingSite._id });
      toast.success("Site deactivated successfully");
      setDeactivatingSite(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to deactivate site";
      toast.error(errorMessage);
      setDeactivatingSite(null);
    } finally {
      setLoadingSiteId(null);
    }
  };

  const handleDelete = async () => {
    if (!deletingSite) return;
    
    setLoadingSiteId(deletingSite._id);
    try {
      await deleteSite({ siteId: deletingSite._id });
      toast.success("Site deleted permanently");
      setDeletingSite(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete site";
      toast.error(errorMessage);
    } finally {
      setLoadingSiteId(null);
    }
  };

  if (!sites) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  if (sites.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No sites found. Add your first site to get started.
      </div>
    );
  }

  const SiteCard = ({ site }: { site: Doc<"sites"> }) => {
    return (
      <Card className="hover:shadow-lg transition-all border-border/50">
        <CardHeader className="pb-4 border-b border-border/50">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-semibold flex items-center gap-2 mb-1">
                <Building2 className="h-4 w-4 text-primary shrink-0" />
                <button
                  onClick={() => setSelectedSiteId(site._id)}
                  className="truncate text-foreground hover:text-primary hover:bg-muted/50 rounded-full px-3 py-1.5 -mx-2 -my-1 transition-colors cursor-pointer text-left border border-transparent hover:border-primary/20"
                >
                  {site.name}
                </button>
              </CardTitle>
            </div>
            <Badge variant={site.isActive ? "default" : "secondary"} className="text-xs">
              {site.isActive ? "Active" : "Inactive"}
            </Badge>
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
                <DropdownMenuItem onClick={() => setEditingSite(site)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Site
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleToggleStatus(site)}
                  disabled={loadingSiteId === site._id}
                >
                  {site.isActive ? (
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
                  onClick={() => setDeletingSite(site)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Site
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="pt-4 space-y-3">
          {site.address && (
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-muted-foreground text-xs">Address</p>
                <p className="line-clamp-2">{site.address}</p>
              </div>
            </div>
          )}
          {site.description && (
            <div className="flex items-start gap-2 text-sm">
              <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-muted-foreground text-xs">Description</p>
                <p className="line-clamp-2">{site.description}</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
            <Calendar className="h-3.5 w-3.5" />
            <span>Created {new Date(site.createdAt).toLocaleDateString()}</span>
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
                  <TableHead>Site Name</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sites.map((site) => (
                  <TableRow key={site._id}>
                    <TableCell className="font-medium">
                      <button
                        onClick={() => setSelectedSiteId(site._id)}
                        className="text-foreground hover:text-primary hover:bg-muted/50 rounded-full px-3 py-1.5 -mx-2 -my-1 transition-colors cursor-pointer text-left border border-transparent hover:border-primary/20"
                      >
                        {site.name}
                      </button>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {site.address || "—"}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {site.description || "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={site.isActive ? "default" : "secondary"}>
                        {site.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(site.createdAt).toLocaleDateString()}
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
                          <DropdownMenuItem onClick={() => setEditingSite(site)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Site
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleToggleStatus(site)}
                            disabled={loadingSiteId === site._id}
                          >
                            {site.isActive ? (
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
                            onClick={() => setDeletingSite(site)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Site
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
          {sites.map((site) => (
            <SiteCard key={site._id} site={site} />
          ))}
        </div>
      )}

      {/* Edit Site Dialog */}
      <SiteFormDialog
        open={editingSite !== null}
        onOpenChange={(open) => !open && setEditingSite(null)}
        siteId={editingSite?._id}
        initialData={editingSite ? {
          name: editingSite.name,
          code: editingSite.code || "",
          address: editingSite.address || "",
          description: editingSite.description || "",
          isActive: editingSite.isActive,
        } : null}
      />

      {/* Deactivate Error/Confirmation Dialog */}
      <AlertDialog open={deactivatingSite !== null} onOpenChange={(open) => !open && setDeactivatingSite(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deactivateSiteUsage?.isInUse ? "Cannot Deactivate Site" : "Deactivate Site"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deactivateSiteUsage?.isInUse ? (
                <div className="space-y-2">
                  <p>
                    Cannot deactivate <strong>{deactivatingSite?.name}</strong> because it is currently assigned to users.
                  </p>
                  {deactivateSiteUsage.assignedToUsers > 0 && (
                    <p className="text-destructive">
                      • Assigned to {deactivateSiteUsage.assignedToUsers} user(s)
                    </p>
                  )}
                  <p className="mt-2">
                    Please unassign the site from users before deactivating it.
                  </p>
                </div>
              ) : (
                <p>
                  Are you sure you want to deactivate <strong>{deactivatingSite?.name}</strong>? The site will be marked as inactive.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {!deactivateSiteUsage?.isInUse && (
              <AlertDialogAction
                onClick={handleConfirmDeactivate}
                disabled={loadingSiteId === deactivatingSite?._id}
              >
                {loadingSiteId === deactivatingSite?._id ? "Deactivating..." : "Deactivate"}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deletingSite !== null} onOpenChange={(open) => !open && setDeletingSite(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {siteUsage?.isInUse ? (
                <div className="space-y-2">
                  <p>
                    Cannot delete <strong>{deletingSite?.name}</strong> because it is currently in use.
                  </p>
                  {siteUsage.assignedToUsers > 0 && (
                    <p className="text-destructive">
                      • Assigned to {siteUsage.assignedToUsers} user(s)
                    </p>
                  )}
                  {siteUsage.usedInRequests > 0 && (
                    <p className="text-destructive">
                      • Used in {siteUsage.usedInRequests} request(s)
                    </p>
                  )}
                  <p className="mt-2">
                    Please unassign the site from users and ensure no requests are using it before deleting.
                  </p>
                </div>
              ) : (
                <p>
                  This will <strong>permanently delete</strong> <strong>{deletingSite?.name}</strong>. This action cannot be undone and the site will be removed permanently.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={siteUsage?.isInUse || loadingSiteId === deletingSite?._id}
              className={siteUsage?.isInUse ? "opacity-50 cursor-not-allowed" : "bg-destructive text-destructive-foreground hover:bg-destructive/90"}
            >
              {loadingSiteId === deletingSite?._id ? "Deleting..." : "Delete Site"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SiteInfoDialog
        open={!!selectedSiteId}
        onOpenChange={(open) => {
          if (!open) setSelectedSiteId(null);
        }}
        siteId={selectedSiteId}
      />
    </>
  );
}

