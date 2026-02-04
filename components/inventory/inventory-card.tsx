"use client";

import { useState } from "react";
import { Doc } from "@/convex/_generated/dataModel";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    MoreHorizontal,
    Edit,
    ImageIcon,
    Trash2,
    Calendar,
    Package,
    ChevronLeft,
    ChevronRight,
    Maximize2,
    Box
} from "lucide-react";
import { LazyImage } from "@/components/ui/lazy-image";
import { ReadMoreText } from "@/components/ui/read-more-text";
import { cn } from "@/lib/utils";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Building2, Phone, Mail, MapPin, Hash } from "lucide-react";
import { VendorDetailsDialog } from "./vendor-details-dialog";

interface InventoryCardProps {
    item: Doc<"inventory">;
    onEdit: (item: Doc<"inventory">) => void;
    onDelete: (item: Doc<"inventory">) => void;
    onManageImages: (item: Doc<"inventory">) => void;
    onImageClick: (item: Doc<"inventory">, index: number) => void;
    onViewDetails: (item: Doc<"inventory">) => void;
    canPerformCRUD: boolean;
    canAddImages: boolean;
}


export function InventoryCard({
    item,
    onEdit,
    onDelete,
    onManageImages,
    onImageClick,
    onViewDetails,
    canPerformCRUD,
    canAddImages,
}: InventoryCardProps) {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [selectedVendorDetails, setSelectedVendorDetails] = useState<any>(null);

    const images = item.images || [];
    const hasImages = images.length > 0;

    const handlePrevImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!hasImages) return;
        setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    };

    const handleNextImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!hasImages) return;
        setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    };

    const handleImageAreaClick = () => {
        if (hasImages) {
            onImageClick(item, currentImageIndex);
        }
    };

    return (
        <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 border border-border bg-card shadow-sm rounded-xl flex flex-col h-full">
            {/* Card Image / Top Section */}
            <div className="relative h-48 w-full overflow-hidden bg-muted flex items-center justify-center group/image">
                {hasImages ? (
                    <div className="h-full w-full relative">
                        <LazyImage
                            src={images[currentImageIndex].imageUrl}
                            alt={item.itemName}
                            width={400}
                            height={200}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" />

                        {/* Image Counter Badge */}
                        {images.length > 1 && (
                            <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md text-white text-[10px] px-2 py-0.5 rounded-full font-medium border border-white/20 z-10 pointer-events-none">
                                {currentImageIndex + 1} / {images.length}
                            </div>
                        )}

                        {/* Navigation Arrows - Always visible on mobile, hover on desktop */}
                        {images.length > 1 && (
                            <>
                                <button
                                    onClick={handlePrevImage}
                                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 transition-all text-white flex items-center justify-center backdrop-blur-sm z-20 hover:scale-110 border border-white/10"
                                    aria-label="Previous Image"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={handleNextImage}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 transition-all text-white flex items-center justify-center backdrop-blur-sm z-20 hover:scale-110 border border-white/10"
                                    aria-label="Next Image"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </>
                        )}

                        {/* Click Area for Lightbox */}
                        <button
                            className="absolute inset-0 z-0 cursor-zoom-in"
                            onClick={handleImageAreaClick}
                            aria-label="View Fullscreen"
                        />
                        {/* Center icon hint on hover */}
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                            <div className="bg-black/30 backdrop-blur-sm p-2 rounded-full border border-white/20">
                                <Maximize2 className="w-5 h-5 text-white" />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="h-full w-full flex flex-col items-center justify-center bg-gradient-to-br from-muted/30 to-muted/80 text-muted-foreground/40 space-y-3">
                        <div className="rounded-full bg-background/50 p-4 shadow-sm border border-border/20 backdrop-blur-sm">
                            <Box className="h-8 w-8 opacity-50" />
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">No Image</span>
                    </div>
                )}

                {/* Action Button Overlay */}
                {(canPerformCRUD || canAddImages) && (
                    <div className="absolute top-2 right-2 z-30">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="secondary" size="icon" className="h-8 w-8 rounded-full shadow-md bg-background/90 hover:bg-background border border-border/50 text-foreground/80 hover:text-foreground">
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>Item Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {canPerformCRUD && (
                                    <DropdownMenuItem onClick={() => onEdit(item)}>
                                        <Edit className="h-4 w-4 mr-2" /> Edit Item
                                    </DropdownMenuItem>
                                )}
                                {canAddImages && (
                                    <DropdownMenuItem onClick={() => onManageImages(item)}>
                                        <ImageIcon className="h-4 w-4 mr-2" /> Manage Images
                                    </DropdownMenuItem>
                                )}
                                {canPerformCRUD && (
                                    <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => onDelete(item)} className="text-destructive focus:text-destructive">
                                            <Trash2 className="h-4 w-4 mr-2" /> Delete Item
                                        </DropdownMenuItem>
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )}
            </div>

            <CardContent className="p-4 space-y-4">
                {/* Header Info */}
                <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                        <h3
                            className="font-bold text-lg leading-snug text-foreground transition-colors hover:text-primary cursor-pointer line-clamp-1 hover:underline underline-offset-4 decoration-primary/30"
                            title={item.itemName}
                            onClick={() => onViewDetails(item)}
                        >
                            {item.itemName}
                        </h3>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="rounded-md font-mono text-[10px] uppercase tracking-wider bg-secondary text-secondary-foreground hover:bg-secondary/80">
                            {item.unit}
                        </Badge>
                        {item.hsnSacCode && (
                            <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded border border-border/50">
                                HSN: {item.hsnSacCode}
                            </span>
                        )}
                        <span className="text-[10px] text-muted-foreground ml-auto flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                    </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="space-y-1">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground/70 tracking-wider">Available Stock</p>
                        <div className="flex items-baseline gap-1">
                            <span className={cn(
                                "text-xl font-bold tabular-nums tracking-tight",
                                (item.centralStock || 0) > 0 ? "text-primary" : "text-destructive"
                            )}>
                                {item.centralStock}
                            </span>
                            <span className="text-xs text-muted-foreground font-medium">{item.unit}</span>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground/70 tracking-wider">Vendor</p>
                        <div className="min-h-[24px] flex items-center">
                            {((item as any).vendors && (item as any).vendors.length > 0) ? (
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Badge variant="outline" className="text-[10px] truncate max-w-full bg-background/50 backdrop-blur-sm border-border cursor-pointer hover:bg-primary/5 hover:border-primary/20 transition-colors">
                                            {(item as any).vendors[0].companyName}
                                            {(item as any).vendors.length > 1 && ` +${(item as any).vendors.length - 1} more`}
                                        </Badge>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-72 p-0 rounded-lg shadow-lg border-border" align="start">
                                        <div className="p-3 bg-muted/40 border-b border-border/50">
                                            <h4 className="font-semibold text-xs text-foreground">Associated Vendors</h4>
                                        </div>
                                        <div className="max-h-[200px] overflow-y-auto p-2 space-y-1">
                                            {(item as any).vendors.map((vendor: any, idx: number) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => setSelectedVendorDetails(vendor)}
                                                    className="w-full text-left p-2 hover:bg-muted/50 rounded-md transition-all duration-200 text-sm group/vendor border border-transparent hover:border-border/50 hover:shadow-sm"
                                                >
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <Building2 className="h-3.5 w-3.5 text-primary group-hover/vendor:scale-110 transition-transform" />
                                                        <span className="font-medium text-xs text-foreground group-hover/vendor:text-primary transition-colors">{vendor.companyName}</span>
                                                    </div>
                                                    {vendor.email && (
                                                        <div className="flex items-center gap-2 text-muted-foreground ml-0.5">
                                                            <Mail className="h-3 w-3" />
                                                            <span className="text-[10px] truncate">{vendor.email}</span>
                                                        </div>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            ) : (item as any).vendor ? (
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Badge variant="outline" className="text-[10px] truncate max-w-full bg-background/50 backdrop-blur-sm border-border cursor-pointer hover:bg-primary/5 hover:border-primary/20 transition-colors">
                                            {(item as any).vendor.companyName}
                                        </Badge>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-72 p-4 rounded-lg shadow-lg border-border" align="start">
                                        <div className="space-y-3">
                                            <h4 className="font-semibold text-sm flex items-center gap-2">
                                                <Building2 className="h-4 w-4 text-primary" />
                                                {(item as any).vendor.companyName}
                                            </h4>
                                            <div className="space-y-2 text-xs">
                                                <div className="flex items-start gap-2">
                                                    <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                                                    <span className="text-muted-foreground/80 break-all">{(item as any).vendor.email}</span>
                                                </div>
                                                {(item as any).vendor.phone && (
                                                    <div className="flex items-start gap-2">
                                                        <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                                                        <span className="text-muted-foreground/80">{(item as any).vendor.phone}</span>
                                                    </div>
                                                )}
                                                {(item as any).vendor.address && (
                                                    <div className="flex items-start gap-2">
                                                        <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                                                        <span className="text-muted-foreground/80 line-clamp-2">{(item as any).vendor.address}</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="pt-2 border-t border-border/50">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="w-full h-7 text-xs font-medium text-primary hover:text-primary/80 hover:bg-primary/5"
                                                    onClick={() => setSelectedVendorDetails((item as any).vendor)}
                                                >
                                                    View Full Details
                                                </Button>
                                            </div>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            ) : (
                                <span className="text-xs text-muted-foreground/40 italic flex items-center gap-1.5">
                                    <Building2 className="h-3 w-3 opacity-50" />
                                    No Vendor
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="col-span-2 pt-2 border-t border-border/40 mt-1">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground/70 tracking-wider mb-1">Description</p>
                        <ReadMoreText
                            text={item.description || "No description provided for this item."}
                            className="text-xs text-muted-foreground/80 leading-relaxed min-h-[32px]"
                        />
                    </div>
                </div>

            </CardContent>

            <VendorDetailsDialog
                open={!!selectedVendorDetails}
                onOpenChange={(open) => !open && setSelectedVendorDetails(null)}
                vendor={selectedVendorDetails}
            />
        </Card >
    );
}
