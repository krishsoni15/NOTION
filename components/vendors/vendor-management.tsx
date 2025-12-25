"use client";

/**
 * Vendor Management Component
 * 
 * Main component for managing vendors with search, filters, and responsive views.
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
import { VendorFormDialog } from "./vendor-form-dialog";
import { VendorTable } from "./vendor-table";
import { useUserRole } from "@/hooks/use-user-role";
import { ROLES } from "@/lib/auth/roles";

type ViewMode = "table" | "card";
type SortOption = "newest" | "oldest" | "name_asc" | "name_desc";

interface VendorManagementProps {
  showTableOnly?: boolean;
}

export function VendorManagement({ showTableOnly = false }: VendorManagementProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { isLoaded, isSignedIn } = useAuth();
  const userRole = useUserRole();
  
  const canCreate = userRole === ROLES.PURCHASE_OFFICER;

  // Auto-detect mobile and switch to card view
  useEffect(() => {
    const checkMobile = () => {
      if (window.innerWidth < 768) {
        setViewMode("card");
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Only fetch vendors if user is signed in
  const vendors = useQuery(
    api.vendors.getAllVendors,
    isLoaded && isSignedIn ? {} : "skip"
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    setRefreshKey((prev) => prev + 1);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  // Filter and sort vendors
  const filteredAndSortedVendors = useMemo(() => {
    if (!vendors) return undefined;

    let filtered = [...vendors];

    // Search filter - smart search with normalized query
    const normalizedQuery = normalizeSearchQuery(searchQuery);
    if (normalizedQuery) {
      filtered = filtered.filter((vendor) =>
        matchesAnySearchQuery(
          [
            vendor.companyName,
            vendor.email,
            vendor.phone,
            vendor.gstNumber,
            vendor.address,
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
          return a.companyName.localeCompare(b.companyName);
        case "name_desc":
          return b.companyName.localeCompare(a.companyName);
        default:
          return 0;
      }
    });

    return filtered;
  }, [vendors, searchQuery, sortBy]);

  if (showTableOnly) {
    return <VendorTable vendors={filteredAndSortedVendors ?? undefined} viewMode={viewMode} />;
  }

  return (
    <div className="space-y-4">
      {/* Action bar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        <div className="flex items-center gap-2">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{vendors?.length || 0}</span> vendors
            {filteredAndSortedVendors && filteredAndSortedVendors.length !== vendors?.length && (
              <span className="ml-1">
                ({filteredAndSortedVendors.length} shown)
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
        {canCreate && (
          <Button onClick={() => setIsCreateDialogOpen(true)} className="w-full sm:w-auto h-9" size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Vendor
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-2.5">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by company, email, phone, GST, or address..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        {/* Filters row */}
        <div className="flex flex-col sm:flex-row gap-2">
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
              variant={viewMode === "table" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("table")}
              className="h-9 w-9"
            >
              <Table2 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "card" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("card")}
              className="h-9 w-9"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Vendor table/cards */}
      <VendorTable 
        key={refreshKey}
        vendors={filteredAndSortedVendors ?? undefined} 
        viewMode={viewMode}
      />

      {/* Create vendor dialog */}
      {canCreate && (
        <VendorFormDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
        />
      )}
    </div>
  );
}

