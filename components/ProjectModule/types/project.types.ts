/**
 * Project Module Type Definitions
 */

import type { Id, Doc } from "@/convex/_generated/dataModel";

/** Full project document from Convex */
export type Project = Doc<"projects">;

/** Form data for creating/editing a project */
export interface ProjectFormData {
  name: string;
  description: string;
  location: string;
  status: "active" | "inactive";
  timeline?: string;
  estimatedTimeline: Date | null;
  // PDF fields
  pdfUrl?: string;
  pdfKey?: string;
  pdfFileName?: string;
  // Local file for upload (not stored in DB)
  pdfFile?: File | null;
}

/** Sort options for the project list */
export type ProjectSortOption = "newest" | "oldest" | "name_asc" | "name_desc";

export type ProjectCategory = Doc<"projectCategories">;
export type ProjectItem = Doc<"projectItems"> & { categoryName: string };

export interface ProjectItemFormData {
  name: string;
  description: string;
  categoryId: Id<"projectCategories"> | "";
  make: string;
  quantity: number | "";
  rate: number | "";
}
