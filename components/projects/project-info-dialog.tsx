import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { MapPin, Layers, FileText, Calendar, ExternalLink, Info } from "lucide-react";
import { format } from "date-fns";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { LocationInfoDialog } from "@/components/locations/location-info-dialog";

interface ProjectInfoDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    projectId: Id<"projects"> | null;
}

export function ProjectInfoDialog({
    open,
    onOpenChange,
    projectId,
}: ProjectInfoDialogProps) {
    const [selectedSiteId, setSelectedSiteId] = useState<Id<"sites"> | null>(null);

    const project = useQuery(
        api.projects.getProjectById,
        projectId ? { projectId } : "skip"
    );

    // Try to find a matching site for the location string
    const matchingSites = useQuery(
        api.sites.searchSites,
        project?.location ? { query: project.location } : "skip"
    );

    // If there's an exact match or just one result, we can use it
    const siteId = matchingSites && matchingSites.length > 0 ? matchingSites[0]._id : null;

    if (!project) return null;

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-md p-0 overflow-hidden bg-card border-none shadow-2xl">
                    {/* Header Cover */}
                    <div className="h-24 bg-gradient-to-r from-violet-600 to-indigo-600 relative">
                        <div className="absolute -bottom-8 left-6 p-3 bg-background rounded-xl shadow-lg border">
                            <Layers className="h-8 w-8 text-primary" />
                        </div>
                    </div>

                    <div className="pt-10 px-6 pb-6 space-y-5">
                        {/* Title */}
                        <div>
                            <DialogHeader>
                                <DialogTitle className="text-2xl font-bold">{project.name}</DialogTitle>
                            </DialogHeader>
                            <div className="flex items-center gap-2 mt-2">
                                <Badge
                                    variant={project.status === "active" ? "default" : "secondary"}
                                    className={project.status === "active" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                                >
                                    {project.status === "active" ? "Active" : "Inactive"}
                                </Badge>
                            </div>
                        </div>

                        {/* Location */}
                        {project.location && (
                            <div 
                                className={cn(
                                    "bg-muted/30 p-3 rounded-lg border border-border/50 flex gap-3 items-start group transition-all",
                                    siteId ? "cursor-pointer hover:border-primary/30 hover:bg-muted/50" : ""
                                )}
                                onClick={() => siteId && setSelectedSiteId(siteId)}
                            >
                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-full shrink-0">
                                    <MapPin className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div className="space-y-0.5 flex-1">
                                    <div className="flex items-center justify-between">
                                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Location</p>
                                        {siteId && <Info className="h-3 w-3 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />}
                                    </div>
                                    <p className="text-sm font-medium text-foreground">{project.location}</p>
                                    {siteId && <p className="text-[10px] text-primary font-semibold mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">Click to view location details</p>}
                                </div>
                            </div>
                        )}

                        {/* Description */}
                        {project.description && (
                            <div className="space-y-1.5">
                                <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Description</Label>
                                <p className="text-sm text-foreground/80 leading-relaxed bg-muted/20 p-3 rounded-md border border-border/50">
                                    {project.description}
                                </p>
                            </div>
                        )}

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 gap-4 py-4 border-t border-b border-border/50">
                            {project.estimatedTimeline && (
                                <div className="space-y-1.5">
                                    <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Deadline</Label>
                                    <div className="font-medium text-sm flex items-center gap-2">
                                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                                            <Calendar className="h-3.5 w-3.5 text-primary" />
                                        </div>
                                        {format(new Date(project.estimatedTimeline), "dd MMM yyyy")}
                                    </div>
                                </div>
                            )}
                            <div className="space-y-1.5">
                                <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Created On</Label>
                                <div className="font-medium text-sm flex items-center gap-2">
                                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                                        <Calendar className="h-3.5 w-3.5 text-primary" />
                                    </div>
                                    {format(new Date(project.createdAt), "dd MMM yyyy")}
                                </div>
                            </div>
                        </div>

                        {/* PDF Link */}
                        {project.pdfUrl && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="w-full gap-2"
                                onClick={() => window.open(project.pdfUrl, "_blank")}
                            >
                                <FileText className="h-4 w-4" />
                                View Material Requirement PDF
                                <ExternalLink className="h-3.5 w-3.5 ml-auto text-muted-foreground" />
                            </Button>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <LocationInfoDialog 
                open={!!selectedSiteId}
                onOpenChange={(open) => !open && setSelectedSiteId(null)}
                locationId={selectedSiteId}
            />
        </>
    );
}
