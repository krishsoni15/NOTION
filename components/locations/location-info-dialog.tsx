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
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Building className="h-5 w-5" />
                        Location Information
                    </DialogTitle>
                    <DialogDescription>
                        Details about {location.name}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Basic Info */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-semibold">Location Name</Label>
                            <p className="font-medium text-base">{location.name}</p>
                        </div>

                        <Separator />

                        {location.code && (
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-semibold">Location Code</Label>
                                <p className="font-mono text-sm font-medium">{location.code}</p>
                            </div>
                        )}

                        <div className="flex items-center justify-between">
                            <Label className="text-sm font-semibold flex items-center gap-1.5">
                                <Building className="h-4 w-4" />
                                Status
                            </Label>
                            <Badge variant={location.isActive ? "default" : "destructive"}>
                                {location.isActive ? "Active" : "Inactive"}
                            </Badge>
                        </div>
                    </div>

                    {/* Address */}
                    {location.address && (
                        <>
                            <Separator />
                            <div className="space-y-3">
                                <h3 className="font-semibold text-sm">Location</h3>
                                <div className="flex items-start justify-between gap-2">
                                    <Label className="text-sm font-semibold flex items-center gap-1.5 flex-shrink-0">
                                        <MapPin className="h-4 w-4" />
                                        Address
                                    </Label>
                                    <div className="flex items-center gap-1 flex-1 min-w-0">
                                        <p className="text-sm text-right break-words flex-1">{location.address}</p>
                                        <button
                                            onClick={() => handleOpenInMap(location.address)}
                                            className="text-muted-foreground hover:text-primary transition-colors p-2 rounded-full hover:bg-muted/50 shrink-0 border border-muted-foreground/20 hover:border-primary/40"
                                            title="Open in Maps"
                                        >
                                            <MapPin className="h-3 w-3" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Description */}
                    {location.description && (
                        <>
                            <Separator />
                            <div className="space-y-3">
                                <h3 className="font-semibold text-sm">Description</h3>
                                <div className="flex items-start justify-between gap-2">
                                    <Label className="text-sm font-semibold flex items-center gap-1.5 flex-shrink-0">
                                        <FileText className="h-4 w-4" />
                                        Details
                                    </Label>
                                    <p className="text-sm text-right break-words">{location.description}</p>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Created By */}
                    <Separator />
                    <div className="flex items-center justify-between">
                        <Label className="text-sm font-semibold flex items-center gap-1.5">
                            <User className="h-4 w-4" />
                            Created By
                        </Label>
                        <p className="text-sm">{creator?.fullName || "Unknown"}</p>
                    </div>

                    {/* Dates */}
                    <div className="space-y-2 pt-2 border-t">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5" />
                                Created
                            </span>
                            <span>{format(new Date(location.createdAt), "dd MMM yyyy")}</span>
                        </div>
                        {location.updatedAt !== location.createdAt && (
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>Last Updated</span>
                                <span>{format(new Date(location.updatedAt), "dd MMM yyyy")}</span>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
