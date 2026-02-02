"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, Calendar, DollarSign, Building2 } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface POSelectionDialogProps {
    requestNumber: string | null;
    onOpenChange: (open: boolean) => void;
    onSelectPO: (poNumber: string) => void;
}

export function POSelectionDialog({
    requestNumber,
    onOpenChange,
    onSelectPO,
}: POSelectionDialogProps) {
    const pos = useQuery(
        api.purchaseOrders.getPOsForRequestNumber,
        requestNumber ? { requestNumber } : "skip"
    );

    const [hasAutoSelected, setHasAutoSelected] = useState(false);

    // Auto-select if only one PDF found
    useEffect(() => {
        if (pos && !hasAutoSelected) {
            if (pos.length === 1) {
                setHasAutoSelected(true);
                onSelectPO(pos[0].poNumber);
            } else if (pos.length === 0) {
                // No POs found - handle gracefully (maybe keep open to show empty state or close)
            }
        }
    }, [pos, hasAutoSelected, onSelectPO]);

    // Reset auto-select state when request number changes
    useEffect(() => {
        setHasAutoSelected(false);
    }, [requestNumber]);

    const handleOpenChange = (open: boolean) => {
        onOpenChange(open);
        if (!open) {
            setHasAutoSelected(false);
        }
    };

    if (!requestNumber) return null;

    // If loading or auto-selecting single item, show loader
    if (!pos || (pos.length === 1 && !hasAutoSelected)) {
        return (
            <Dialog open={!!requestNumber} onOpenChange={handleOpenChange}>
                <DialogContent className="sm:max-w-md flex flex-col items-center justify-center min-h-[200px]">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                    <p className="text-sm text-muted-foreground">Fetching Purchase Orders...</p>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={!!requestNumber && (pos.length > 1 || pos.length === 0)} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Select Purchase Order</DialogTitle>
                    <DialogDescription>
                        Multiple Purchase Orders found for Request #{requestNumber}. Select one to view its PDF.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-3">
                    {pos.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No Purchase Orders found for this request.
                        </div>
                    ) : (
                        pos.map((po) => (
                            <div
                                key={po._id}
                                className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors group"
                                onClick={() => onSelectPO(po.poNumber)}
                            >
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="font-mono text-xs">
                                            {po.poNumber}
                                        </Badge>
                                        <span className="text-sm font-semibold">{po.vendor?.companyName || "Unknown Vendor"}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            {format(new Date(po._creationTime), "dd MMM yyyy")}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Building2 className="h-3 w-3" />
                                            {po.items.length} Item{po.items.length !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="text-right">
                                        <div className="font-bold text-sm">
                                            ₹{po.totalAmount.toLocaleString()}
                                        </div>
                                    </div>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground group-hover:text-primary">
                                        <FileText className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
