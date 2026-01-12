/**
 * Create Location Dialog Component
 * 
 * Dialog for creating new locations.
 */

"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
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

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface CreateLocationDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreate: (data: {
        name: string;
        code?: string;
        address?: string;
        description?: string;
        type?: "site" | "inventory";
    }) => Promise<void>;
}

export function CreateLocationDialog({
    open,
    onOpenChange,
    onCreate,
}: CreateLocationDialogProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [formData, setFormData] = useState<{
        name: string;
        code: string;
        address: string;
        description: string;
        type: "site" | "inventory";
    }>({
        name: "",
        code: "",
        address: "",
        description: "",
        type: "site",
    });

    const allLocations = useQuery(api.sites.getAllSites, {});

    // Check for duplicate location name
    useEffect(() => {
        if (formData.name.trim()) {
            const locationNameLower = formData.name.trim().toLowerCase();
            const existingLocation = allLocations?.find(
                (loc: { name: string }) => loc.name.toLowerCase() === locationNameLower
            );
            if (existingLocation) {
                setError(`Location "${formData.name}" already exists`);
            } else {
                setError("");
            }
        } else {
            setError("");
        }
    }, [formData.name, allLocations]);

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            setFormData({
                name: "",
                code: "",
                address: "",
                description: "",
                type: "site",
            });
            setError("");
        }
        // Only close this dialog, don't propagate to parent
        onOpenChange(newOpen);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent event from bubbling to parent form
        if (!formData.name.trim()) return;

        // Check for duplicate before submitting
        const locationNameLower = formData.name.trim().toLowerCase();
        const existingLocation = allLocations?.find(
            (loc: { name: string }) => loc.name.toLowerCase() === locationNameLower
        );
        if (existingLocation) {
            setError(`Location "${formData.name}" already exists`);
            return;
        }

        setIsLoading(true);
        setError("");
        try {
            await onCreate({
                name: formData.name.trim(),
                code: formData.type === "site" ? (formData.code.trim() || undefined) : undefined,
                address: formData.address.trim() || undefined,
                description: formData.description.trim() || undefined,
                type: formData.type,
            });
            // Reset form and close only this dialog
            setFormData({
                name: "",
                code: "",
                address: "",
                description: "",
                type: "site",
            });
            setError("");
            onOpenChange(false);
        } catch (error: any) {
            // Check if error is about duplicate location
            if (error.message?.includes("already exists") || error.message?.includes("duplicate")) {
                setError(`Location "${formData.name}" already exists`);
            } else {
                setError(error.message || "Failed to create location");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange} modal={true}>
            <DialogContent
                className="sm:max-w-[500px] z-[110]"
                onPointerDownOutside={(e) => {
                    // Prevent closing parent dialog when clicking outside
                    e.preventDefault();
                }}
                onEscapeKeyDown={(e) => {
                    // Allow ESC to close only this dialog, prevent propagation
                    e.preventDefault();
                    handleOpenChange(false);
                }}
            >
                <DialogHeader>
                    <DialogTitle>Create New Location</DialogTitle>
                    <DialogDescription>
                        Add a new location to the system. Location name is required.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Location Type Selection */}
                    <div className="space-y-2">
                        <Label>Location Type *</Label>
                        <RadioGroup
                            defaultValue="site"
                            value={formData.type}
                            onValueChange={(value) => setFormData({ ...formData, type: value as "site" | "inventory" })}
                            className="flex gap-4"
                            disabled={isLoading}
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="site" id="type-site" />
                                <Label htmlFor="type-site" className="cursor-pointer font-normal">Site</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="inventory" id="type-inventory" />
                                <Label htmlFor="type-inventory" className="cursor-pointer font-normal">Inventory</Label>
                            </div>
                        </RadioGroup>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="locationName">{formData.type === "inventory" ? "Inventory Name *" : "Site Name *"}</Label>
                        <Input
                            id="locationName"
                            placeholder={formData.type === "inventory" ? "Main Warehouse, Store 2, etc." : "Site Name (e.g. Project X)"}
                            value={formData.name}
                            onChange={(e) =>
                                setFormData({ ...formData, name: e.target.value })
                            }
                            required
                            disabled={isLoading}
                            className={error ? "border-destructive" : ""}
                        />
                        {error && (
                            <p className="text-sm text-destructive">{error}</p>
                        )}
                    </div>

                    {/* Show Code only for Site type */}
                    {formData.type === "site" && (
                        <div className="space-y-2">
                            <Label htmlFor="locationCode">
                                Site Code <span className="text-muted-foreground text-xs">(optional)</span>
                            </Label>
                            <Input
                                id="locationCode"
                                placeholder="SITE-001"
                                value={formData.code}
                                onChange={(e) =>
                                    setFormData({ ...formData, code: e.target.value })
                                }
                                disabled={isLoading}
                            />
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="locationAddress">
                            Address <span className="text-muted-foreground text-xs">(optional)</span>
                        </Label>
                        <Input
                            id="locationAddress"
                            placeholder="123 Main St, City, State"
                            value={formData.address}
                            onChange={(e) =>
                                setFormData({ ...formData, address: e.target.value })
                            }
                            disabled={isLoading}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="locationDescription">
                            Description <span className="text-muted-foreground text-xs">(optional)</span>
                        </Label>
                        <textarea
                            id="locationDescription"
                            placeholder="Additional details about the location..."
                            value={formData.description}
                            onChange={(e) =>
                                setFormData({ ...formData, description: e.target.value })
                            }
                            className="min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={isLoading}
                        />
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => handleOpenChange(false)}
                            disabled={isLoading}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading || !formData.name.trim() || !!error}>
                            {isLoading ? "Creating..." : "Create Location"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
