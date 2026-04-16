"use client";

/**
 * Location Picker Dialog
 * 
 * Dialog to select location from map or current location.
 * Lazy loads the MapPicker to avoid SSR issues.
 */

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Navigation } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Dynamic import for MapPicker - crucial for Leaflet
const MapPicker = dynamic(() => import("./map-picker"), {
    loading: () => (
        <div className="h-[300px] w-full bg-muted animate-pulse flex items-center justify-center rounded-md">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    ),
    ssr: false
});

interface Location {
    lat: number;
    lng: number;
    address?: string;
}

interface LocationPickerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelectLocation: (location: Location) => void;
}

export function LocationPickerDialog({ open, onOpenChange, onSelectLocation }: LocationPickerDialogProps) {
    const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
    const [isGettingLocation, setIsGettingLocation] = useState(false);

    const getLocation = (highAccuracy: boolean = true) => {
        setIsGettingLocation(true);
        if (!navigator.geolocation) {
            toast.error("Geolocation is not supported by your browser");
            setIsGettingLocation(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const loc = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                setSelectedLocation(loc);
                setIsGettingLocation(false);
                toast.success("Location found");
            },
            (error) => {
                // Log error safely
                console.error(`Geolocation error (${highAccuracy ? 'High' : 'Low'} Accuracy):`, error.message, "Code:", error.code);

                // If high accuracy failed due to timeout or unavailability, try low accuracy
                if (highAccuracy && (error.code === error.TIMEOUT || error.code === error.POSITION_UNAVAILABLE)) {
                    console.log("High accuracy failed, retrying with low accuracy...");
                    // Add a small delay to prevent rapid-fire errors
                    setTimeout(() => getLocation(false), 500);
                    return;
                }

                let errorMessage = "Unable to retrieve your location";

                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = "Location permission denied. Please enable it in your browser settings.";
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = "Location information is unavailable. Try moving to an area with better signal.";
                        break;
                    case error.TIMEOUT:
                        errorMessage = "Location request timed out. Please check your connection.";
                        break;
                }

                // Show toast for final failure
                toast.error(errorMessage);
                setIsGettingLocation(false);
            },
            {
                enableHighAccuracy: highAccuracy,
                timeout: highAccuracy ? 10000 : 20000,
                maximumAge: 0
            }
        );
    };

    const handleCurrentLocation = () => {
        getLocation(true);
    };

    const handleConfirm = () => {
        if (selectedLocation) {
            onSelectLocation(selectedLocation);
            onOpenChange(false);
            setSelectedLocation(null); // Reset
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] p-0 gap-0 overflow-hidden">
                <DialogHeader className="p-4 pb-2">
                    <DialogTitle>Share Location</DialogTitle>
                    <DialogDescription>
                        Pick a location on the map or use your current position.
                    </DialogDescription>
                </DialogHeader>

                <div className="relative h-[400px] w-full bg-muted">
                    <MapPicker
                        initialLocation={selectedLocation || undefined}
                        onLocationSelect={(loc) => setSelectedLocation(loc)}
                        className="h-full w-full"
                    />

                    {/* Floating "Current Location" Button */}
                    <Button
                        size="icon"
                        variant="secondary"
                        className="absolute bottom-4 right-4 z-[400] h-10 w-10 rounded-full shadow-md bg-white hover:bg-white/90"
                        onClick={handleCurrentLocation}
                        disabled={isGettingLocation}
                        title="Use current location"
                    >
                        {isGettingLocation ? (
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        ) : (
                            <Navigation className="h-5 w-5 text-primary fill-current" />
                        )}
                    </Button>
                </div>

                <div className="bg-muted/50 px-4 py-2 text-xs text-muted-foreground border-b border-border/50 text-center">
                    Tip: You can drag the pin or click on the map to adjust details.
                </div>

                <DialogFooter className="p-4 bg-background border-t">
                    <div className="flex w-full items-center justify-between gap-4">
                        <div className="text-sm text-muted-foreground">
                            {selectedLocation ? (
                                <span className="flex items-center gap-1 text-foreground font-medium">
                                    <MapPin className="h-4 w-4 text-primary" />
                                    {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                                </span>
                            ) : (
                                "No location selected"
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                            <Button onClick={handleConfirm} disabled={!selectedLocation}>Share Location</Button>
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
