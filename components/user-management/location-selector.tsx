/**
 * Location Selector Component
 * 
 * Multi-select dropdown for selecting locations with search functionality.
 */

"use client";

import { useState } from "react";
import { Search, Plus, X, Check, Info, Building2, Hash, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { cn, normalizeSearchQuery, matchesAnySearchQuery } from "@/lib/utils";
import { CreateLocationDialog } from "@/components/locations/create-location-dialog";
import type { Id } from "@/convex/_generated/dataModel";

interface LocationSelectorProps {
    selectedLocations: Id<"sites">[];
    onSelectionChange: (locationIds: Id<"sites">[]) => void;
    disabled?: boolean;
}

export function LocationSelector({
    selectedLocations,
    onSelectionChange,
    disabled = false,
}: LocationSelectorProps) {
    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [showCreateDialog, setShowCreateDialog] = useState(false);

    const allLocations = useQuery(api.sites.getAllSites, {});
    const createLocation = useMutation(api.sites.createSite);

    // Filter locations based on search
    const filteredLocations = allLocations?.filter((location) => {
        const normalizedQuery = normalizeSearchQuery(searchQuery);
        if (!normalizedQuery) return true;
        return matchesAnySearchQuery(
            [location.name, location.code, location.address, location.description],
            normalizedQuery
        );
    }) || [];

    // Get selected location details
    const selectedLocationDetails = allLocations?.filter((location) =>
        selectedLocations.includes(location._id)
    ) || [];

    const handleToggleLocation = (locationId: Id<"sites">) => {
        if (selectedLocations.includes(locationId)) {
            onSelectionChange(selectedLocations.filter((id) => id !== locationId));
        } else {
            onSelectionChange([...selectedLocations, locationId]);
        }
    };

    const handleRemoveLocation = (locationId: Id<"sites">) => {
        onSelectionChange(selectedLocations.filter((id) => id !== locationId));
    };

    const handleCreateLocation = async (data: {
        name: string;
        code?: string;
        address?: string;
        description?: string;
        type?: "site" | "inventory";
    }) => {
        try {
            // Check if location name already exists (case-insensitive)
            const locationNameLower = data.name.trim().toLowerCase();
            const existingLocation = allLocations?.find(
                (location) => location.name.toLowerCase() === locationNameLower
            );

            if (existingLocation) {
                toast.error(`Location "${data.name}" already exists!`);
                return;
            }

            const newLocationId = await createLocation({
                ...data,
                type: data.type || "site",
            });
            // Add the new location to selected locations
            onSelectionChange([...selectedLocations, newLocationId]);
            setShowCreateDialog(false);
            setSearchQuery("");
            toast.success("Location created and selected successfully!");
        } catch (error: any) {
            if (error.message?.includes("already exists") || error.message?.includes("duplicate")) {
                toast.error(`Location "${data.name}" already exists!`);
            } else {
                toast.error(error.message || "Failed to create location");
            }
        }
    };

    return (
        <>
            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Locations</label>
                    <span className="text-xs text-muted-foreground">
                        {selectedLocations.length} selected
                    </span>
                </div>

                {/* Selected Locations Badges */}
                {selectedLocationDetails.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 p-2 border rounded-md bg-muted/30 min-h-[36px]">
                        {selectedLocationDetails.map((location) => (
                            <div key={location._id} className="flex items-center gap-1">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Badge
                                            variant="secondary"
                                            className="flex items-center gap-1 pr-1 cursor-pointer hover:bg-primary/10 transition-colors"
                                        >
                                            {location.name}
                                            {!disabled && (
                                                <span
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        e.preventDefault();
                                                        handleRemoveLocation(location._id);
                                                    }}
                                                    className="ml-1 hover:bg-destructive/20 rounded-full p-0.5 transition-colors inline-flex items-center justify-center"
                                                    role="button"
                                                    tabIndex={0}
                                                    onKeyDown={(e) => {
                                                        if ((e.key === "Enter" || e.key === " ") && !disabled) {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            handleRemoveLocation(location._id);
                                                        }
                                                    }}
                                                >
                                                    <X className="h-3 w-3" />
                                                </span>
                                            )}
                                        </Badge>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-80 p-4 z-[110]" align="start">
                                        <div className="space-y-3">
                                            <div>
                                                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                                    <Building2 className="h-4 w-4 text-primary" />
                                                    {location.name}
                                                </h4>
                                            </div>
                                            <div className="space-y-2 text-sm">
                                                {location.code && (
                                                    <div className="flex items-start gap-2">
                                                        <Hash className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                                        <div>
                                                            <p className="text-xs text-muted-foreground">Location Code</p>
                                                            <p className="font-medium">{location.code}</p>
                                                        </div>
                                                    </div>
                                                )}
                                                {location.address && (
                                                    <div className="flex items-start gap-2">
                                                        <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                                        <div className="flex-1">
                                                            <p className="text-xs text-muted-foreground">Address</p>
                                                            <div className="flex items-center gap-1">
                                                                <p className="font-medium text-xs flex-1">{location.address}</p>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        const encodedAddress = encodeURIComponent(location.address || '');
                                                                        const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
                                                                        window.open(mapUrl, '_blank');
                                                                    }}
                                                                    className="text-muted-foreground hover:text-primary transition-colors p-1 rounded-full hover:bg-muted/50 shrink-0 border border-muted-foreground/20 hover:border-primary/40"
                                                                    title="Open in Maps"
                                                                >
                                                                    <MapPin className="h-2.5 w-2.5" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                                {location.description && (
                                                    <div className="flex items-start gap-2">
                                                        <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                                        <div>
                                                            <p className="text-xs text-muted-foreground">Description</p>
                                                            <p className="font-medium text-xs">{location.description}</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        ))}
                    </div>
                )}

                {/* Location Selector Popover */}
                {!disabled && (
                    <Popover open={open} onOpenChange={setOpen} modal={false}>
                        <PopoverTrigger asChild>
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full justify-start text-left font-normal h-9"
                            >
                                <Search className="mr-2 h-4 w-4" />
                                {selectedLocations.length === 0
                                    ? "Select locations..."
                                    : `${selectedLocations.length} location(s) selected`}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent
                            className="w-[400px] p-0 z-[100]"
                            align="start"
                            sideOffset={4}
                            onOpenAutoFocus={(e) => e.preventDefault()}
                            onInteractOutside={(e) => {
                                const target = e.target as HTMLElement;
                                const createLocationDialog = target.closest('[role="dialog"]');
                                if (createLocationDialog) {
                                    const hasLocationNameInput = createLocationDialog.querySelector('input[id="locationName"]');
                                    if (hasLocationNameInput) {
                                        e.preventDefault();
                                        return;
                                    }
                                }
                            }}
                            onEscapeKeyDown={(e) => {
                                setOpen(false);
                            }}
                        >
                            <div className="p-3 border-b">
                                <div className="relative">
                                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search locations..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-8"
                                    />
                                </div>
                            </div>

                            <div className="p-2 border-b">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-start gap-2"
                                    onClick={() => setShowCreateDialog(true)}
                                >
                                    <Plus className="h-4 w-4" />
                                    Add New Location
                                </Button>
                            </div>

                            <div className="max-h-[300px] overflow-y-auto">
                                {!allLocations ? (
                                    <div className="p-4 text-center text-sm text-muted-foreground">
                                        Loading locations...
                                    </div>
                                ) : filteredLocations.length === 0 ? (
                                    <div className="p-4 text-center text-sm text-muted-foreground">
                                        {searchQuery ? "No locations found" : "No locations available"}
                                    </div>
                                ) : (
                                    <div className="p-1">
                                        {filteredLocations.map((location) => {
                                            const isSelected = selectedLocations.includes(location._id);
                                            return (
                                                <button
                                                    key={location._id}
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        handleToggleLocation(location._id);
                                                    }}
                                                    className={cn(
                                                        "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left transition-colors",
                                                        "hover:bg-accent",
                                                        isSelected && "bg-accent"
                                                    )}
                                                >
                                                    <div
                                                        className={cn(
                                                            "h-4 w-4 rounded border flex items-center justify-center shrink-0",
                                                            isSelected
                                                                ? "bg-primary border-primary"
                                                                : "border-input"
                                                        )}
                                                    >
                                                        {isSelected && (
                                                            <Check className="h-3 w-3 text-primary-foreground" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-medium truncate">{location.name}</div>
                                                        {location.code && (
                                                            <div className="text-xs text-muted-foreground">
                                                                Code: {location.code}
                                                            </div>
                                                        )}
                                                        {location.address && (
                                                            <div className="text-xs text-muted-foreground truncate">
                                                                {location.address}
                                                            </div>
                                                        )}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </PopoverContent>
                    </Popover>
                )}
            </div>

            <CreateLocationDialog
                open={showCreateDialog}
                onOpenChange={setShowCreateDialog}
                onCreate={handleCreateLocation}
            />
        </>
    );
}
