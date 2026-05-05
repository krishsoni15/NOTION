/**
 * Project Selector Component
 *
 * Multi-select dropdown for assigning projects to site engineers.
 * Labeled as "Project (Site)" to indicate projects replace site assignments.
 */

"use client";

import { useState } from "react";
import { Search, X, Check, MapPin, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { normalizeSearchQuery, matchesAnySearchQuery } from "@/lib/utils";
import type { Id } from "@/convex/_generated/dataModel";

interface ProjectSelectorProps {
  selectedProjects: Id<"projects">[];
  onSelectionChange: (projectIds: Id<"projects">[]) => void;
  disabled?: boolean;
}

export function ProjectSelector({
  selectedProjects,
  onSelectionChange,
  disabled = false,
}: ProjectSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const allProjects = useQuery(api.projects.getAllProjects, {});

  const filteredProjects =
    allProjects?.filter((project) => {
      const normalizedQuery = normalizeSearchQuery(searchQuery);
      if (!normalizedQuery) return true;
      return matchesAnySearchQuery(
        [project.name, project.location ?? ""],
        normalizedQuery
      );
    }) || [];

  const selectedProjectDetails =
    allProjects?.filter((p) => selectedProjects.includes(p._id)) || [];

  const handleToggle = (projectId: Id<"projects">) => {
    if (selectedProjects.includes(projectId)) {
      onSelectionChange(selectedProjects.filter((id) => id !== projectId));
    } else {
      onSelectionChange([...selectedProjects, projectId]);
    }
  };

  const handleRemove = (projectId: Id<"projects">) => {
    onSelectionChange(selectedProjects.filter((id) => id !== projectId));
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Project (Site)</label>
        <span className="text-xs text-muted-foreground">
          {selectedProjects.length} selected
        </span>
      </div>

      {/* Selected Project Badges */}
      {selectedProjectDetails.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-2 border rounded-md bg-muted/30 min-h-[36px]">
          {selectedProjectDetails.map((project) => (
            <Badge
              key={project._id}
              variant="secondary"
              className="flex items-center gap-1 pr-1"
            >
              <FolderOpen className="h-3 w-3 shrink-0" />
              {project.name}
              {project.location && (
                <span className="text-muted-foreground text-[10px] ml-0.5">
                  ({project.location})
                </span>
              )}
              {!disabled && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handleRemove(project._id);
                  }}
                  className="ml-1 hover:bg-destructive/20 rounded-full p-0.5 transition-colors inline-flex items-center justify-center cursor-pointer"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleRemove(project._id);
                    }
                  }}
                >
                  <X className="h-3 w-3" />
                </span>
              )}
            </Badge>
          ))}
        </div>
      )}

      {/* Project Selector Popover */}
      {!disabled && (
        <Popover open={open} onOpenChange={setOpen} modal={false}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className="w-full justify-start text-left font-normal h-9"
            >
              <Search className="mr-2 h-4 w-4" />
              {selectedProjects.length === 0
                ? "Select projects..."
                : `${selectedProjects.length} project(s) selected`}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[400px] p-0 z-[100]"
            align="start"
            sideOffset={4}
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="max-h-[300px] overflow-y-auto">
              {!allProjects ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Loading projects...
                </div>
              ) : filteredProjects.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  {searchQuery ? "No projects found" : "No projects available"}
                </div>
              ) : (
                <div className="p-1">
                  {filteredProjects.map((project) => {
                    const isSelected = selectedProjects.includes(project._id);
                    return (
                      <button
                        key={project._id}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleToggle(project._id);
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-md text-sm text-left transition-all ${
                          isSelected
                            ? "bg-primary/10 hover:bg-primary/15 border border-primary/20"
                            : "hover:bg-accent"
                        }`}
                      >
                        <div
                          className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                            isSelected
                              ? "bg-primary border-primary"
                              : "border-input"
                          }`}
                        >
                          {isSelected && (
                            <Check className="h-3 w-3 text-primary-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate flex items-center gap-1.5">
                            <FolderOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            {project.name}
                          </div>
                          {project.location && (
                            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <MapPin className="h-3 w-3 shrink-0" />
                              {project.location}
                            </div>
                          )}
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
  );
}
