"use client";

/**
 * Location Message Component
 * 
 * Displays a static map preview for a shared location.
 * Lazy loads MapPicker to avoid heavy initial bundle/SSR issues.
 */

import { useState } from "react";
import dynamic from "next/dynamic";
import { Loader2, MapPin, ExternalLink, Maximize2, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// Reuse MapPicker in readonly mode
const MapPicker = dynamic(() => import("./map-picker"), {
    loading: () => (
        <div className="h-full w-full bg-muted animate-pulse flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
    ),
    ssr: false
});

interface LocationMessageProps {
    latitude: number;
    longitude: number;
    address?: string;
    isOwnMessage: boolean;
    onClick: () => void;
}

export function LocationMessage({ latitude, longitude, address, isOwnMessage, onClick }: LocationMessageProps) {
    const [isInternalMapOpen, setIsInternalMapOpen] = useState(false);

    const handleGoogleMapsClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onClick();
    };

    return (
        <>
            <div
                className="w-[240px] flex flex-col cursor-pointer hover:opacity-95 transition-all group"
                onClick={() => setIsInternalMapOpen(true)}
            >
                {/* Map Preview */}
                <div className="relative aspect-video bg-muted overflow-hidden z-0">
                    <MapPicker
                        initialLocation={{ lat: latitude, lng: longitude }}
                        readonly={true}
                        className="h-full w-full pointer-events-none"
                    />

                    {/* Expand Overlay */}
                    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                        <Maximize2 className="h-8 w-8 text-white drop-shadow-md" />
                    </div>
                </div>

                {/* Footer Info */}
                <div className="p-2.5 bg-card/95 border-t border-border/10 backdrop-blur-sm">
                    <div className="flex items-start gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <MapPin className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium leading-none mb-1 text-foreground">
                                {isOwnMessage ? "You shared a location" : "Shared location"}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate mb-2">
                                {address || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`}
                            </p>

                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs w-full gap-2 border-primary/20 hover:bg-primary/5 hover:text-primary"
                                onClick={handleGoogleMapsClick}
                            >
                                <ExternalLink className="h-3 w-3" />
                                Open in Google Maps
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Internal Map Dialog */}
            <Dialog open={isInternalMapOpen} onOpenChange={setIsInternalMapOpen}>
                <DialogContent className="sm:max-w-[800px] p-0 gap-0 overflow-hidden">
                    <DialogHeader className="p-4 pb-2 bg-background/80 backdrop-blur-sm absolute top-0 left-0 right-0 z-10 border-b flex flex-row items-center justify-between">
                        <DialogTitle className="flex items-center gap-2 text-base">
                            <MapPin className="h-4 w-4 text-primary" />
                            Location Details
                        </DialogTitle>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 -mr-2 text-muted-foreground hover:text-foreground"
                            onClick={() => setIsInternalMapOpen(false)}
                        >
                            <X className="h-4 w-4" />
                            <span className="sr-only">Close</span>
                        </Button>
                    </DialogHeader>

                    <div className="relative h-[60vh] w-full bg-muted mt-12">
                        <MapPicker
                            initialLocation={{ lat: latitude, lng: longitude }}
                            readonly={true}
                            className="h-full w-full"
                        />
                    </div>

                    <DialogFooter className="p-4 bg-background border-t">
                        <div className="flex w-full items-center justify-between gap-4">
                            <div className="text-sm text-muted-foreground truncate max-w-[300px]">
                                {address || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`}
                            </div>
                            <Button onClick={() => onClick()}>
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Open in Google Maps
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
