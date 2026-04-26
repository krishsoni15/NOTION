"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, FileBarChart2, Truck, ShoppingCart, LayoutList, Filter } from "lucide-react";
import { ClientWrapper } from "@/components/ui/client-wrapper";
import type { DirectActionFilters, DirectActionEntity } from "./types";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DirectActionsFiltersProps {
  filters: DirectActionFilters;
  onFiltersChange: (filters: DirectActionFilters) => void;
}

const tabs: { value: "all" | DirectActionEntity; label: string; icon: React.ElementType }[] = [
  { value: "all", label: "All", icon: LayoutList },
  { value: "cc", label: "Cost Comparison", icon: FileBarChart2 },
  { value: "dc", label: "Delivery Challan", icon: Truck },
  { value: "po", label: "Purchase Orders", icon: ShoppingCart },
];

const sourceOptions: { value: string; label: string }[] = [
  { value: "all", label: "All Sources" },
  { value: "direct", label: "Direct" },
  { value: "request-based", label: "Request-based" },
];

const statusOptionsMap: Record<string, { value: string; label: string }[]> = {
  all: [
    { value: "all", label: "All Statuses" },
    { value: "closed", label: "Closed" },
    { value: "cancelled", label: "Cancelled" },
    { value: "delivered", label: "Delivered" },
  ],
  cc: [
    { value: "all", label: "All Statuses" },
    { value: "draft", label: "Draft" },
    { value: "cc_pending", label: "Pending" },
    { value: "cc_approved", label: "Approved" },
    { value: "cc_rejected", label: "Rejected" },
  ],
  dc: [
    { value: "all", label: "All Statuses" },
    { value: "pending", label: "Pending" },
    { value: "delivered", label: "Delivered" },
    { value: "cancelled", label: "Cancelled" },
  ],
  po: [
    { value: "all", label: "All Statuses" },
    { value: "pending_approval", label: "Pending Approval" },
    { value: "sign_pending", label: "Awaiting Signature" },
    { value: "approved", label: "Approved" },
    { value: "ordered", label: "Ordered" },
    { value: "delivered", label: "Delivered" },
    { value: "cancelled", label: "Cancelled" },
    { value: "closed", label: "Closed" },
  ],
};

export function DirectActionsFilters({ filters, onFiltersChange }: DirectActionsFiltersProps) {
  const setEntity = (v: string) => {
    const entityType = (v === "all" ? "all" : v) as "all" | DirectActionEntity;
    onFiltersChange({ ...filters, entityType, statusFilter: undefined });
  };

  const setSource = (v: string) =>
    onFiltersChange({ ...filters, actionType: v as any });

  const setSearch = (v: string) =>
    onFiltersChange({ ...filters, searchQuery: v });

  const setStatus = (v: string) =>
    onFiltersChange({ ...filters, statusFilter: v === "all" ? undefined : v });

  const statusOptions = statusOptionsMap[filters.entityType] || statusOptionsMap.all;

  return (
    <div className="space-y-3">
      {/* Entity Type Tabs */}
      <ClientWrapper fallback={<div className="h-10 rounded-xl bg-muted animate-pulse" />}>
        <div className="flex items-center gap-1 p-1 rounded-xl bg-muted/60 border border-border/50 w-full overflow-x-auto">
          {tabs.map(({ value, label, icon: Icon }) => {
            const active = filters.entityType === value;
            return (
              <button
                key={value}
                onClick={() => setEntity(value)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-150 flex-1 justify-center",
                  active
                    ? "bg-background shadow-sm text-foreground border border-border/60"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            );
          })}
        </div>
      </ClientWrapper>

      {/* Search + Source + Status */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by ID or title…"
            value={filters.searchQuery || ""}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-sm pr-8"
          />
          {filters.searchQuery && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex gap-2">
          {/* Status Filter */}
          <Select value={filters.statusFilter || "all"} onValueChange={setStatus}>
            <SelectTrigger className="h-9 text-[11px] font-medium w-[140px] bg-muted/40 border-border/50">
              <div className="flex items-center gap-2">
                <Filter className="h-3 w-3 text-muted-foreground" />
                <SelectValue placeholder="Status" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Source Segmented Control */}
          <ClientWrapper fallback={<div className="w-44 h-9 rounded-lg bg-muted animate-pulse" />}>
            <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-muted/60 border border-border/50">
              {sourceOptions.map(({ value, label }) => {
                const active = filters.actionType === value;
                return (
                  <button
                    key={value}
                    onClick={() => setSource(value)}
                    className={cn(
                      "px-2.5 py-1.5 rounded-md text-[11px] font-medium whitespace-nowrap transition-all duration-150",
                      active
                        ? "bg-background shadow-sm text-foreground border border-border/60"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </ClientWrapper>
        </div>
      </div>
    </div>
  );
}
