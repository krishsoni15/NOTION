"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { MapPin, Building, FileText, Calendar, User } from "lucide-react";
import { format } from "date-fns";
import type { Id } from "@/convex/_generated/dataModel";

interface LocationInfoDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    locationId: Id<"sites"> | null;
}

export function LocationInfoDialog({
    open,
    onOpenChange,
    locationId,
}: LocationInfoDialogProps) {
    const location = useQuery(
        api.sites.getSiteById,
        locationId ? { siteId: locationId } : "skip"
    );

    // Get location creator info
    const creator = useQuery(
        api.users.getUserById,
        location?.createdBy ? { userId: location.createdBy } : "skip"
    );

    const handleOpenInMap = (address: string | undefined) => {
        if (!address) return;
        const encodedAddress = encodeURIComponent(address);
        const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
        window.open(mapUrl, '_blank');
    };

    if (!location) {
        return null;
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md p-0 overflow-hidden bg-card border-none shadow-2xl">
                {/* Header / Cover */}
                <div className="h-24 bg-gradient-to-r from-blue-600 to-indigo-600 relative">
                    <div className="absolute top-4 right-4">
                        <button onClick={() => onOpenChange(false)} className="p-1 rounded-full bg-black/10 hover:bg-black/20 text-white transition-colors">
                            {/* Close icon handled by Dialog primitive usually, but custom header hides it often? DialogContent handles it. */}
                        </button>
                    </div>
                    <div className="absolute -bottom-8 left-6 p-3 bg-background rounded-xl shadow-lg border">
                        <Building className="h-8 w-8 text-primary" />
                    </div>
                </div>

                <div className="pt-10 px-6 pb-6 space-y-6">
                    {/* Title Section */}
                    <div>
                        <DialogTitle className="text-2xl font-bold">{location.name}</DialogTitle>
                        <div className="flex items-center gap-2 mt-2">
                            <span className="font-mono bg-muted px-2 py-0.5 rounded text-xs font-bold text-muted-foreground">{location.code || "NO-CODE"}</span>
                            <Badge variant={location.isActive ? "default" : "secondary"} className={location.isActive ? "bg-emerald-600 hover:bg-emerald-700" : ""}>
                                {location.isActive ? "Active Site" : "Inactive"}
                            </Badge>
                        </div>
                    </div>

                    {/* Address Card */}
                    {location.address && (
                        <div
                            className="bg-muted/30 p-3 rounded-lg border border-border/50 flex gap-3 items-start group hover:border-primary/20 hover:bg-muted/50 transition-all cursor-pointer"
                            onClick={() => handleOpenInMap(location.address)}
                        >
                            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full shrink-0">
                                <MapPin className="h-4 w-4 text-red-600 dark:text-red-400" />
                            </div>
                            <div className="space-y-1 flex-1">
                                <p className="text-sm font-medium leading-relaxed text-foreground">{location.address}</p>
                                <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold group-hover:underline flex items-center gap-1">
                                    Open in Google Maps
                                    <span className="inline-block transition-transform group-hover:translate-x-0.5">→</span>
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Details Grid */}
                    <div className="grid grid-cols-2 gap-6 py-4 border-t border-b border-border/50">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Created By</Label>
                            <div className="font-medium text-sm flex items-center gap-2">
                                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                                    <User className="h-3.5 w-3.5 text-primary" />
                                </div>
                                {creator?.fullName || "—"}
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Created On</Label>
                            <div className="font-medium text-sm flex items-center gap-2">
                                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                                    <Calendar className="h-3.5 w-3.5 text-primary" />
                                </div>
                                {format(new Date(location.createdAt), "dd MMM yyyy")}
                            </div>
                        </div>
                    </div>

                    {/* Description */}
                    {location.description && (
                        <div className="space-y-2">
                            <Label className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Description</Label>
                            <p className="text-sm text-foreground/80 leading-relaxed bg-muted/20 p-3 rounded-md border border-border/50">
                                {location.description}
                            </p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
