"use client";

/**
 * Project Table Component
 * 
 * Displays all projects in a table or card view with actions.
 * Mirrors the LocationTable component for design consistency.
 */

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  MoreHorizontal,
  Edit,
  Trash2,
  FolderKanban,
  MapPin,
  Calendar,
  FileText,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ProjectFormDialog } from "./ProjectFormDialog";
import { ProjectDetailModal } from "./ProjectDetailModal";
import type { Project } from "../types/project.types";

type ViewMode = "table" | "card";

interface ProjectTableProps {
  projects: Project[] | undefined;
  viewMode?: ViewMode;
}

export function ProjectTable({ projects, viewMode = "table" }: ProjectTableProps) {
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<Project["_id"] | null>(null);
  const [loadingProjectId, setLoadingProjectId] = useState<string | null>(null);
  const deleteProjectMutation = useMutation(api.projects.deleteProject);

  const handleDelete = async () => {
    if (!deletingProject) return;

    setLoadingProjectId(deletingProject._id);
    try {
      await deleteProjectMutation({ projectId: deletingProject._id });
      toast.success("Project deleted successfully");
      setDeletingProject(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete project";
      toast.error(errorMessage);
    } finally {
      setLoadingProjectId(null);
    }
  };

  if (!projects) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No projects found. Create your first project to get started.
      </div>
    );
  }

  // ── Card View Component ─────────────────────────────────────────────
  const ProjectCard = ({ project }: { project: Project }) => {
    return (
      <Card className="h-full flex flex-col hover:shadow-md transition-all duration-200 border border-border bg-card group rounded-xl overflow-hidden hover:border-primary/20">
        <CardHeader className="p-4 pb-3 border-b border-border/40 bg-gradient-to-br from-primary/5 to-transparent">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="h-9 w-9 rounded-lg bg-background/60 backdrop-blur-sm flex items-center justify-center shrink-0 border border-primary/10 overflow-hidden shadow-sm">
                  <FolderKanban className="h-4.5 w-4.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => setSelectedProjectId(project._id)}
                    className="text-base font-bold truncate pr-2 leading-tight hover:underline decoration-primary/30 underline-offset-4 transition-all text-left w-full"
                  >
                    {project.name}
                  </button>
                </div>
              </div>
              <div className="pl-11 flex flex-wrap items-center gap-2 mt-1">
                <Badge
                  variant={(project.status ?? "active") === "active" ? "default" : "secondary"}
                  className="text-[10px] h-5 px-2 uppercase tracking-wider font-bold"
                >
                  {project.status ?? "active"}
                </Badge>
                {project.pdfFileName && (
                  <Badge variant="outline" className="text-[10px] h-5 px-1.5 text-muted-foreground border-border/50 bg-background/30 backdrop-blur-sm">
                    <FileText className="h-3 w-3 mr-1" />
                    PDF
                  </Badge>
                )}
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-muted-foreground hover:text-foreground">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setSelectedProjectId(project._id)}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setEditingProject(project)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Project
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setDeletingProject(project)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-4 space-y-4 flex-1 flex flex-col text-sm">
          {project.description && (
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider opacity-70 text-muted-foreground">Description</span>
              <p className="text-balance text-muted-foreground leading-relaxed line-clamp-2 text-xs italic">{project.description}</p>
            </div>
          )}

          {project.location && (
            <div className="space-y-1 pt-1 border-t border-border/40">
              <div className="flex items-center gap-2 text-muted-foreground pt-2">
                <MapPin className="h-3 w-3" />
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-70">Location</span>
              </div>
              <p className="pl-5 text-balance text-muted-foreground leading-relaxed line-clamp-2 text-xs">{project.location}</p>
            </div>
          )}

          {(project.estimatedTimeline || project.timeline) && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span className="text-[10px] uppercase font-bold tracking-wider opacity-70">Deadline</span>
              </div>
              <p className="pl-5 text-xs font-medium">
                {project.estimatedTimeline 
                  ? format(new Date(project.estimatedTimeline), "dd MMM yyyy")
                  : project.timeline}
              </p>
            </div>
          )}

          <div className="mt-auto pt-4 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground/60">
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5" />
              <span>Created {new Date(project.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      {/* Table View */}
      {viewMode === "table" && (
        <div className="border rounded-xl overflow-hidden shadow-sm bg-background">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-[200px] font-semibold text-xs uppercase tracking-wider text-muted-foreground/80">Project Name</TableHead>
                  <TableHead className="min-w-[150px] font-semibold text-xs uppercase tracking-wider text-muted-foreground/80">Location</TableHead>
                  <TableHead className="w-[100px] font-semibold text-xs uppercase tracking-wider text-muted-foreground/80">Status</TableHead>
                  <TableHead className="w-[120px] font-semibold text-xs uppercase tracking-wider text-muted-foreground/80">Deadline</TableHead>
                  <TableHead className="w-[80px] font-semibold text-xs uppercase tracking-wider text-muted-foreground/80">PDF</TableHead>
                  <TableHead className="w-[100px] font-semibold text-xs uppercase tracking-wider text-muted-foreground/80">Created</TableHead>
                  <TableHead className="w-[60px] text-right font-semibold text-xs uppercase tracking-wider text-muted-foreground/80">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project, index) => (
                  <TableRow
                    key={project._id}
                    className={`
                      group transition-all duration-300 border-b last:border-0 hover:bg-primary/5 hover:shadow-sm hover:z-10 hover:relative
                      ${index % 2 === 0 ? "bg-background" : "bg-muted/20"}
                      animate-in fade-in slide-in-from-bottom-3
                    `}
                    style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
                  >
                    <TableCell className="align-top py-4 pl-4 font-medium">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 border border-primary/10 text-primary">
                          <FolderKanban className="h-4 w-4" />
                        </div>
                        <button
                          onClick={() => setSelectedProjectId(project._id)}
                          className="text-sm font-bold text-foreground hover:text-primary transition-colors cursor-pointer text-left hover:underline decoration-primary/30 underline-offset-4"
                        >
                          {project.name}
                        </button>
                      </div>
                    </TableCell>
                    <TableCell className="align-top py-4 max-w-xs text-sm text-muted-foreground leading-relaxed">
                      {project.location ? (
                        <span className="line-clamp-2">{project.location}</span>
                      ) : (
                        <span className="text-muted-foreground/30">—</span>
                      )}
                    </TableCell>
                    <TableCell className="align-top py-4">
                      <Badge variant={(project.status ?? "active") === "active" ? "default" : "secondary"} className="h-5 text-[10px] px-2 uppercase tracking-wider font-bold">
                        {project.status ?? "active"}
                      </Badge>
                    </TableCell>
                    <TableCell className="align-top py-4 text-sm text-muted-foreground">
                      {project.estimatedTimeline
                        ? format(new Date(project.estimatedTimeline), "dd MMM yyyy")
                        : project.timeline || <span className="text-muted-foreground/30">—</span>
                      }
                    </TableCell>
                    <TableCell className="align-top py-4">
                      {project.pdfFileName ? (
                        <Badge variant="outline" className="text-[10px] h-5 px-2 bg-background/50">
                          <FileText className="h-3 w-3 mr-1" />
                          PDF
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground/30">—</span>
                      )}
                    </TableCell>
                    <TableCell className="align-top py-4 text-xs text-muted-foreground/70">
                      {new Date(project.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="align-top py-4 text-right pr-4">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setSelectedProjectId(project._id)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEditingProject(project)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Project
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeletingProject(project)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Project
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Card View */}
      {viewMode === "card" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6 pt-2 pb-10">
          {projects.map((project, index) => (
            <div
              key={project._id}
              className="animate-in fade-in slide-in-from-bottom-5 h-full"
              style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
            >
              <ProjectCard project={project} />
            </div>
          ))}
        </div>
      )}

      {/* Edit Project Dialog */}
      <ProjectFormDialog
        open={editingProject !== null}
        onOpenChange={(open) => !open && setEditingProject(null)}
        projectData={editingProject}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deletingProject !== null} onOpenChange={(open) => !open && setDeletingProject(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              This will <strong>permanently delete</strong> <strong>{deletingProject?.name}</strong>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={loadingProjectId === deletingProject?._id}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loadingProjectId === deletingProject?._id ? "Deleting..." : "Delete Project"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Project Detail Modal */}
      <ProjectDetailModal
        open={!!selectedProjectId}
        onOpenChange={(open) => {
          if (!open) setSelectedProjectId(null);
        }}
        projectId={selectedProjectId}
      />
    </>
  );
}
