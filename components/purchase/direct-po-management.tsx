"use client";

/**
 * Direct PO Management Component
 * 
 * Displays and manages all Direct Purchase Orders
 */

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
} from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

// Status configuration
const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any; className?: string }> = {
    pending_approval: {
        label: "Pending Approval",
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
        label: "Ordered",
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
        label: "Rejected",
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
    const [selectedPO, setSelectedPO] = useState<any | null>(null);
    const [showCancelDialog, setShowCancelDialog] = useState(false);
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [rejectReason, setRejectReason] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const isManager = currentUser?.role === "manager";

    // Filter POs based on search
    const filteredPOs = useMemo(() => {
        if (!directPOs) return [];
        if (!searchQuery.trim()) return directPOs;

        const query = searchQuery.toLowerCase();
        return directPOs.filter((po) => {
            const matchesPONumber = po.poNumber.toLowerCase().includes(query);
            const matchesItem = po.itemDescription.toLowerCase().includes(query);
            const matchesVendor = po.vendor?.companyName.toLowerCase().includes(query);
            const matchesSite = po.site?.name.toLowerCase().includes(query);

            return matchesPONumber || matchesItem || matchesVendor || matchesSite;
        });
    }, [directPOs, searchQuery]);

    // Calculate stats
    const stats = useMemo(() => {
        if (!directPOs) return { total: 0, pending: 0, ordered: 0, delivered: 0, cancelled: 0, totalValue: 0 };

        const total = directPOs.length;
        const pending = directPOs.filter((po) => po.status === "pending_approval").length;
        const ordered = directPOs.filter((po) => po.status === "ordered").length;
        const delivered = directPOs.filter((po) => po.status === "delivered").length;
        const cancelled = directPOs.filter((po) => po.status === "cancelled" || po.status === "rejected").length;
        const totalValue = directPOs.reduce((sum, po) => sum + po.totalAmount, 0);

        return { total, pending, ordered, delivered, cancelled, totalValue };
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
                                <div className="text-xs text-amber-600/80 dark:text-amber-500/80 font-medium">Pending Approval</div>
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

                {/* Search */}
                <Card>
                    <CardContent className="pt-6">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                            <Input
                                placeholder="Search by PO number, item, vendor, or site..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
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
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredPOs.map((po) => {
                                            const status = statusConfig[po.status] || statusConfig.ordered;
                                            const StatusIcon = status.icon;

                                            return (
                                                <TableRow key={po._id}>
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
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            {po.status === "pending_approval" && isManager && (
                                                                <>
                                                                    <Button
                                                                        size="sm"
                                                                        onClick={() => handleApprovePO(po._id)}
                                                                        disabled={isLoading}
                                                                        className="bg-green-600 hover:bg-green-700 text-white h-8 px-2"
                                                                    >
                                                                        <Check className="h-4 w-4 mr-1" />
                                                                        Approve
                                                                    </Button>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="destructive"
                                                                        onClick={() => {
                                                                            setSelectedPO(po);
                                                                            setShowRejectDialog(true);
                                                                        }}
                                                                        disabled={isLoading}
                                                                        className="h-8 px-2"
                                                                    >
                                                                        <X className="h-4 w-4 mr-1" />
                                                                        Reject
                                                                    </Button>
                                                                </>
                                                            )}

                                                            {po.status === "ordered" && (
                                                                <>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        onClick={() => handleMarkDelivered(po._id)}
                                                                        disabled={isLoading}
                                                                    >
                                                                        <CheckCircle2 className="h-4 w-4 mr-1" />
                                                                        Delivered
                                                                    </Button>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="destructive"
                                                                        onClick={() => {
                                                                            setSelectedPO(po);
                                                                            setShowCancelDialog(true);
                                                                        }}
                                                                        disabled={isLoading}
                                                                    >
                                                                        <XCircle className="h-4 w-4 mr-1" />
                                                                        Cancel
                                                                    </Button>
                                                                </>
                                                            )}
                                                        </div>
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
        </>
    );
}
