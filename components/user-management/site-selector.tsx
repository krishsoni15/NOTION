/**
 * Site Selector Component
 * 
 * Multi-select dropdown for selecting sites with search functionality.
 */

"use client";

import { useState, useEffect } from "react";
import { Search, Plus, X, Check, Info, Building2, Hash, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { cn, normalizeSearchQuery, matchesAnySearchQuery } from "@/lib/utils";
import { CreateSiteDialog } from "./create-site-dialog";
import type { Id } from "@/convex/_generated/dataModel";

interface SiteSelectorProps {
  selectedSites: Id<"sites">[];
  onSelectionChange: (siteIds: Id<"sites">[]) => void;
  disabled?: boolean;
}

export function SiteSelector({
  selectedSites,
  onSelectionChange,
  disabled = false,
}: SiteSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const allSites = useQuery(api.sites.getAllSites, {});
  const createSite = useMutation(api.sites.createSite);

  // Filter sites based on search - smart search with normalized query
  const filteredSites = allSites?.filter((site) => {
    const normalizedQuery = normalizeSearchQuery(searchQuery);
    if (!normalizedQuery) return true;
    return matchesAnySearchQuery(
      [site.name, site.code, site.address, site.description],
      normalizedQuery
    );
  }) || [];

  // Get selected site details
  const selectedSiteDetails = allSites?.filter((site) =>
    selectedSites.includes(site._id)
  ) || [];

  const handleToggleSite = (siteId: Id<"sites">) => {
    if (selectedSites.includes(siteId)) {
      onSelectionChange(selectedSites.filter((id) => id !== siteId));
    } else {
      onSelectionChange([...selectedSites, siteId]);
    }
  };

  const handleRemoveSite = (siteId: Id<"sites">) => {
    onSelectionChange(selectedSites.filter((id) => id !== siteId));
  };

  const handleCreateSite = async (data: {
    name: string;
    code?: string;
    address?: string;
    description?: string;
  }) => {
    try {
      // Check if site name already exists (case-insensitive)
      const siteNameLower = data.name.trim().toLowerCase();
      const existingSite = allSites?.find(
        (site) => site.name.toLowerCase() === siteNameLower
      );

      if (existingSite) {
        toast.error(`Site "${data.name}" already exists!`);
        return;
      }

      const newSiteId = await createSite(data);
      // Add the new site to selected sites
      onSelectionChange([...selectedSites, newSiteId]);
      // Close the create dialog but keep the popover open
      setShowCreateDialog(false);
      // Clear search to show all sites including the new one
      setSearchQuery("");
      // Keep popover open so user can see the newly created site
      // The query will auto-refresh and show the new site
      toast.success("Site created and selected successfully!");
    } catch (error: any) {
      // Check if error is about duplicate site
      if (error.message?.includes("already exists") || error.message?.includes("duplicate")) {
        toast.error(`Site "${data.name}" already exists!`);
      } else {
      toast.error(error.message || "Failed to create site");
      }
    }
  };

  return (
    <>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Sites</label>
          <span className="text-xs text-muted-foreground">
            {selectedSites.length} selected
          </span>
        </div>

        {/* Selected Sites Badges */}
        {selectedSiteDetails.length > 0 && (
          <div className="flex flex-wrap gap-1.5 p-2 border rounded-md bg-muted/30 min-h-[36px]">
            {selectedSiteDetails.map((site) => (
              <div key={site._id} className="flex items-center gap-1">
                <Popover>
                  <PopoverTrigger asChild>
                    <Badge
                      variant="secondary"
                      className="flex items-center gap-1 pr-1 cursor-pointer hover:bg-primary/10 transition-colors"
                    >
                      {site.name}
                      {!disabled && (
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            handleRemoveSite(site._id);
                          }}
                          className="ml-1 hover:bg-destructive/20 rounded-full p-0.5 transition-colors inline-flex items-center justify-center"
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if ((e.key === "Enter" || e.key === " ") && !disabled) {
                              e.preventDefault();
                              e.stopPropagation();
                              handleRemoveSite(site._id);
                            }
                          }}
                        >
                          <X className="h-3 w-3" />
                        </span>
                      )}
                    </Badge>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-4 z-[110]" align="start">
                    <div className="space-y-3">
                      <div>
                        <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-primary" />
                          {site.name}
                        </h4>
                      </div>
                      <div className="space-y-2 text-sm">
                        {site.code && (
                          <div className="flex items-start gap-2">
                            <Hash className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs text-muted-foreground">Site Code</p>
                              <p className="font-medium">{site.code}</p>
                            </div>
                          </div>
                        )}
                        {site.address && (
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <p className="text-xs text-muted-foreground">Address</p>
                              <div className="flex items-center gap-1">
                                <p className="font-medium text-xs flex-1">{site.address}</p>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const encodedAddress = encodeURIComponent(site.address || '');
                                    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
                                    window.open(mapUrl, '_blank');
                                  }}
                                  className="text-muted-foreground hover:text-primary transition-colors p-1 rounded-full hover:bg-muted/50 shrink-0 border border-muted-foreground/20 hover:border-primary/40"
                                  title="Open in Maps"
                                >
                                  <MapPin className="h-2.5 w-2.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                        {site.description && (
                          <div className="flex items-start gap-2">
                            <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs text-muted-foreground">Description</p>
                              <p className="font-medium text-xs">{site.description}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            ))}
          </div>
        )}

        {/* Site Selector Popover */}
        {!disabled && (
          <Popover open={open} onOpenChange={setOpen} modal={false}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start text-left font-normal h-9"
              >
                <Search className="mr-2 h-4 w-4" />
                {selectedSites.length === 0
                  ? "Select sites..."
                  : `${selectedSites.length} site(s) selected`}
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              className="w-[400px] p-0 z-[100]" 
              align="start" 
              sideOffset={4}
              onOpenAutoFocus={(e) => e.preventDefault()}
              onInteractOutside={(e) => {
                // Allow closing when clicking outside (form, screen, etc.)
                // Only prevent closing if clicking on the create site dialog
                const target = e.target as HTMLElement;
                
                // Check if clicking on create site dialog (has siteName input)
                const createSiteDialog = target.closest('[role="dialog"]');
                if (createSiteDialog) {
                  const hasSiteNameInput = createSiteDialog.querySelector('input[id="siteName"]');
                  if (hasSiteNameInput) {
                    // Don't close popover when clicking on create site dialog
                    e.preventDefault();
                    return;
                  }
                }
                // Otherwise, allow normal closing (clicking on form, screen, etc.)
              }}
              onEscapeKeyDown={(e) => {
                // Allow ESC to close
                setOpen(false);
              }}
            >
              <div className="p-3 border-b">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search sites..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              <div className="p-2 border-b">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2"
                  onClick={() => setShowCreateDialog(true)}
                >
                  <Plus className="h-4 w-4" />
                  Add New Site
                </Button>
              </div>

              <div className="max-h-[300px] overflow-y-auto">
                {!allSites ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Loading sites...
                  </div>
                ) : filteredSites.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    {searchQuery ? "No sites found" : "No sites available"}
                  </div>
                ) : (
                  <div className="p-1">
                    {filteredSites.map((site) => {
                      const isSelected = selectedSites.includes(site._id);
                      return (
                        <button
                          key={site._id}
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleToggleSite(site._id);
                            // Keep popover open after selecting
                          }}
                          className={cn(
                            "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left transition-colors",
                            "hover:bg-accent",
                            isSelected && "bg-accent"
                          )}
                        >
                          <div
                            className={cn(
                              "h-4 w-4 rounded border flex items-center justify-center shrink-0",
                              isSelected
                                ? "bg-primary border-primary"
                                : "border-input"
                            )}
                          >
                            {isSelected && (
                              <Check className="h-3 w-3 text-primary-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{site.name}</div>
                            {site.code && (
                              <div className="text-xs text-muted-foreground">
                                Code: {site.code}
                              </div>
                            )}
                            {site.address && (
                              <div className="text-xs text-muted-foreground truncate">
                                {site.address}
                              </div>
                            )}
                          </div>
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="shrink-0"
                          >
                            <Popover>
                              <PopoverTrigger asChild>
                                <span
                                  className="inline-flex items-center justify-center h-6 w-6 rounded hover:bg-primary/10 cursor-pointer transition-colors"
                                  role="button"
                                  tabIndex={0}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                    }
                                  }}
                                >
                                  <Info className="h-4 w-4 text-primary" />
                                </span>
                              </PopoverTrigger>
                              <PopoverContent className="w-80 p-4 z-[110]" align="end">
                                <div className="space-y-3">
                                  <div>
                                    <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                      <Building2 className="h-4 w-4 text-primary" />
                                      {site.name}
                                    </h4>
                                  </div>
                                  <div className="space-y-2 text-sm">
                                    {site.code && (
                                      <div className="flex items-start gap-2">
                                        <Hash className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                        <div>
                                          <p className="text-xs text-muted-foreground">Site Code</p>
                                          <p className="font-medium">{site.code}</p>
                                        </div>
                                      </div>
                                    )}
                                    {site.address && (
                                      <div className="flex items-start gap-2">
                                        <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                        <div>
                                          <p className="text-xs text-muted-foreground">Address</p>
                                          <p className="font-medium text-xs">{site.address}</p>
                                        </div>
                                      </div>
                                    )}
                                    {site.description && (
                                      <div className="flex items-start gap-2">
                                        <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                        <div>
                                          <p className="text-xs text-muted-foreground">Description</p>
                                          <p className="font-medium text-xs">{site.description}</p>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* Create Site Dialog */}
      <CreateSiteDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onCreate={handleCreateSite}
      />
    </>
  );
}

