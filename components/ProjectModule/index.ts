/**
 * ProjectModule - Clean barrel exports
 */

// Components
export { ProjectManagement } from "./components/ProjectManagement";
export { ProjectTable } from "./components/ProjectTable";
export { ProjectFormDialog } from "./components/ProjectFormDialog";
export { ProjectDetailModal } from "./components/ProjectDetailModal";

// Hooks
export { useProjectLogic } from "./hooks/useProjectLogic";

// Types
export type { Project, ProjectFormData, ProjectSortOption } from "./types/project.types";
