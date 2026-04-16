"use client";

/**
 * Site Management Component
 * 
 * Main component for managing sites with search, filters, and responsive views.
 */

import { useState, useMemo, useEffect } from "react";
import { useQuery } from "convex/react";
import { useAuth } from "@/app/providers/auth-provider";
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
import { PaginationControls } from "@/components/ui/pagination-controls";
import { LocationFormDialog } from "./location-form-dialog";
import { LocationTable } from "./location-table";
import { useViewMode } from "@/hooks/use-view-mode";
import { cn } from "@/lib/utils";

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
  const { isAuthenticated } = useAuth();


  // Onlyfetch sites if user is signed in
  const locations = useQuery(
    api.sites.getAllSites,
    isAuthenticated ? { includeInactive: true } : "skip"
  );

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    // Load from localStorage on mount
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('locationPageSize');
      return saved ? Number(saved) : 10;
    }
    return 10;
  });

  // Save page size to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('locationPageSize', pageSize.toString());
    }
  }, [pageSize]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, typeFilter, sortBy]);

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
      {/* Search and Filters Toolbar */}
      <div className="flex flex-col gap-3 bg-card p-3 rounded-xl border border-border shadow-sm">
        {/* Row 1: Search and View Toggle */}
        <div className="flex items-center gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by name, code, address, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 bg-muted/30 border-muted-foreground/20 focus-visible:ring-primary/20 transition-all font-medium w-full"
            />
          </div>

          {/* View mode toggle */}
          <Button
            variant="outline"
            size="icon"
            onClick={toggleViewMode}
            className="h-10 w-10 flex-shrink-0 bg-muted/30 border-muted-foreground/20 hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-all"
            title={viewMode === "card" ? "Switch to Table View" : "Switch to Card View"}
          >
            {viewMode === "card" ? (
              <Table2 className="h-5 w-5" />
            ) : (
              <LayoutGrid className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Row 2: Filters and Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-border/50">
          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[120px] h-10 text-sm bg-muted/30 border-muted-foreground/20 font-medium">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="site">Site</SelectItem>
                <SelectItem value="inventory">Inventory</SelectItem>
                <SelectItem value="other">Others</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[120px] h-10 text-sm bg-muted/30 border-muted-foreground/20 font-medium">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
              <SelectTrigger className="w-[140px] h-10 text-sm bg-muted/30 border-muted-foreground/20 font-medium">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="name_asc">Name (A-Z)</SelectItem>
                <SelectItem value="name_desc">Name (Z-A)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={() => setIsCreateDialogOpen(true)}
            className="h-10 px-6 shadow-sm hover:shadow-md transition-all font-semibold w-full sm:w-auto"
          >
            <Plus className="h-5 w-5 mr-1.5" />
            Add Location
          </Button>
        </div>
      </div>

      {/* Pagination Logic */}
      {(() => {
        const totalItems = filteredAndSortedLocations?.length || 0;
        const totalPages = Math.ceil(totalItems / pageSize);
        const paginatedLocations = filteredAndSortedLocations?.slice(
          (currentPage - 1) * pageSize,
          currentPage * pageSize
        );

        return (
          <>
            {/* Top Pagination */}
            <div className="mb-4 bg-card p-2 rounded-xl border border-border shadow-sm">
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                pageSize={pageSize}
                onPageSizeChange={setPageSize}
                totalItems={totalItems}
                pageSizeOptions={[10, 25, 50, 100]}
                itemCount={paginatedLocations?.length || 0}
                className="py-0"
              />
            </div>

            <LocationTable
              key={refreshKey}
              locations={paginatedLocations}
              viewMode={viewMode}
            />

            {/* Bottom Pagination */}
            <div className="mt-4 bg-card p-2 rounded-xl border border-border shadow-sm">
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                pageSize={pageSize}
                onPageSizeChange={setPageSize}
                totalItems={totalItems}
                pageSizeOptions={[10, 25, 50, 100]}
                itemCount={paginatedLocations?.length || 0}
                className="py-0"
              />
            </div>
          </>
        );
      })()}

      {/* Create location dialog */}
      <LocationFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </div>
  );
}

