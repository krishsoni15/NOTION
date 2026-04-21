"use client";

/**
 * Direct Actions Filters Component
 * 
 * Primary Tabs:
 * - All
 * - Cost Comparison (CC)
 * - Delivery Challan (DC)
 * - Purchase Orders (PO)
 * 
 * Secondary Filter:
 * - All
 * - Direct
 * - Request-based
 */

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { ClientWrapper } from "@/components/ui/client-wrapper";
import type { DirectActionFilters, DirectActionEntity } from "./types";

interface DirectActionsFiltersProps {
  filters: DirectActionFilters;
  onFiltersChange: (filters: DirectActionFilters) => void;
}

export function DirectActionsFilters({
  filters,
  onFiltersChange,
}: DirectActionsFiltersProps) {
  const handleEntityTypeChange = (value: string) => {
    onFiltersChange({
      ...filters,
      entityType: (value === "all" ? "all" : value) as "all" | DirectActionEntity,
    });
  };

  const handleActionTypeChange = (value: string) => {
    onFiltersChange({
      ...filters,
      actionType: value as any,
    });
  };

  const handleSearchChange = (value: string) => {
    onFiltersChange({
      ...filters,
      searchQuery: value,
    });
  };

  return (
    <div className="space-y-4">
      {/* Primary Tabs - Entity Type */}
      <ClientWrapper fallback={<div className="h-10 bg-muted rounded animate-pulse" />}>
        <Tabs
          value={filters.entityType}
          onValueChange={handleEntityTypeChange}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="cc">Cost Comparison</TabsTrigger>
            <TabsTrigger value="dc">Delivery Challan</TabsTrigger>
            <TabsTrigger value="po">Purchase Orders</TabsTrigger>
          </TabsList>
        </Tabs>
      </ClientWrapper>

      {/* Secondary Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by ID or title..."
            value={filters.searchQuery || ""}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Action Type Filter */}
        <ClientWrapper fallback={<div className="w-full sm:w-[200px] h-10 bg-muted rounded animate-pulse" />}>
          <Select value={filters.actionType} onValueChange={handleActionTypeChange}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filter by source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="direct">Direct Actions</SelectItem>
              <SelectItem value="request-based">Request-based</SelectItem>
            </SelectContent>
          </Select>
        </ClientWrapper>
      </div>
    </div>
  );
}
