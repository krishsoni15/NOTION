/**
 * ProjectModule - Clean barrel exports
 */

// Components
export { ProjectManagement } from "./components/ProjectManagement";
export { ProjectDetailPanel } from "./components/ProjectDetailPanel";
export { ProjectFormDialog } from "./components/ProjectFormDialog";
export { ProjectItemsManager } from "./components/ProjectItemsManager";

// Hooks
export { useProjectLogic } from "./hooks/useProjectLogic";

// Types
export type { Project, ProjectFormData, ProjectSortOption } from "./types/project.types";
