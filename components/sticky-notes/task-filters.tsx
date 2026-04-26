"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronsUp, Equal, ChevronsDown, ListFilter } from "lucide-react";

export type ViewFilter = "me" | "assigned" | "all" | "self" | "manager_assigned";
export type PriorityFilter = "high" | "medium" | "low" | "all";

interface TaskFiltersProps {
  viewFilter: ViewFilter;
  setViewFilter: (v: ViewFilter) => void;
  priorityFilter: PriorityFilter;
  setPriorityFilter: (v: PriorityFilter) => void;
  isManager: boolean;
}

export function TaskFilters({
  viewFilter,
  setViewFilter,
  priorityFilter,
  setPriorityFilter,
  isManager,
}: TaskFiltersProps) {
  const getPriorityIcon = (p: string) => {
    switch (p) {
      case "high": return <ChevronsUp className="w-3 h-3 mr-1 text-red-500" />;
      case "medium": return <Equal className="w-3 h-3 mr-1 text-orange-500" />;
      case "low": return <ChevronsDown className="w-3 h-3 mr-1 text-blue-500" />;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col gap-3 w-full pb-1">
      {/* View Filter */}
      <div className="flex items-center p-1 bg-muted/40 rounded-lg border border-border/50 w-fit">
      {/* Non-manager: All / Self / Assigned tabs */}
      {!isManager && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewFilter("me")}
            className={`h-7 text-xs font-medium px-3 rounded-md transition-all ${viewFilter === "me" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"}`}
          >
            All
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewFilter("self")}
            className={`h-7 text-xs font-medium px-3 rounded-md transition-all ${viewFilter === "self" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"}`}
          >
            Self
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewFilter("manager_assigned")}
            className={`h-7 text-xs font-medium px-3 rounded-md transition-all ${viewFilter === "manager_assigned" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"}`}
          >
            Assigned
          </Button>
        </>
      )}
      {/* Manager: My Tasks / Assigned by Me / All Tasks */}
      {isManager && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewFilter("me")}
            className={`h-7 text-xs font-medium px-3 rounded-md transition-all ${viewFilter === "me" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"}`}
          >
            My Tasks
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewFilter("assigned")}
            className={`h-7 text-xs font-medium px-3 rounded-md transition-all ${viewFilter === "assigned" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"}`}
          >
            Assigned by Me
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewFilter("all")}
            className={`h-7 text-xs font-medium px-3 rounded-md transition-all ${viewFilter === "all" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"}`}
          >
            All Tasks
          </Button>
        </>
      )}
      </div>

      {/* Priority Filters */}
      <div className="flex items-center gap-2 flex-wrap bg-muted/40 p-1.5 rounded-lg border border-border/50">
        <div className="flex items-center text-xs font-semibold text-muted-foreground mr-1 px-1">
          <ListFilter className="w-3.5 h-3.5 mr-1.5" />
          Priority
        </div>
        
        <div className="flex gap-1">
          {(["all", "high", "medium", "low"] as const).map((p) => (
            <button
              key={p}
              className={`flex items-center justify-center capitalize text-xs px-2.5 py-1 rounded-md transition-all font-medium border ${priorityFilter === p ? "bg-background shadow-sm border-border/60 text-foreground" : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/60"}`}
              onClick={() => setPriorityFilter(p)}
            >
              {getPriorityIcon(p)}
              {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
