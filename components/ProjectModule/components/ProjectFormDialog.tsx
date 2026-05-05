"use client";

/**
 * Project Form Dialog
 * 
 * Dialog for creating and editing projects.
 * Fields: Project Name, Description, Location (free text), Status (Active/Inactive pills),
 *         Estimated Timeline (DatePicker), PDF Upload.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { toast } from "sonner";
import { Upload, X, FileText, Loader2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Project, ProjectFormData } from "../types/project.types";

interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectData?: Project | null; // If provided, we're editing
}

const INITIAL_FORM: ProjectFormData = {
  name: "",
  description: "",
  location: "",
  status: "active",
  estimatedTimeline: null,
  pdfUrl: undefined,
  pdfKey: undefined,
  pdfFileName: undefined,
  pdfFile: null,
};

export function ProjectFormDialog({
  open,
  onOpenChange,
  projectData,
}: ProjectFormDialogProps) {
  const createProject = useMutation(api.projects.createProject);
  const updateProject = useMutation(api.projects.updateProject);
  const sites = useQuery(api.sites.getAllSites, {});

  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState<ProjectFormData>(INITIAL_FORM);
  const [dragActive, setDragActive] = useState(false);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [selectedLocationSuggestionIndex, setSelectedLocationSuggestionIndex] = useState(0);

  const isEditing = !!projectData;

  const filteredSites = useMemo(() => {
    if (!sites) return [];
    if (!formData.location.trim()) return sites.slice(0, 5);
    const query = formData.location.toLowerCase();
    return sites
      .filter((site) => site.name.toLowerCase().includes(query))
      .slice(0, 5);
  }, [sites, formData.location]);

  // ── Load initial data when editing ────────────────────────────────────
  useEffect(() => {
    if (projectData) {
      setFormData({
        name: projectData.name,
        description: projectData.description || "",
        location: projectData.location || "",
        status: projectData.status || "active",
        estimatedTimeline: projectData.estimatedTimeline
          ? new Date(projectData.estimatedTimeline)
          : null,
        pdfUrl: projectData.pdfUrl,
        pdfKey: projectData.pdfKey,
        pdfFileName: projectData.pdfFileName,
        pdfFile: null,
      });
    } else {
      setFormData(INITIAL_FORM);
    }
    setError("");
  }, [projectData, open]);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setFormData(INITIAL_FORM);
      setError("");
    }
    onOpenChange(newOpen);
  };

  // ── PDF upload handler ────────────────────────────────────────────────
  const handlePdfUpload = useCallback(async (file: File) => {
    if (file.type !== "application/pdf") {
      toast.error("Only PDF files are allowed");
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      toast.error("PDF file must be smaller than 25MB");
      return;
    }

    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);

      const response = await fetch("/api/upload/project-pdf", {
        method: "POST",
        body: fd,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to upload PDF");
      }

      const { pdfUrl, pdfKey, pdfFileName } = await response.json();
      setFormData((prev) => ({
        ...prev,
        pdfUrl,
        pdfKey,
        pdfFileName,
        pdfFile: file,
      }));
      toast.success("PDF uploaded successfully");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to upload PDF";
      toast.error(msg);
    } finally {
      setIsUploading(false);
    }
  }, []);

  // ── Drag & Drop handlers ──────────────────────────────────────────────
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handlePdfUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handlePdfUpload(e.target.files[0]);
    }
  };

  const removePdf = () => {
    setFormData((prev) => ({
      ...prev,
      pdfUrl: undefined,
      pdfKey: undefined,
      pdfFileName: undefined,
      pdfFile: null,
    }));
  };

  // ── Form submission ───────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.name.trim()) {
      setError("Project name is required");
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        location: formData.location.trim() || undefined,
        status: formData.status,
        estimatedTimeline: formData.estimatedTimeline
          ? formData.estimatedTimeline.getTime()
          : undefined,
        pdfUrl: formData.pdfUrl,
        pdfKey: formData.pdfKey,
        pdfFileName: formData.pdfFileName,
      };

      if (isEditing && projectData) {
        await updateProject({
          projectId: projectData._id,
          ...payload,
        });
        toast.success("Project updated successfully");
      } else {
        await createProject(payload);
        toast.success("Project created successfully");
      }

      handleOpenChange(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to save project";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Project" : "Create New Project"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the project details below."
              : "Fill in the details to create a new project."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Project Name */}
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-sm">
              Project Name *
            </Label>
            <Input
              id="name"
              placeholder="Enter project name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={isLoading}
              className="h-9"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-sm">
              Description <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Textarea
              id="description"
              placeholder="Enter project description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              disabled={isLoading}
              className="min-h-[80px] resize-none"
            />
          </div>

          {/* Location (free text) */}
          <div className="space-y-1.5 relative">
            <Label htmlFor="location" className="text-sm">
              Location <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <div className="relative">
              <Input
                id="location"
                placeholder="Search or enter project location"
                value={formData.location}
                onChange={(e) => {
                  setFormData({ ...formData, location: e.target.value });
                  setShowLocationSuggestions(true);
                  setSelectedLocationSuggestionIndex(0);
                }}
                onFocus={() => { setShowLocationSuggestions(true); setSelectedLocationSuggestionIndex(0); }}
                onClick={() => setShowLocationSuggestions(true)}
                onBlur={() => setTimeout(() => setShowLocationSuggestions(false), 200)}
                onKeyDown={(e) => {
                  if (!showLocationSuggestions) return;
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSelectedLocationSuggestionIndex(prev => prev < filteredSites.length - 1 ? prev + 1 : prev);
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSelectedLocationSuggestionIndex(prev => prev > 0 ? prev - 1 : 0);
                  } else if (e.key === 'Enter' && filteredSites.length > 0) {
                    e.preventDefault();
                    if (selectedLocationSuggestionIndex < filteredSites.length) {
                      setFormData({ ...formData, location: filteredSites[selectedLocationSuggestionIndex].name });
                      setShowLocationSuggestions(false);
                    }
                  } else if (e.key === 'Escape') {
                    setShowLocationSuggestions(false);
                  }
                }}
                disabled={isLoading}
                className="h-9 pr-9"
              />
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              {showLocationSuggestions && (filteredSites.length > 0 || formData.location) && (
                <div className="absolute z-[100] w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto flex flex-col">
                  {filteredSites.length > 0 ? (
                    filteredSites.map((site, siteIdx) => (
                      <div
                        key={site._id}
                        className={cn(
                          "w-full px-3 py-2 flex items-center justify-between hover:bg-accent transition-colors cursor-pointer",
                          siteIdx === selectedLocationSuggestionIndex && "bg-accent"
                        )}
                        onClick={() => {
                          setFormData({ ...formData, location: site.name });
                          setShowLocationSuggestions(false);
                        }}
                      >
                        <div className="flex-1 overflow-hidden">
                          <div className="font-medium truncate text-sm">{site.name}</div>
                          {(site as any).city && <div className="text-xs text-muted-foreground truncate">{(site as any).city}</div>}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-center text-sm text-muted-foreground">
                      Press enter to use "{formData.location}"
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Status (pill selector) */}
          <div className="space-y-1.5">
            <Label className="text-sm">Status *</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, status: "active" })}
                disabled={isLoading}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-semibold transition-all border",
                  formData.status === "active"
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-muted/30 text-muted-foreground border-border hover:bg-muted/50"
                )}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, status: "inactive" })}
                disabled={isLoading}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-semibold transition-all border",
                  formData.status === "inactive"
                    ? "bg-secondary text-secondary-foreground border-secondary shadow-sm"
                    : "bg-muted/30 text-muted-foreground border-border hover:bg-muted/50"
                )}
              >
                Inactive
              </button>
            </div>
          </div>

          {/* Estimated Timeline */}
          <div className="space-y-1.5">
            <Label className="text-sm">
              Estimated Timeline / Deadline <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <DatePicker
              value={formData.estimatedTimeline}
              onChange={(date) => setFormData({ ...formData, estimatedTimeline: date })}
              placeholder="DD/MM/YYYY"
              disabled={isLoading}
            />
          </div>

          {/* PDF Upload */}
          <div className="space-y-1.5">
            <Label className="text-sm">
              Material Requirement PDF <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>

            {formData.pdfFileName ? (
              /* Show uploaded file */
              <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20">
                <div className="h-10 w-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{formData.pdfFileName}</p>
                  <p className="text-xs text-muted-foreground">PDF uploaded successfully</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={removePdf}
                  disabled={isLoading}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              /* Drag & drop upload zone */
              /* Drag & drop upload zone */
              <label
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-2 p-8 rounded-xl border-2 border-dashed transition-all cursor-pointer group overflow-hidden",
                  dragActive
                    ? "border-primary bg-primary/5 scale-[0.98]"
                    : "border-border/60 bg-muted/10 hover:border-primary/50 hover:bg-muted/30 hover:shadow-sm",
                  isUploading && "pointer-events-none opacity-60"
                )}
              >
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileInput}
                  className="hidden"
                  disabled={isLoading || isUploading}
                />
                
                {/* Decorative background blur on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                {isUploading ? (
                  <>
                    <Loader2 className="h-10 w-10 text-primary animate-spin mb-2" />
                    <p className="text-sm font-semibold text-foreground">Uploading PDF...</p>
                    <p className="text-xs text-muted-foreground mt-1">Please wait</p>
                  </>
                ) : (
                  <>
                    <div className="p-3 bg-background rounded-full shadow-sm border border-border/50 mb-2 group-hover:scale-110 transition-transform duration-300">
                      <Upload className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div className="text-center relative z-10">
                      <p className="text-sm font-semibold text-foreground">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground mt-1.5">
                        PDF up to 25MB
                      </p>
                    </div>
                  </>
                )}
              </label>
            )}
          </div>

          {error && (
            <div className="text-sm text-destructive">{error}</div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || isUploading}>
              {isLoading ? "Saving..." : isEditing ? "Update Project" : "Create Project"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
