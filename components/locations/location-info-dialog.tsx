"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, User, Hash } from "lucide-react";
import { format } from "date-fns";
import type { Id } from "@/convex/_generated/dataModel";

interface LocationInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locationId: Id<"sites"> | null;
}

export function LocationInfoDialog({ open, onOpenChange, locationId }: LocationInfoDialogProps) {
  const location = useQuery(api.sites.getSiteById, locationId ? { siteId: locationId } : "skip");
  const creator = useQuery(api.users.getUserById, location?.createdBy ? { userId: location.createdBy } : "skip");

  if (!location) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        {/* Gradient header */}
        <div className="h-20 bg-gradient-to-br from-primary/80 to-primary relative">
          <div className="absolute -bottom-6 left-5 h-12 w-12 rounded-xl bg-background shadow-lg border flex items-center justify-center">
            <MapPin className="h-6 w-6 text-primary" />
          </div>
        </div>

        <div className="pt-9 px-5 pb-5 space-y-4">
          {/* Name + status */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <DialogTitle className="text-xl font-bold leading-tight">{location.name}</DialogTitle>
              {location.code && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-mono mt-1">
                  <Hash className="h-3 w-3" />{location.code}
                </span>
              )}
            </div>
            <Badge variant={location.isActive ? "default" : "secondary"} className="shrink-0 mt-0.5">
              {location.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>

          {/* Address */}
          {location.address && (
            <button
              onClick={() => {
                const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location.address!)}`;
                window.open(url, "_blank");
              }}
              className="w-full text-left flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border/50 hover:border-primary/30 hover:bg-muted/60 transition-all group"
            >
              <div className="p-1.5 bg-red-100 dark:bg-red-900/30 rounded-full shrink-0 mt-0.5">
                <MapPin className="h-3.5 w-3.5 text-red-500" />
              </div>
              <div>
                <p className="text-sm font-medium leading-relaxed">{location.address}</p>
                <p className="text-xs text-primary mt-0.5 group-hover:underline">Open in Google Maps →</p>
              </div>
            </button>
          )}

          {/* Description */}
          {location.description && (
            <p className="text-sm text-muted-foreground leading-relaxed bg-muted/20 px-3 py-2.5 rounded-lg border border-border/40">
              {location.description}
            </p>
          )}

          {/* Meta */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border/40">
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Created By</p>
              <div className="flex items-center gap-1.5 text-sm font-medium">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                {creator?.fullName || "—"}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Created On</p>
              <div className="flex items-center gap-1.5 text-sm font-medium">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                {format(new Date(location.createdAt), "dd MMM yyyy")}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
