"use client";

/**
 * Site Management Component
 * 
 * Main component for managing sites with search, filters, and responsive views.
 */

import { useState, useMemo, useEffect } from "react";
import { useQuery } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { normalizeSearchQuery, matchesAnySearchQuery } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// ... imports
import { Plus, Search, LayoutGrid, Table2, RefreshCw } from "lucide-react";
import { LocationFormDialog } from "./location-form-dialog";
import { LocationTable } from "./location-table";
import { useViewMode } from "@/hooks/use-view-mode";

type ViewMode = "table" | "card";
type SortOption = "newest" | "oldest" | "name_asc" | "name_desc";

export function LocationManagement() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const { viewMode, toggleViewMode } = useViewMode("location-view-mode");
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { isLoaded, isSignedIn } = useAuth();

  // Onlyfetch sites if user is signed in
  const locations = useQuery(
    api.sites.getAllSites,
    isLoaded && isSignedIn ? { includeInactive: true } : "skip"
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    setRefreshKey((prev) => prev + 1);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  // Filter and sort locations
  const filteredAndSortedLocations = useMemo(() => {
    if (!locations) return undefined;

    let filtered = [...locations];

    // Search filter - smart search with normalized query
    const normalizedQuery = normalizeSearchQuery(searchQuery);
    if (normalizedQuery) {
      filtered = filtered.filter((site) =>
        matchesAnySearchQuery(
          [site.name, site.code, site.address, site.description],
          normalizedQuery
        )
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      const isActive = statusFilter === "active";
      filtered = filtered.filter((site) => site.isActive === isActive);
    }

    // Type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter((site) => {
        const siteType = site.type || "site"; // Default to 'site' for legacy records
        return siteType === typeFilter;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return b.createdAt - a.createdAt;
        case "oldest":
          return a.createdAt - b.createdAt;
        case "name_asc":
          return a.name.localeCompare(b.name);
        case "name_desc":
          return b.name.localeCompare(a.name);
        default:
          return 0;
      }
    });

    return filtered;
  }, [locations, searchQuery, statusFilter, typeFilter, sortBy]);

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{locations?.length || 0}</span> locations
            {filteredAndSortedLocations && filteredAndSortedLocations.length !== locations?.length && (
              <span className="ml-1">
                ({filteredAndSortedLocations.length} shown)
              </span>
            )}
          </p>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            className="h-8 w-8"
            title="Refresh"
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} className="w-full sm:w-auto h-9" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Location
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-2.5">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by name, code, address, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        {/* Filters row */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full sm:w-[120px] h-9 text-sm">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="site">Site</SelectItem>
              <SelectItem value="inventory">Inventory</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[120px] h-9 text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
            <SelectTrigger className="w-full sm:w-[140px] h-9 text-sm">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="name_asc">Name A-Z</SelectItem>
              <SelectItem value="name_desc">Name Z-A</SelectItem>
            </SelectContent>
          </Select>

          {/* View mode toggle */}
          <div className="flex gap-1 ml-auto">
            <Button
              variant="outline"
              size="icon"
              onClick={toggleViewMode}
              className="h-9 w-9 flex-shrink-0"
              title={viewMode === "card" ? "Show Table" : "Show Cards"}
            >
              {viewMode === "card" ? (
                <Table2 className="h-4 w-4" />
              ) : (
                <LayoutGrid className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Location table/cards */}
      <LocationTable
        key={refreshKey}
        locations={filteredAndSortedLocations ?? undefined}
        viewMode={viewMode}
      />

      {/* Create location dialog */}
      <LocationFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </div>
  );
}

