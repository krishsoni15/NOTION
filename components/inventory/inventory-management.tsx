"use client";

/**
 * Inventory Management Component
 * 
 * Main component for managing inventory items with search, filters, and responsive views.
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
import { Plus, Search, LayoutGrid, Table2, RefreshCw } from "lucide-react";
import { InventoryFormDialog } from "./inventory-form-dialog";
import { InventoryTable } from "./inventory-table";
import { ROLES, Role } from "@/lib/auth/roles";
import { useViewMode } from "@/hooks/use-view-mode";
import { PaginationControls } from "@/components/ui/pagination-controls";

type ViewMode = "table" | "card";
type SortOption = "newest" | "oldest" | "name_asc" | "name_desc" | "stock_asc" | "stock_desc";

interface InventoryManagementProps {
  userRole: Role;
}

export function InventoryManagement({ userRole }: InventoryManagementProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const { viewMode, toggleViewMode } = useViewMode("inventory-view-mode");
  const [refreshKey, setRefreshKey] = useState(Date.now());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { isLoaded, isSignedIn } = useAuth();

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);

  const [pageSize, setPageSize] = useState(() => {
    // Load from localStorage on mount
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('inventoryPageSize');
      return saved ? Number(saved) : 10;
    }
    return 10;
  });

  // Save page size to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('inventoryPageSize', pageSize.toString());
    }
  }, [pageSize]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortBy]);

  const canCreate = userRole === ROLES.PURCHASE_OFFICER;

  // Only fetch inventory if user is signed in
  const items = useQuery(
    api.inventory.getAllInventoryItems,
    isLoaded && isSignedIn ? {} : "skip"
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    setRefreshKey(Date.now());
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  // Filter and sort inventory items
  const filteredAndSortedItems = useMemo(() => {
    if (!items) return undefined;

    let filtered = [...items];

    // Search filter - smart search with normalized query
    const normalizedQuery = normalizeSearchQuery(searchQuery);
    if (normalizedQuery) {
      filtered = filtered.filter((item) =>
        matchesAnySearchQuery(
          [
            item.itemName,
            item.unit,
            item.vendor?.companyName,
            // Also search in multiple vendors if available
            ...(item.vendors?.map((v) => v.companyName) || []),
          ],
          normalizedQuery
        )
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return b.createdAt - a.createdAt;
        case "oldest":
          return a.createdAt - b.createdAt;
        case "name_asc":
          return a.itemName.localeCompare(b.itemName);
        case "name_desc":
          return b.itemName.localeCompare(a.itemName);
        case "stock_asc":
          return (a.centralStock || 0) - (b.centralStock || 0);
        case "stock_desc":
          return (b.centralStock || 0) - (a.centralStock || 0);
        default:
          return 0;
      }
    });

    return filtered;
  }, [items, searchQuery, sortBy]);

  return (
    <div className="space-y-4">
      {/* Action bar */}


      {/* Search and Filters Toolbar */}
      <div className="flex flex-col gap-3 bg-card p-3 rounded-xl border border-border shadow-sm">
        {/* Row 1: Search and View Toggle */}
        <div className="flex items-center gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by item name, unit, or vendor..."
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
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-border/50">
          {/* Sort Filter */}
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
            <SelectTrigger className="w-[180px] h-10 text-sm bg-muted/30 border-muted-foreground/20 font-medium">
              <SelectValue placeholder="Sort Items" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="name_asc">Name (A-Z)</SelectItem>
              <SelectItem value="name_desc">Name (Z-A)</SelectItem>
              <SelectItem value="stock_asc">Stock (Low-High)</SelectItem>
              <SelectItem value="stock_desc">Stock (High-Low)</SelectItem>
            </SelectContent>
          </Select>

          {/* Add Item Button */}
          {canCreate && (
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              className="h-10 px-6 shadow-sm hover:shadow-md transition-all font-semibold"
            >
              <Plus className="h-5 w-5 mr-1.5" />
              Add New Item
            </Button>
          )}
        </div>
      </div>



      {/* Pagination Logic */}
      {
        (() => {
          const totalItems = filteredAndSortedItems?.length || 0;
          const totalPages = Math.ceil(totalItems / pageSize);
          const paginatedItems = filteredAndSortedItems?.slice(
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
                  itemCount={paginatedItems?.length || 0}
                  className="py-0"
                />
              </div>

              <InventoryTable
                key={refreshKey}
                items={paginatedItems}
                viewMode={viewMode}
                onRefresh={handleRefresh}
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
                  itemCount={paginatedItems?.length || 0}
                  className="py-0"
                />
              </div>
            </>
          );
        })()}

      {/* Create inventory dialog */}
      {
        canCreate && (
          <InventoryFormDialog
            open={isCreateDialogOpen}
            onOpenChange={(open) => {
              setIsCreateDialogOpen(open);
              if (!open) {
                // Refresh data when dialog closes (after successful operations)
                handleRefresh();
              }
            }}
          />
        )
      }
    </div >
  );
}

