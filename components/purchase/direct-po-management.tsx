"use client";

/**
 * Direct PO Management Component
 * 
 * Displays and manages all Direct Purchase Orders
 */

import React, { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command";
import { toast } from "sonner";
import { format } from "date-fns";
import {
    Search,
    FileText,
    Calendar,
    Package,
    Building2,
    IndianRupee,
    CheckCircle2,
    XCircle,
    Clock,
    Eye,
    Zap,
    AlertTriangle,
    Check,
    X,
    Filter,
    RotateCw,
} from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { DirectPODialog, DirectPOInitialData } from "./direct-po-dialog";

// Status configuration
const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any; className?: string }> = {
    pending_approval: {
        label: "Pending",
        variant: "secondary",
        icon: AlertTriangle,
        className: "bg-amber-100 text-amber-700 hover:bg-amber-100/80 border-amber-200",
    },
    approved: { // Not effectively used if we skip to Ordered, but good to have
        label: "Approved",
        variant: "default",
        icon: CheckCircle2,
        className: "bg-emerald-600 text-white hover:bg-emerald-700",
    },
    ordered: {
        label: "Pending PO",
        variant: "default",
        icon: Clock,
        className: "bg-blue-600 text-white hover:bg-blue-700",
    },
    delivered: {
        label: "Delivered",
        variant: "default",
        icon: CheckCircle2,
        className: "bg-green-600 text-white hover:bg-green-700",
    },
    cancelled: {
        label: "Cancelled",
        variant: "destructive",
        icon: XCircle,
        className: "",
    },
    rejected: {
        label: "PO Rejected",
        variant: "destructive",
        icon: XCircle,
        className: "",
    },
};

export function DirectPOManagement() {
    const directPOs = useQuery(api.purchaseOrders.getDirectPurchaseOrders);
    const currentUser = useQuery(api.users.getCurrentUser);

    const updatePOStatus = useMutation(api.purchaseOrders.updatePOStatus);
    const cancelPO = useMutation(api.purchaseOrders.cancelPO);
    const approvePO = useMutation(api.purchaseOrders.approveDirectPO);
    const rejectPO = useMutation(api.purchaseOrders.rejectDirectPO);

    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState<string[]>([]);
    const [selectedPO, setSelectedPO] = useState<any | null>(null);
    const [selectedPOForDetails, setSelectedPOForDetails] = useState<any | null>(null);
    const [showCancelDialog, setShowCancelDialog] = useState(false);
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [showDetailsDialog, setShowDetailsDialog] = useState(false);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [createDialogInitialData, setCreateDialogInitialData] = useState<DirectPOInitialData | null>(null);
    const [rejectReason, setRejectReason] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const isManager = currentUser?.role === "manager";

    // Filter POs based on search and status
    const filteredPOs = useMemo(() => {
        if (!directPOs) return [];

        let filtered = directPOs;

        // Filter by status
        if (filterStatus.length > 0) {
            filtered = filtered.filter((po) => filterStatus.includes(po.status));
        }

        // Filter by search query
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter((po) => {
                const matchesPONumber = po.poNumber.toLowerCase().includes(query);
                const matchesItem = po.itemDescription.toLowerCase().includes(query);
                const matchesVendor = po.vendor?.companyName.toLowerCase().includes(query);
                const matchesSite = po.site?.name.toLowerCase().includes(query);

                return matchesPONumber || matchesItem || matchesVendor || matchesSite;
            });
        }

        return filtered;
    }, [directPOs, searchQuery, filterStatus]);

    // Calculate stats
    const stats = useMemo(() => {
        if (!directPOs) return { total: 0, pending: 0, ordered: 0, delivered: 0, cancelled: 0, totalValue: 0, latestPendingDate: null };

        const total = directPOs.length;
        const pendingPOs = directPOs.filter((po) => po.status === "pending_approval");
        const pending = pendingPOs.length;
        const ordered = directPOs.filter((po) => po.status === "ordered").length;
        const delivered = directPOs.filter((po) => po.status === "delivered").length;
        const cancelled = directPOs.filter((po) => po.status === "cancelled" || po.status === "rejected").length;
        const totalValue = directPOs.reduce((sum, po) => sum + po.totalAmount, 0);

        const latestPendingDate = pendingPOs.length > 0
            ? Math.max(...pendingPOs.map(po => po.createdAt))
            : null;

        return { total, pending, ordered, delivered, cancelled, totalValue, latestPendingDate };
    }, [directPOs]);

    const handleMarkDelivered = async (poId: Id<"purchaseOrders">) => {
        setIsLoading(true);
        try {
            await updatePOStatus({
                poId,
                status: "delivered",
                actualDeliveryDate: Date.now(),
            });
            toast.success("PO marked as delivered");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to update PO status");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancelPO = async () => {
        if (!selectedPO) return;

        setIsLoading(true);
        try {
            await cancelPO({ poId: selectedPO._id });
            toast.success("PO cancelled successfully");
            setShowCancelDialog(false);
            setSelectedPO(null);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to cancel PO");
        } finally {
            setIsLoading(false);
        }
    };

    const handleApprovePO = async (poId: Id<"purchaseOrders">) => {
        setIsLoading(true);
        try {
            await approvePO({ poId });
            toast.success("Direct PO Approved", {
                description: "The PO has been marked as ordered.",
            });
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to approve PO");
        } finally {
            setIsLoading(false);
        }
    };

    const handleRejectPO = async () => {
        if (!selectedPO || !rejectReason.trim()) return;

        setIsLoading(true);
        try {
            await rejectPO({ poId: selectedPO._id, reason: rejectReason });
            toast.success("Direct PO Rejected");
            setShowRejectDialog(false);
            setSelectedPO(null);
            setRejectReason("");
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to reject PO");
        } finally {
            setIsLoading(false);
        }
    };

    const handleResubmit = (po: any) => {
        // Construct initial data from the rejected PO
        // Handle both legacy flat structure and new items array structure if applicable
        const items = po.items && po.items.length > 0 ? po.items.map((item: any) => ({
            itemDescription: item.itemDescription || item.itemName || "", // Handle various naming conventions
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitRate || item.unitPrice,
            hsnCode: item.hsnSacCode || item.hsnCode
        })) : [{
            itemDescription: po.itemDescription,
            quantity: po.quantity,
            unit: po.unit,
            unitPrice: po.unitRate,
            hsnCode: po.hsnSacCode
        }];

        const initialData: DirectPOInitialData = {
            requestNumber: undefined, // Don't link to old PO number, generic resubmit
            vendorId: po.vendor?._id,
            deliverySiteId: po.site?._id,
            deliverySiteName: po.site?.name,
            items: items,
            vendorDetails: po.vendor ? {
                name: po.vendor.companyName,
                email: po.vendor.email,
                phone: po.vendor.phone,
                contactName: po.vendor.contactName,
                gstNumber: po.vendor.gstNumber,
                address: po.vendor.address
            } : undefined,
            notes: po.rejectionReason ? `[Rejection Reason: ${po.rejectionReason}]\n${po.notes || ''}` : po.notes,
            validTill: po.validTill ? new Date(po.validTill).toISOString().split('T')[0] : undefined
        };

        setCreateDialogInitialData(initialData);
        setShowCreateDialog(true);
        setShowDetailsDialog(false);
    };

    return (
        <>
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Zap className="h-6 w-6 text-orange-500" />
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Direct Purchase Orders</h1>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Manage Direct Purchase Orders and Approvals
                    </p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-center space-y-2">
                                <div className="text-2xl font-bold">{stats.total}</div>
                                <div className="text-xs text-muted-foreground">Total POs</div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800">
                        <CardContent className="pt-6">
                            <div className="text-center space-y-2">
                                <div className="text-2xl font-bold text-amber-600 dark:text-amber-500">{stats.pending}</div>
                                <div className="text-xs text-amber-600/80 dark:text-amber-500/80 font-medium">Pending</div>
                                {stats.latestPendingDate && (
                                    <div className="text-[10px] text-amber-600/60 dark:text-amber-500/60 flex items-center justify-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        {format(new Date(stats.latestPendingDate), "MMM dd, yyyy")}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-center space-y-2">
                                <div className="text-2xl font-bold text-blue-600">{stats.ordered}</div>
                                <div className="text-xs text-muted-foreground">Ordered</div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-center space-y-2">
                                <div className="text-2xl font-bold text-green-600">{stats.delivered}</div>
                                <div className="text-xs text-muted-foreground">Delivered</div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-center space-y-2">
                                <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
                                <div className="text-xs text-muted-foreground">Cancelled/Rejected</div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-center space-y-2">
                                <div className="text-2xl font-bold text-primary">₹{stats.totalValue.toLocaleString()}</div>
                                <div className="text-xs text-muted-foreground">Total Value</div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Search and Filter */}
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                                <Input
                                    placeholder="Search by PO number, item, vendor, or site..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                            </div>

                            {/* Status Filter */}
                            <div className="w-full sm:w-[250px]">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            className="w-full justify-between"
                                        >
                                            {filterStatus.length > 0
                                                ? filterStatus.length === 1
                                                    ? filterStatus[0] === "pending_approval"
                                                        ? "Pending"
                                                        : filterStatus[0] === "ordered"
                                                            ? "Pending PO"
                                                            : filterStatus[0] === "rejected"
                                                                ? "PO Rejected"
                                                                : `${filterStatus.length} status selected`
                                                    : `${filterStatus.length} status selected`
                                                : "Filter by status"}
                                            <Filter className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[200px] p-0" align="start">
                                        <Command>
                                            <CommandInput placeholder="Search status..." />
                                            <CommandList>
                                                <CommandEmpty>No status found.</CommandEmpty>
                                                <CommandGroup>
                                                    <CommandItem
                                                        onSelect={() => setFilterStatus([])}
                                                        className="font-medium"
                                                    >
                                                        <div
                                                            className={cn(
                                                                "mr-2 flex h-4 w-4 items-center justify-center rounded-full border border-primary",
                                                                filterStatus.length === 0
                                                                    ? "bg-primary text-primary-foreground"
                                                                    : "opacity-50 [&_svg]:invisible"
                                                            )}
                                                        >
                                                            <Check className={cn("h-4 w-4")} />
                                                        </div>
                                                        All Statuses
                                                    </CommandItem>
                                                    {/* Quick Filter: Pending */}
                                                    <CommandItem
                                                        onSelect={() => setFilterStatus(["pending_approval"])}
                                                        className="font-medium text-amber-600"
                                                    >
                                                        <div
                                                            className={cn(
                                                                "mr-2 flex h-4 w-4 items-center justify-center rounded-full border border-primary",
                                                                filterStatus.length === 1 && filterStatus[0] === "pending_approval"
                                                                    ? "bg-primary text-primary-foreground"
                                                                    : "opacity-50 [&_svg]:invisible"
                                                            )}
                                                        >
                                                            <Check className={cn("h-4 w-4")} />
                                                        </div>
                                                        Pending
                                                    </CommandItem>
                                                    {/* Quick Filter: Pending PO */}
                                                    <CommandItem
                                                        onSelect={() => setFilterStatus(["ordered"])}
                                                        className="font-medium text-blue-600"
                                                    >
                                                        <div
                                                            className={cn(
                                                                "mr-2 flex h-4 w-4 items-center justify-center rounded-full border border-primary",
                                                                filterStatus.length === 1 && filterStatus[0] === "ordered"
                                                                    ? "bg-primary text-primary-foreground"
                                                                    : "opacity-50 [&_svg]:invisible"
                                                            )}
                                                        >
                                                            <Check className={cn("h-4 w-4")} />
                                                        </div>
                                                        Pending PO
                                                    </CommandItem>
                                                    {/* Quick Filter: PO Rejected */}
                                                    <CommandItem
                                                        onSelect={() => setFilterStatus(["rejected"])}
                                                        className="font-medium text-red-600"
                                                    >
                                                        <div
                                                            className={cn(
                                                                "mr-2 flex h-4 w-4 items-center justify-center rounded-full border border-primary",
                                                                filterStatus.length === 1 && filterStatus[0] === "rejected"
                                                                    ? "bg-primary text-primary-foreground"
                                                                    : "opacity-50 [&_svg]:invisible"
                                                            )}
                                                        >
                                                            <Check className={cn("h-4 w-4")} />
                                                        </div>
                                                        PO Rejected
                                                    </CommandItem>
                                                </CommandGroup>
                                                <CommandSeparator />
                                                <CommandGroup>
                                                    {Object.entries(statusConfig).map(([key, config]) => (
                                                        <CommandItem
                                                            key={key}
                                                            onSelect={() => {
                                                                setFilterStatus((prev) =>
                                                                    prev.includes(key)
                                                                        ? prev.filter((s) => s !== key)
                                                                        : [...prev, key]
                                                                );
                                                            }}
                                                        >
                                                            <div
                                                                className={cn(
                                                                    "mr-2 flex h-4 w-4 items-center justify-center rounded-full border border-primary",
                                                                    filterStatus.includes(key)
                                                                        ? "bg-primary text-primary-foreground"
                                                                        : "opacity-50 [&_svg]:invisible"
                                                                )}
                                                            >
                                                                <Check className={cn("h-4 w-4")} />
                                                            </div>
                                                            {config.label}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                                {filterStatus.length > 0 && (
                                                    <>
                                                        <CommandSeparator />
                                                        <CommandGroup>
                                                            <CommandItem
                                                                onSelect={() => setFilterStatus([])}
                                                                className="justify-center text-center"
                                                            >
                                                                Clear filters
                                                            </CommandItem>
                                                        </CommandGroup>
                                                    </>
                                                )}
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* POs Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Direct Purchase Orders</CardTitle>
                        <CardDescription>
                            {filteredPOs.length} {filteredPOs.length === 1 ? "order" : "orders"} found
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {filteredPOs.length === 0 ? (
                            <div className="text-center py-12 space-y-3">
                                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted">
                                    <FileText className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-lg">No Direct POs found</h3>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {searchQuery
                                            ? "Try adjusting your search criteria"
                                            : "Create your first Direct PO for emergency procurement"}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>PO Number</TableHead>
                                            <TableHead>Item</TableHead>
                                            <TableHead>Vendor</TableHead>
                                            <TableHead>Site</TableHead>
                                            <TableHead>Quantity</TableHead>
                                            <TableHead>Amount</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Created</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredPOs.map((po) => {
                                            const status = statusConfig[po.status] || statusConfig.ordered;
                                            const StatusIcon = status.icon;

                                            return (
                                                <TableRow
                                                    key={po._id}
                                                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                                                    onClick={() => {
                                                        setSelectedPOForDetails(po);
                                                        setShowDetailsDialog(true);
                                                    }}
                                                >
                                                    <TableCell className="font-medium">
                                                        <div className="flex items-center gap-2">
                                                            <Zap className="h-4 w-4 text-orange-500" />
                                                            {po.poNumber}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="max-w-[200px]">
                                                            <div className="font-medium truncate">{po.itemDescription}</div>
                                                            {po.hsnSacCode && (
                                                                <div className="text-xs text-muted-foreground">
                                                                    HSN: {po.hsnSacCode}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="max-w-[150px] truncate">
                                                            {po.vendor?.companyName || "N/A"}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="max-w-[150px] truncate">
                                                            {po.site?.name || "N/A"}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {po.quantity} {po.unit}
                                                    </TableCell>
                                                    <TableCell className="font-semibold">
                                                        ₹{po.totalAmount.toLocaleString()}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={status.variant} className={cn("gap-1", status.className)}>
                                                            <StatusIcon className="h-3 w-3" />
                                                            {status.label}
                                                        </Badge>
                                                        {po.status === 'rejected' && po.rejectionReason && (
                                                            <div className="text-xs text-red-600 mt-1 max-w-[150px] truncate" title={po.rejectionReason}>
                                                                Reason: {po.rejectionReason}
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-sm text-muted-foreground">
                                                        {format(new Date(po.createdAt), "MMM dd, yyyy")}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Cancel Confirmation Dialog */}
            <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Cancel Purchase Order?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to cancel PO {selectedPO?.poNumber}? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleCancelPO}
                            disabled={isLoading}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {isLoading ? "Cancelling..." : "Confirm Cancel"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Reject Dialog */}
            <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject Direct PO</DialogTitle>
                        <DialogDescription>
                            Please provide a reason for rejecting this Purchase Order.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <Textarea
                            placeholder="Rejection reason..."
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            rows={4}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowRejectDialog(false)} disabled={isLoading}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleRejectPO} disabled={!rejectReason.trim() || isLoading}>
                            {isLoading ? "Rejecting..." : "Reject PO"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* PO Details Dialog */}
            <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Zap className="h-5 w-5 text-orange-500" />
                            Direct PO #{selectedPOForDetails?.poNumber}
                        </DialogTitle>
                        <DialogDescription>
                            View and manage Direct Purchase Order details
                        </DialogDescription>
                    </DialogHeader>

                    {selectedPOForDetails && (
                        <div className="space-y-6 py-4">
                            {/* Status Badge */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <Badge
                                        variant={statusConfig[selectedPOForDetails.status]?.variant || "default"}
                                        className={cn("gap-1", statusConfig[selectedPOForDetails.status]?.className)}
                                    >
                                        {React.createElement(statusConfig[selectedPOForDetails.status]?.icon || Clock, { className: "h-3 w-3" })}
                                        {statusConfig[selectedPOForDetails.status]?.label || selectedPOForDetails.status}
                                    </Badge>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    Created: {format(new Date(selectedPOForDetails.createdAt), "MMM dd, yyyy")}
                                </div>
                            </div>

                            {/* Item Details */}
                            <div className="space-y-3">
                                <h4 className="font-semibold text-sm border-b pb-2">Item Details</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-xs text-muted-foreground">Item Description</Label>
                                        <p className="text-sm font-medium mt-1">{selectedPOForDetails.itemDescription}</p>
                                    </div>
                                    {selectedPOForDetails.hsnSacCode && (
                                        <div>
                                            <Label className="text-xs text-muted-foreground">HSN/SAC Code</Label>
                                            <p className="text-sm font-medium mt-1">{selectedPOForDetails.hsnSacCode}</p>
                                        </div>
                                    )}
                                    <div>
                                        <Label className="text-xs text-muted-foreground">Quantity</Label>
                                        <p className="text-sm font-medium mt-1">{selectedPOForDetails.quantity} {selectedPOForDetails.unit}</p>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-muted-foreground">Unit Rate</Label>
                                        <p className="text-sm font-medium mt-1">₹{selectedPOForDetails.unitRate.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-muted-foreground">GST Rate</Label>
                                        <p className="text-sm font-medium mt-1">{selectedPOForDetails.gstTaxRate}%</p>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-muted-foreground">Total Amount</Label>
                                        <p className="text-sm font-bold mt-1 text-primary">₹{selectedPOForDetails.totalAmount.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Vendor Details */}
                            <div className="space-y-3">
                                <h4 className="font-semibold text-sm border-b pb-2">Vendor Details</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-xs text-muted-foreground">Company Name</Label>
                                        <p className="text-sm font-medium mt-1">{selectedPOForDetails.vendor?.companyName || "N/A"}</p>
                                    </div>
                                    {selectedPOForDetails.vendor?.email && (
                                        <div>
                                            <Label className="text-xs text-muted-foreground">Email</Label>
                                            <p className="text-sm font-medium mt-1">{selectedPOForDetails.vendor.email}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Delivery Details */}
                            <div className="space-y-3">
                                <h4 className="font-semibold text-sm border-b pb-2">Delivery Details</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-xs text-muted-foreground">Delivery Site</Label>
                                        <p className="text-sm font-medium mt-1">{selectedPOForDetails.site?.name || "N/A"}</p>
                                    </div>
                                    <div>
                                        <Label className="text-xs text-muted-foreground">Valid Till</Label>
                                        <p className="text-sm font-medium mt-1">
                                            {format(new Date(selectedPOForDetails.validTill), "MMM dd, yyyy")}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Notes */}
                            {selectedPOForDetails.notes && (
                                <div className="space-y-2">
                                    <Label className="text-xs text-muted-foreground">Internal Notes</Label>
                                    <p className="text-sm bg-muted p-3 rounded-md">{selectedPOForDetails.notes}</p>
                                </div>
                            )}

                            {/* Rejection Reason */}
                            {selectedPOForDetails.status === 'rejected' && selectedPOForDetails.rejectionReason && (
                                <div className="space-y-2">
                                    <Label className="text-xs text-red-600">Rejection Reason</Label>
                                    <p className="text-sm bg-red-50 dark:bg-red-900/10 text-red-600 p-3 rounded-md border border-red-200">
                                        {selectedPOForDetails.rejectionReason}
                                    </p>
                                </div>
                            )}

                            {/* Manager Actions */}
                            {selectedPOForDetails.status === "pending_approval" && isManager && (
                                <div className="flex gap-3 pt-4 border-t">
                                    <Button
                                        onClick={() => {
                                            handleApprovePO(selectedPOForDetails._id);
                                            setShowDetailsDialog(false);
                                        }}
                                        disabled={isLoading}
                                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                    >
                                        <Check className="h-4 w-4 mr-2" />
                                        Approve PO
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        onClick={() => {
                                            setSelectedPO(selectedPOForDetails);
                                            setShowDetailsDialog(false);
                                            setShowRejectDialog(true);
                                        }}
                                        disabled={isLoading}
                                        className="flex-1"
                                    >
                                        <X className="h-4 w-4 mr-2" />
                                        Reject PO
                                    </Button>
                                </div>
                            )}

                            {/* Resubmit Action for Rejected POs */}
                            {selectedPOForDetails.status === 'rejected' && (
                                <div className="flex gap-3 pt-4 border-t">
                                    <Button
                                        onClick={() => handleResubmit(selectedPOForDetails)}
                                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                                    >
                                        <RotateCw className="h-4 w-4 mr-2" />
                                        Resubmit PO
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Create/Resubmit Dialog */}
            <DirectPODialog
                open={showCreateDialog}
                onOpenChange={setShowCreateDialog}
                initialData={createDialogInitialData}
                mode="direct"
            />
        </>
    );
}
