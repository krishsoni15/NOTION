"use client";

/**
 * useProjectLogic Hook
 * 
 * Encapsulates all state management and logic for the Project module:
 * - Convex queries/mutations
 * - Search, filter, sort, pagination
 * - PDF upload handler
 */

import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { useAuth } from "@/app/providers/auth-provider";
import { api } from "@/convex/_generated/api";
import { normalizeSearchQuery, matchesAnySearchQuery } from "@/lib/utils";
import type { ProjectSortOption } from "../types/project.types";

export function useProjectLogic() {
  const { isAuthenticated } = useAuth();

  // ── Convex queries ─────────────────────────────────────────────────────
  const projects = useQuery(
    api.projects.getAllProjects,
    isAuthenticated ? { includeInactive: true } : "skip"
  );

  // ── Convex mutations ──────────────────────────────────────────────────
  const createProject = useMutation(api.projects.createProject);
  const updateProject = useMutation(api.projects.updateProject);
  const deleteProject = useMutation(api.projects.deleteProject);

  // ── Local UI state ─────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<ProjectSortOption>("newest");

  // ── Pagination ────────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("projectPageSize");
      return saved ? Number(saved) : 10;
    }
    return 10;
  });

  // Persist page size
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("projectPageSize", pageSize.toString());
    }
  }, [pageSize]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, sortBy]);

  // ── Filtered + sorted projects ────────────────────────────────────────
  const filteredAndSortedProjects = useMemo(() => {
    if (!projects) return undefined;

    let filtered = [...projects];

    // Search filter
    const normalizedQuery = normalizeSearchQuery(searchQuery);
    if (normalizedQuery) {
      filtered = filtered.filter((p) =>
        matchesAnySearchQuery(
          [p.name, p.description, p.location],
          normalizedQuery
        )
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((p) => p.status === statusFilter);
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
  }, [projects, searchQuery, statusFilter, sortBy]);

  // ── Pagination helpers ────────────────────────────────────────────────
  const totalItems = filteredAndSortedProjects?.length || 0;
  const totalPages = Math.ceil(totalItems / pageSize);
  const paginatedProjects = filteredAndSortedProjects?.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // ── PDF upload ────────────────────────────────────────────────────────
  const uploadPdf = useCallback(async (file: File): Promise<{ pdfUrl: string; pdfKey: string; pdfFileName: string }> => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/upload/project-pdf", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Failed to upload PDF");
    }

    return response.json();
  }, []);

  return {
    // Data
    projects: paginatedProjects,
    allProjects: filteredAndSortedProjects,
    isLoading: projects === undefined,

    // Filters
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    sortBy,
    setSortBy,

    // Pagination
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalItems,
    totalPages,

    // Mutations
    createProject,
    updateProject,
    deleteProject,

    // Helpers
    uploadPdf,
  };
}
