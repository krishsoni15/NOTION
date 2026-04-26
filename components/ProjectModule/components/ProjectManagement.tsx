"use client";

/**
 * Project Management Component
 * 
 * Main component for managing projects with search, filters, and responsive views.
 * Mirrors the LocationManagement component for design consistency.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, LayoutGrid, Table2 } from "lucide-react";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { useViewMode } from "@/hooks/use-view-mode";
import { useProjectLogic } from "../hooks/useProjectLogic";
import { ProjectTable } from "./ProjectTable";
import { ProjectFormDialog } from "./ProjectFormDialog";
import type { ProjectSortOption } from "../types/project.types";

export function ProjectManagement() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { viewMode, toggleViewMode } = useViewMode("project-view-mode");

  const {
    projects,
    isLoading,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    sortBy,
    setSortBy,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalItems,
    totalPages,
    createProject,
    uploadPdf,
  } = useProjectLogic();

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
              placeholder="Search by name, description, or location..."
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

            <Select value={sortBy} onValueChange={(value) => setSortBy(value as ProjectSortOption)}>
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
            Create Project
          </Button>
        </div>
      </div>

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
          itemCount={projects?.length || 0}
          className="py-0"
        />
      </div>

      {/* Project Table / Cards */}
      <ProjectTable
        projects={projects}
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
          itemCount={projects?.length || 0}
          className="py-0"
        />
      </div>

      {/* Create Project Dialog */}
      <ProjectFormDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </div>
  );
}
