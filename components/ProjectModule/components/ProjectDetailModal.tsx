"use client";

/**
 * Project Detail Modal
 * 
 * Displays full project details and an embedded PDF viewer.
 * Mirrors the LocationInfoDialog component for design consistency.
 */

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  FolderKanban,
  MapPin,
  Calendar,
  User,
  FileText,
  ExternalLink,
  Download,
  X,
} from "lucide-react";
import { format } from "date-fns";
import type { Id } from "@/convex/_generated/dataModel";
import { ProjectItemsManager } from "./ProjectItemsManager";

interface ProjectDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: Id<"projects"> | null;
}

export function ProjectDetailModal({
  open,
  onOpenChange,
  projectId,
}: ProjectDetailModalProps) {
  const project = useQuery(
    api.projects.getProjectById,
    projectId ? { projectId } : "skip"
  );

  // Get creator info
  const creator = useQuery(
    api.users.getUserById,
    project?.createdBy ? { userId: project.createdBy } : "skip"
  );

  if (!project) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] md:max-w-7xl w-full h-[95vh] p-0 overflow-hidden bg-card border-border shadow-2xl flex flex-col">
        {/* Custom Header with Gradient */}
        <div className="shrink-0 h-16 bg-gradient-to-r from-violet-600 to-indigo-600 relative flex items-center px-6">
          <div className="flex items-center gap-3 text-white">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <FolderKanban className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight">{project.name}</h2>
              <p className="text-xs text-white/80 font-medium">Project Workspace</p>
            </div>
          </div>
          {/* Default Dialog Close relies on a default X, we'll hide the standard one via css or just let it overlay, 
              but Shadcn Dialog adds a close button automatically. We let it be for now or it handles itself. */}
        </div>

        {/* Split Pane Content */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-[1fr_450px] divide-y lg:divide-y-0 lg:divide-x divide-border">
          
          {/* LEFT PANE: Project Details & PDF Viewer */}
          <div className="overflow-y-auto p-6 space-y-6 bg-background">
            {/* Title & Badges */}
            <div>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant={(project.status ?? "active") === "active" ? "default" : "secondary"}
                  className={(project.status ?? "active") === "active" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                >
                  {project.status ?? "active"}
                </Badge>
                {project.pdfFileName && (
                  <Badge variant="outline" className="text-xs">
                    <FileText className="h-3 w-3 mr-1" />
                    PDF Attached
                  </Badge>
                )}
              </div>
            </div>

            {/* Location Card */}
            {project.location && (
              <div className="bg-muted/30 p-3 rounded-lg border border-border/50 flex gap-3 items-start">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full shrink-0">
                  <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="space-y-1 flex-1">
                  <p className="text-sm font-medium leading-relaxed text-foreground">{project.location}</p>
                </div>
              </div>
            )}

            {/* Details Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 py-4 border-t border-b border-border/50 bg-muted/10 px-4 rounded-xl">
              <div className="space-y-1.5">
                <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Created By</Label>
                <div className="font-medium text-sm flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="truncate">{creator?.fullName || "—"}</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Created On</Label>
                <div className="font-medium text-sm flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                  </div>
                  {format(new Date(project.createdAt), "dd MMM yyyy")}
                </div>
              </div>
              {(project.estimatedTimeline || project.timeline) && (
                <div className="space-y-1.5">
                  <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Deadline</Label>
                  <div className="font-medium text-sm flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
                      <Calendar className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                    </div>
                    {project.estimatedTimeline 
                      ? format(new Date(project.estimatedTimeline), "dd MMM yyyy")
                      : project.timeline}
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            {project.description && (
              <div className="space-y-2">
                <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Description</Label>
                <p className="text-sm text-foreground/80 leading-relaxed bg-muted/20 p-4 rounded-xl border border-border/50">
                  {project.description}
                </p>
              </div>
            )}

            {/* PDF Section */}
            {project.pdfUrl ? (
              <div className="space-y-3 flex-1 flex flex-col h-full min-h-[400px]">
                <div className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-muted/20 shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{project.pdfFileName || "Material Requirement.pdf"}</p>
                      <p className="text-xs text-muted-foreground">PDF Document attached to project</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="outline" size="sm" onClick={() => window.open(project.pdfUrl!, "_blank")} className="gap-1.5 h-8 text-xs">
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open
                    </Button>
                    <Button variant="outline" size="sm" asChild className="gap-1.5 h-8 text-xs">
                      <a href={project.pdfUrl} download={project.pdfFileName || "document.pdf"}>
                        <Download className="h-3.5 w-3.5" />
                        Download
                      </a>
                    </Button>
                  </div>
                </div>

                {/* Embedded PDF Viewer */}
                <div className="rounded-xl border border-border shadow-inner bg-muted/30 flex-1 overflow-hidden min-h-[400px]">
                  <iframe
                    src={`${project.pdfUrl}#toolbar=0`}
                    className="w-full h-full"
                    title={`PDF: ${project.pdfFileName || "Document"}`}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-border rounded-xl bg-muted/10 text-muted-foreground">
                <FileText className="h-12 w-12 mb-3 opacity-20" />
                <p className="text-sm font-medium">No PDF Attached</p>
                <p className="text-xs opacity-70">This project does not have a material requirement document.</p>
              </div>
            )}
          </div>

          {/* RIGHT PANE: Add Items Workstation */}
          <div className="bg-muted/5 h-full overflow-hidden flex flex-col p-4 lg:p-6">
            <ProjectItemsManager projectId={project._id} />
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
