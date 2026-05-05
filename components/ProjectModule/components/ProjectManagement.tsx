"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PaginationControls } from "@/components/ui/pagination-controls";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Search,
  FolderKanban,
  MapPin,
  Calendar,
  FileText,
  ArrowLeft,
  Loader2,
  FolderOpen,
  LayoutGrid,
  List,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  Package,
  ExternalLink,
  Download,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { useProjectLogic } from "../hooks/useProjectLogic";
import { ProjectFormDialog } from "./ProjectFormDialog";
import { ProjectDetailPanel } from "./ProjectDetailPanel";
import type { Project, ProjectSortOption } from "../types/project.types";
import type { Id } from "@/convex/_generated/dataModel";

type ViewMode = "card" | "table";

/* ─────────────────────────────────────────────────────────────────────────
   PDF Preview Dialog
───────────────────────────────────────────────────────────────────────── */
interface PdfPreview {
  url: string;
  fileName: string;
}

function PdfPreviewDialog({
  pdf,
  onClose,
}: {
  pdf: PdfPreview | null;
  onClose: () => void;
}) {
  if (!pdf) return null;
  return (
    <Dialog open={!!pdf} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl w-[95vw] h-[90vh] p-0 flex flex-col gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="shrink-0 flex-row items-center justify-between px-4 py-3 border-b border-border bg-card gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
              <FileText className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
            <DialogTitle className="text-sm font-semibold truncate">
              {pdf.fileName}
            </DialogTitle>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() => window.open(pdf.url, "_blank", "noopener,noreferrer")}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open in new tab
            </Button>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" asChild>
              <a href={pdf.url} download={pdf.fileName}>
                <Download className="h-3.5 w-3.5" />
                Download
              </a>
            </Button>
          </div>
        </DialogHeader>

        {/* PDF iframe */}
        <div className="flex-1 bg-muted/20 min-h-0">
          <iframe
            src={`${pdf.url}#toolbar=0&navpanes=0`}
            className="w-full h-full"
            title={pdf.fileName}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Item count badge — fetches live count per project
───────────────────────────────────────────────────────────────────────── */
function ItemCountBadge({ projectId }: { projectId: Id<"projects"> }) {
  const items = useQuery(api.projectItems.getItemsByProjectId, { projectId });
  const count = items?.length ?? 0;
  return (
    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
      <Package className="h-3 w-3" />
      {items === undefined ? "…" : count} item{count !== 1 ? "s" : ""}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Main Component
───────────────────────────────────────────────────────────────────────── */
export function ProjectManagement() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selected, setSelected] = useState<Project | null>(null);

  // Default: table on desktop, card on mobile. Persisted to localStorage.
  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("projectViewMode") as ViewMode | null;
      if (saved === "card" || saved === "table") return saved;
      // Default by screen width: ≥768px → table, <768px → card
      return window.innerWidth >= 768 ? "table" : "card";
    }
    return "table";
  });

  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("projectViewMode", mode);
    }
  };
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [deleteProject, setDeleteProject] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [pdfPreview, setPdfPreview] = useState<PdfPreview | null>(null);

  const openPdf = (p: Project) => {
    if (p.pdfUrl) setPdfPreview({ url: p.pdfUrl, fileName: p.pdfFileName || "document.pdf" });
  };

  const deleteMutation = useMutation(api.projects.deleteProject);

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
  } = useProjectLogic();

  const handleDelete = async () => {
    if (!deleteProject) return;
    setIsDeleting(true);
    try {
      await deleteMutation({ projectId: deleteProject._id });
      toast.success("Project deleted");
      setDeleteProject(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setIsDeleting(false);
    }
  };

  /* ── Detail view ─────────────────────────────────────────────────── */
  if (selected) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelected(null)}
          className="h-8 px-2 -ml-1 text-muted-foreground hover:text-foreground gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Projects
        </Button>
        <ProjectDetailPanel project={selected} onBack={() => setSelected(null)} />
      </div>
    );
  }

  /* ── List view ───────────────────────────────────────────────────── */
  return (
    <div className="space-y-5">

      {/* ── Page Header ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isLoading
              ? "Loading…"
              : `${totalItems} project${totalItems !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="gap-2 font-semibold shadow-sm"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New Project</span>
          <span className="sm:hidden">New</span>
        </Button>
      </div>

      {/* ── Toolbar ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search by name, location, description…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 bg-muted/30 border-muted-foreground/20"
          />
        </div>
        <div className="flex gap-2 shrink-0">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-[110px] bg-muted/30 border-muted-foreground/20 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(v) => setSortBy(v as ProjectSortOption)}>
            <SelectTrigger className="h-9 w-[120px] bg-muted/30 border-muted-foreground/20 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="name_asc">A → Z</SelectItem>
              <SelectItem value="name_desc">Z → A</SelectItem>
            </SelectContent>
          </Select>

          {/* View toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden shrink-0">
            <button
              onClick={() => setViewMode("card")}
              className={cn(
                "h-9 w-9 flex items-center justify-center transition-colors",
                viewMode === "card"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/30 text-muted-foreground hover:bg-muted/60"
              )}
              title="Card view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={cn(
                "h-9 w-9 flex items-center justify-center transition-colors border-l border-border",
                viewMode === "table"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/30 text-muted-foreground hover:bg-muted/60"
              )}
              title="Table view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Loading projects…
        </div>
      ) : !projects || projects.length === 0 ? (
        <EmptyState
          hasFilters={!!(searchQuery || statusFilter !== "all")}
          onCreateClick={() => setIsCreateOpen(true)}
        />
      ) : viewMode === "card" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {projects.map((p) => (
            <ProjectCard
              key={p._id}
              project={p}
              onView={() => setSelected(p)}
              onEdit={() => setEditProject(p)}
              onDelete={() => setDeleteProject(p)}
              onPdf={() => openPdf(p)}
            />
          ))}
        </div>
      ) : (
        <ProjectTable
          projects={projects}
          onView={(p) => setSelected(p)}
          onEdit={(p) => setEditProject(p)}
          onDelete={(p) => setDeleteProject(p)}
          onPdf={(p) => openPdf(p)}
        />
      )}

      {/* ── Pagination ──────────────────────────────────────────────── */}
      {!isLoading && totalItems > 0 && (
        <div className="rounded-xl border border-border bg-card px-4 py-1">
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            totalItems={totalItems}
            pageSizeOptions={[6, 12, 24, 48]}
            itemCount={projects?.length ?? 0}
          />
        </div>
      )}

      {/* ── Dialogs ─────────────────────────────────────────────────── */}
      <ProjectFormDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
      <ProjectFormDialog
        open={!!editProject}
        onOpenChange={(o) => !o && setEditProject(null)}
        projectData={editProject}
      />
      <PdfPreviewDialog pdf={pdfPreview} onClose={() => setPdfPreview(null)} />
      <AlertDialog
        open={!!deleteProject}
        onOpenChange={(o) => !o && setDeleteProject(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently delete <strong>{deleteProject?.name}</strong>? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Project Card
───────────────────────────────────────────────────────────────────────── */
function ProjectCard({
  project: p,
  onView,
  onEdit,
  onDelete,
  onPdf,
}: {
  project: Project;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPdf: () => void;
}) {
  const isActive = (p.status ?? "active") === "active";

  return (
    <div className="group flex flex-col rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-lg transition-all duration-200 overflow-hidden">
      {/* Status accent strip */}
      <div className={cn("h-1 w-full shrink-0", isActive ? "bg-emerald-500" : "bg-muted-foreground/40")} />

      <div className="flex flex-col flex-1 p-4 gap-3">
        {/* ── Top: icon + name + menu ── */}
        <div className="flex items-start gap-2.5">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
            <FolderKanban className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm leading-snug truncate">{p.name}</p>
            <Badge
              variant={isActive ? "default" : "secondary"}
              className={cn(
                "mt-1 text-[9px] h-4 px-1.5 uppercase tracking-wider font-bold",
                isActive && "bg-emerald-600 hover:bg-emerald-700"
              )}
            >
              {p.status ?? "active"}
            </Badge>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity -mr-1 -mt-1"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={onView}>
                <Eye className="h-4 w-4 mr-2" /> Open
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" /> Edit
              </DropdownMenuItem>
              {p.pdfUrl && (
                <DropdownMenuItem onClick={onPdf}>
                  <ExternalLink className="h-4 w-4 mr-2" /> View PDF
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* ── Location ── */}
        {p.location && (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
            <MapPin className="h-3 w-3 shrink-0 opacity-60" />
            {p.location}
          </p>
        )}

        {/* ── Description ── */}
        {p.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {p.description}
          </p>
        )}

        {/* ── Stats row ── */}
        <div className="flex items-center gap-3 flex-wrap mt-auto pt-2 border-t border-border/50">
          <ItemCountBadge projectId={p._id} />
          {p.pdfFileName && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <FileText className="h-3 w-3" />
              PDF
            </span>
          )}
          {p.estimatedTimeline && (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {format(new Date(p.estimatedTimeline), "dd MMM yy")}
            </span>
          )}
          <span className="ml-auto text-[11px] text-muted-foreground/50">
            {format(new Date(p.createdAt), "dd MMM yy")}
          </span>
        </div>
      </div>

      {/* ── Action buttons — same 4 actions as table row ── */}
      <div className="grid grid-cols-4 border-t border-border/60 divide-x divide-border/60">
        <button
          onClick={onView}
          className="flex items-center justify-center gap-1 py-2.5 text-xs font-semibold text-primary hover:bg-primary/5 transition-colors"
        >
          <Eye className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Open</span>
        </button>
        <button
          onClick={onEdit}
          className="flex items-center justify-center gap-1 py-2.5 text-xs font-medium text-muted-foreground hover:bg-muted/30 hover:text-foreground transition-colors"
        >
          <Edit className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Edit</span>
        </button>
        <button
          onClick={() => p.pdfUrl ? onPdf() : undefined}
          disabled={!p.pdfUrl}
          className={cn(
            "flex items-center justify-center gap-1 py-2.5 text-xs font-medium transition-colors",
            p.pdfUrl
              ? "text-muted-foreground hover:bg-muted/30 hover:text-foreground"
              : "text-muted-foreground/30 cursor-not-allowed"
          )}
          title={p.pdfUrl ? "View PDF" : "No PDF attached"}
        >
          <FileText className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">PDF</span>
        </button>
        <button
          onClick={onDelete}
          className="flex items-center justify-center gap-1 py-2.5 text-xs font-medium text-muted-foreground hover:bg-destructive/5 hover:text-destructive transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Delete</span>
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Project Table
───────────────────────────────────────────────────────────────────────── */
function ProjectTable({
  projects,
  onView,
  onEdit,
  onDelete,
  onPdf,
}: {
  projects: Project[];
  onView: (p: Project) => void;
  onEdit: (p: Project) => void;
  onDelete: (p: Project) => void;
  onPdf: (p: Project) => void;
}) {
  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground pl-4 w-[200px]">
                Project
              </TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">
                Location
              </TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground w-[80px]">
                Status
              </TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground w-[80px] text-center">
                Items
              </TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground w-[60px] text-center">
                PDF
              </TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground w-[110px]">
                Deadline
              </TableHead>
              <TableHead className="font-semibold text-xs uppercase tracking-wider text-muted-foreground w-[95px]">
                Created
              </TableHead>
              <TableHead className="w-[50px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map((p, i) => {
              const isActive = (p.status ?? "active") === "active";
              return (
                <TableRow
                  key={p._id}
                  className={cn(
                    "group cursor-pointer transition-colors",
                    i % 2 === 1 && "bg-muted/10"
                  )}
                  onClick={() => onView(p)}
                >
                  <TableCell className="py-3 pl-4">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <FolderKanban className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <span className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate max-w-[130px]">
                        {p.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-3 text-sm text-muted-foreground max-w-[160px]">
                    {p.location ? (
                      <span className="flex items-center gap-1.5 truncate">
                        <MapPin className="h-3 w-3 shrink-0 opacity-60" />
                        {p.location}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/30">—</span>
                    )}
                  </TableCell>
                  <TableCell className="py-3">
                    <Badge
                      variant={isActive ? "default" : "secondary"}
                      className={cn(
                        "text-[9px] h-4 px-1.5 uppercase tracking-wider font-bold",
                        isActive && "bg-emerald-600 hover:bg-emerald-700"
                      )}
                    >
                      {p.status ?? "active"}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3 text-center">
                    <ItemCountBadge projectId={p._id} />
                  </TableCell>
                  <TableCell className="py-3 text-center">
                    {p.pdfUrl ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onPdf(p);
                        }}
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        View
                      </button>
                    ) : (
                      <span className="text-muted-foreground/30 text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="py-3 text-sm text-muted-foreground">
                    {p.estimatedTimeline ? (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 opacity-60" />
                        {format(new Date(p.estimatedTimeline), "dd MMM yyyy")}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/30">—</span>
                    )}
                  </TableCell>
                  <TableCell className="py-3 text-xs text-muted-foreground">
                    {format(new Date(p.createdAt), "dd MMM yy")}
                  </TableCell>
                  <TableCell
                    className="py-3 pr-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={() => onView(p)}>
                          <Eye className="h-4 w-4 mr-2" /> Open
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit(p)}>
                          <Edit className="h-4 w-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        {p.pdfUrl && (
                          <DropdownMenuItem
                            onClick={() => onPdf(p)}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" /> View PDF
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onDelete(p)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Empty State
───────────────────────────────────────────────────────────────────────── */
function EmptyState({
  hasFilters,
  onCreateClick,
}: {
  hasFilters: boolean;
  onCreateClick: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground">
      <div className="h-16 w-16 rounded-2xl bg-muted/30 flex items-center justify-center mb-4">
        <FolderOpen className="h-8 w-8 opacity-40" />
      </div>
      <p className="font-semibold text-foreground">No projects found</p>
      <p className="text-sm mt-1 opacity-70">
        {hasFilters
          ? "Try adjusting your search or filters"
          : "Create your first project to get started"}
      </p>
      {!hasFilters && (
        <Button variant="outline" className="mt-5 gap-2" onClick={onCreateClick}>
          <Plus className="h-4 w-4" />
          Create Project
        </Button>
      )}
    </div>
  );
}
