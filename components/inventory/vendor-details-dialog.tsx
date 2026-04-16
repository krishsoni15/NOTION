"use client";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Building2, Mail, Phone, MapPin, Hash, User, Globe } from "lucide-react";

interface VendorDetailsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    vendor: any; // Using any to be flexible with the joined data, ideally Doc<"vendors">
}

export function VendorDetailsDialog({
    open,
    onOpenChange,
    vendor,
}: VendorDetailsDialogProps) {
    if (!vendor) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden gap-0">
                <div className="bg-muted/30 p-6 flex flex-col items-center justify-center border-b border-border/50">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-3 text-primary border border-primary/20 shadow-sm">
                        <Building2 className="h-8 w-8" />
                    </div>
                    <DialogTitle className="text-xl font-bold text-center">
                        {vendor.companyName}
                    </DialogTitle>
                    <Badge variant="secondary" className="mt-2 font-normal text-xs bg-background/50 backdrop-blur-sm border-border/50">
                        Vendor ID: {vendor.vendorId || "—"}
                    </Badge>
                </div>

                <DialogHeader className="sr-only">
                    <DialogTitle>Vendor Details: {vendor.companyName}</DialogTitle>
                </DialogHeader>

                <div className="p-6 space-y-5">
                    <div className="grid gap-4">
                        <div className="flex items-start gap-4 p-3 rounded-lg bg-muted/20 border border-transparent hover:border-border/60 transition-colors">
                            <div className="bg-background p-2 rounded-md shadow-sm text-muted-foreground shrink-0 border border-border/50">
                                <Mail className="h-4 w-4" />
                            </div>
                            <div className="space-y-0.5">
                                <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Email Address</p>
                                <p className="text-sm font-medium break-all">{vendor.email}</p>
                            </div>
                        </div>

                        {vendor.phone && (
                            <div className="flex items-start gap-4 p-3 rounded-lg bg-muted/20 border border-transparent hover:border-border/60 transition-colors">
                                <div className="bg-background p-2 rounded-md shadow-sm text-muted-foreground shrink-0 border border-border/50">
                                    <Phone className="h-4 w-4" />
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Phone Number</p>
                                    <p className="text-sm font-medium">{vendor.phone}</p>
                                </div>
                            </div>
                        )}

                        {vendor.gstNumber && (
                            <div className="flex items-start gap-4 p-3 rounded-lg bg-muted/20 border border-transparent hover:border-border/60 transition-colors">
                                <div className="bg-background p-2 rounded-md shadow-sm text-muted-foreground shrink-0 border border-border/50">
                                    <Hash className="h-4 w-4" />
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">GST Number</p>
                                    <p className="text-sm font-medium font-mono">{vendor.gstNumber}</p>
                                </div>
                            </div>
                        )}

                        {vendor.address && (
                            <div className="flex items-start gap-4 p-3 rounded-lg bg-muted/20 border border-transparent hover:border-border/60 transition-colors">
                                <div className="bg-background p-2 rounded-md shadow-sm text-muted-foreground shrink-0 border border-border/50">
                                    <MapPin className="h-4 w-4" />
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Address</p>
                                    <p className="text-sm font-medium leading-relaxed text-balance">{vendor.address}</p>
                                </div>
                            </div>
                        )}

                        {(vendor.contactPerson || vendor.website) && (
                            <div className="grid grid-cols-2 gap-4">
                                {vendor.contactPerson && (
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                            <User className="h-3 w-3" />
                                            <span className="text-[10px] uppercase font-bold tracking-wider">Contact Person</span>
                                        </div>
                                        <p className="text-sm font-medium pl-5">{vendor.contactPerson}</p>
                                    </div>
                                )}
                                {vendor.website && (
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                            <Globe className="h-3 w-3" />
                                            <span className="text-[10px] uppercase font-bold tracking-wider">Website</span>
                                        </div>
                                        <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary hover:underline pl-5 truncate block">
                                            {vendor.website.replace(/^https?:\/\//, '')}
                                        </a>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
