"use client";

/**
 * Client Component for Manager Dashboard
 *
 * Dashboard with requests table, filters, and search - matching site engineer layout.
 */

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { RequestsTable } from "@/components/requests/requests-table";
import { RequestDetailsDialog } from "@/components/requests/request-details-dialog";
import { SiteInfoDialog } from "@/components/requests/site-info-dialog";
import { Button } from "@/components/ui/button";
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
import { Plus, Search, LayoutGrid, Table2, Users, CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { normalizeSearchQuery, matchesSearchQuery } from "@/lib/utils";
import type { Id } from "@/convex/_generated/dataModel";

// Enhanced precise search function with priority for exact matches
const fuzzySearch = (request: any, query: string): boolean => {
  if (!query || !query.trim()) return true;

  const searchTerm = normalizeSearchQuery(query);
  if (!searchTerm) return true;

  // Split query into individual words for multi-term search
  const searchWords = searchTerm.split(/\s+/).filter(word => word.length > 0);
  if (searchWords.length === 0) return true;

  // PRIORITY 1: Exact request number matches (highest priority)
  if (request.requestNumber) {
    const requestNum = normalizeSearchQuery(request.requestNumber);
    // Check exact match with "REQ-" prefix
    if (requestNum === searchTerm || requestNum === `req-${searchTerm}`) {
      return true;
    }
    // Check just the number part
    const justNumber = requestNum.replace(/^req-/, '');
    if (justNumber === searchTerm) {
      return true;
    }
  }

  // PRIORITY 2: Exact item order matches
  if (request.itemOrder?.toString() === searchTerm) {
    return true;
  }

  // PRIORITY 3: Exact matches in other fields
  const exactMatchFields = [
    request.itemName,
    request.site?.name,
    request.description,
    request.specsBrand
  ];

  for (const field of exactMatchFields) {
    if (field && normalizeSearchQuery(field) === searchTerm) {
      return true;
    }
  }

  // PRIORITY 4: Contains matches (substring search)
  const containsMatchFields = [
    request.requestNumber,
    request.requestNumber?.replace(/^REQ-/, ''), // Just the number part
    request.itemOrder?.toString(),
    request.itemName,
    request.site?.name,
    request.description,
    request.specsBrand
  ];

  // Check if search term is contained in any field
  // Allow substring matching for all terms, but be more selective for short terms
  for (const field of containsMatchFields) {
    if (!field) continue;

    const normalizedField = normalizeSearchQuery(field);

    // For very short terms (1-2 chars), only match at the beginning of request numbers
    if (searchTerm.length <= 2) {
      // Special handling for request numbers - allow substring match
      if (field === request.requestNumber?.replace(/^REQ-/, '') && normalizedField.includes(searchTerm)) {
        return true;
      }
      // For item orders, allow exact prefix match
      if (field === request.itemOrder?.toString() && normalizedField.startsWith(searchTerm)) {
        return true;
      }
    } else {
      // Normal substring matching for longer terms
      if (normalizedField.includes(searchTerm)) {
        return true;
      }
    }
  }

  // PRIORITY 5: Fuzzy matching only for longer terms (>4 chars) or specific cases
  if (searchTerm.length > 4) {
    const matchesAnyWord = (fieldValue: string | undefined | null): boolean => {
      if (!fieldValue) return false;
      const normalizedField = normalizeSearchQuery(fieldValue);

      return searchWords.every(word => {
        // Exact substring match first
        if (normalizedField.includes(word)) return true;
        // Only do fuzzy matching for longer words
        if (word.length > 3) {
          return fuzzyMatch(normalizedField, word);
        }
        return false;
      });
    };

    const fuzzyMatchFields = [
      request.itemName,
      request.site?.name,
      request.description
    ];

    if (fuzzyMatchFields.some(field => matchesAnyWord(field))) {
      return true;
    }
  }

  return false;
};

// Simplified fuzzy matching - only for longer terms
const fuzzyMatch = (text: string, pattern: string): boolean => {
  if (pattern.length <= 3) return false; // No fuzzy matching for short terms

  // Simple fuzzy: allow 1 character difference
  let differences = 0;
  let i = 0;
  let j = 0;

  while (i < text.length && j < pattern.length) {
    if (text[i] === pattern[j]) {
      i++;
      j++;
    } else {
      differences++;
      if (differences > 1) return false;
      // Try skipping a character in text or pattern
      if (text[i + 1] === pattern[j]) {
        i++;
      } else if (text[i] === pattern[j + 1]) {
        j++;
      } else {
        i++;
        j++;
      }
    }
  }

  return differences <= 1 && j === pattern.length;
};

// Status color mapping for dropdown
const getStatusColor = (status: string) => {
  switch (status) {
    case "draft":
      return "text-gray-700 dark:text-gray-300";
    case "pending":
      return "text-yellow-700 dark:text-yellow-300";
    case "approved":
      return "text-green-700 dark:text-green-300";
    case "ready_for_cc":
      return "text-blue-700 dark:text-blue-300";
    case "cc_pending":
      return "text-purple-700 dark:text-purple-300";
    case "cc_approved":
      return "text-indigo-700 dark:text-indigo-300";
    case "ready_for_po":
      return "text-cyan-700 dark:text-cyan-300";
    case "delivery_stage":
      return "text-orange-700 dark:text-orange-300";
    case "rejected":
      return "text-red-700 dark:text-red-300";
    case "delivered":
      return "text-blue-700 dark:text-blue-300";
    default:
      return "text-gray-700 dark:text-gray-300";
  }
};

export default function ManagerDashboardClient() {
  const [selectedRequestId, setSelectedRequestId] = useState<Id<"requests"> | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState<Id<"sites"> | null>(null);
  const [viewMode, setViewMode] = useState<"card" | "table">("card");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const previousRequestsRef = useRef<typeof allRequests>(undefined);

  // Debounce search query for better performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 150); // 150ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Get all requests for manager
  const allRequests = useQuery(api.requests.getAllRequests);

  // Filter requests based on search and status
  const filterRequests = useCallback((requestsList: typeof allRequests) => {
    if (!requestsList) return [];

    let filtered = requestsList;

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }

    // Enhanced fuzzy search with priority on ID, order ID, and item name
    if (debouncedSearchQuery.trim()) {
      filtered = filtered.filter((r) => fuzzySearch(r, debouncedSearchQuery));
    }

    return filtered;
  }, [debouncedSearchQuery, statusFilter]);

  const filteredRequests = useMemo(() => filterRequests(allRequests), [allRequests, filterRequests]);

  // Group requests by requestNumber for display
  const groupedRequests = useMemo(() => {
    if (!filteredRequests) return [];

    const groups = new Map<string, typeof filteredRequests>();
    filteredRequests.forEach((request) => {
      const group = groups.get(request.requestNumber) || [];
      group.push(request);
      groups.set(request.requestNumber, group);
    });

    // Convert to array and sort by newest first
    return Array.from(groups.entries())
      .map(([requestNumber, items]) => {
        const sortedItems = items.sort((a, b) => (b.itemOrder || 0) - (a.itemOrder || 0));
        return {
          requestNumber,
          items: sortedItems,
          firstItem: sortedItems[0],
        };
      })
      .sort((a, b) => {
        const aLatest = Math.max(...a.items.map((i) => i.updatedAt || i.createdAt));
        const bLatest = Math.max(...b.items.map((i) => i.updatedAt || i.createdAt));
        return bLatest - aLatest;
      });
  }, [filteredRequests]);

  if (!allRequests) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search requests, items, sites..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        {/* Status Filter */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="ready_for_cc">Ready for CC</SelectItem>
            <SelectItem value="cc_pending">CC Pending</SelectItem>
            <SelectItem value="cc_approved">CC Approved</SelectItem>
            <SelectItem value="ready_for_po">Ready for PO</SelectItem>
            <SelectItem value="delivery_stage">Delivery Stage</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>

        {/* View Toggle */}
        <div className="flex border rounded-md">
          <Button
            variant={viewMode === "card" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("card")}
            className="rounded-r-none h-9"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "table" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("table")}
            className="rounded-l-none h-9"
          >
            <Table2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {groupedRequests.length} request{groupedRequests.length !== 1 ? 's' : ''} found
        </span>
        {debouncedSearchQuery && (
          <span>Search: "{debouncedSearchQuery}"</span>
        )}
      </div>

      {/* Requests Display */}
      {groupedRequests.length > 0 ? (
        <RequestsTable
          requests={groupedRequests.flatMap(group => group.items)}
          viewMode={viewMode}
          showCreator={true}
          onViewDetails={setSelectedRequestId}
        />
      ) : (
        <div className="text-center py-12">
          <div className="text-muted-foreground">
            {debouncedSearchQuery || statusFilter !== "all" ? (
              <>
                <p className="text-lg font-medium">No requests found</p>
                <p className="text-sm">Try adjusting your search or filters</p>
              </>
            ) : (
              <>
                <p className="text-lg font-medium">No requests yet</p>
                <p className="text-sm">Site engineers will create requests soon</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Request Details Dialog */}
      <RequestDetailsDialog
        open={!!selectedRequestId}
        onOpenChange={(open) => {
          if (!open) setSelectedRequestId(null);
        }}
        requestId={selectedRequestId}
      />

      {/* Site Info Dialog */}
      <SiteInfoDialog
        open={!!selectedSiteId}
        onOpenChange={(open) => {
          if (!open) setSelectedSiteId(null);
        }}
        siteId={selectedSiteId}
      />
    </div>
  );
}
