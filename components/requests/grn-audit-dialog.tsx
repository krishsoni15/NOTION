"use client";

/**
 * GRN Audit Trail Dialog
 *
 * Beautiful vertical timeline showing the full processing history
 * of a request — system-generated audit logs only (no user notes).
 */

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
    History,
    CheckCircle2,
    Clock,
    XCircle,
    Package,
    Truck,
    FileText,
    RefreshCw,
    ShoppingCart,
    ArrowRight,
    Users,
    Activity,
    Shield,
    Layers,
} from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

interface GRNAuditDialogProps {
    requestNumber: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    requestId?: Id<"requests">;
    requestIds?: Id<"requests">[];
    poNumber?: string;
    onOpenCC?: (requestId: Id<"requests">, requestIds?: Id<"requests">[]) => void;
    onViewPDF?: (poNumber: string, requestId: Id<"requests">) => void;
}

// Status → color & icon mapping
const statusMeta: Record<string, { color: string; dot: string; label: string; icon: React.ElementType }> = {
    draft: { color: "text-slate-500", dot: "bg-slate-400", label: "Draft", icon: FileText },
    pending: { color: "text-yellow-500", dot: "bg-yellow-400", label: "Pending", icon: Clock },
    approved: { color: "text-green-500", dot: "bg-green-400", label: "Approved", icon: CheckCircle2 },
    rejected: { color: "text-red-500", dot: "bg-red-400", label: "Rejected", icon: XCircle },
    recheck: { color: "text-indigo-500", dot: "bg-indigo-400", label: "Recheck", icon: RefreshCw },
    ready_for_cc: { color: "text-purple-500", dot: "bg-purple-400", label: "Ready for CC", icon: Layers },
    cc_pending: { color: "text-amber-500", dot: "bg-amber-400", label: "CC Pending", icon: Clock },
    cc_approved: { color: "text-emerald-500", dot: "bg-emerald-400", label: "CC Approved", icon: CheckCircle2 },
    cc_rejected: { color: "text-rose-500", dot: "bg-rose-400", label: "CC Rejected", icon: XCircle },
    ready_for_po: { color: "text-teal-500", dot: "bg-teal-400", label: "Ready for PO", icon: ShoppingCart },
    direct_po: { color: "text-cyan-500", dot: "bg-cyan-400", label: "Direct PO", icon: ShoppingCart },
    sign_pending: { color: "text-orange-500", dot: "bg-orange-400", label: "Sign Pending", icon: FileText },
    sign_rejected: { color: "text-red-500", dot: "bg-red-400", label: "Sign Rejected", icon: XCircle },
    pending_po: { color: "text-blue-500", dot: "bg-blue-400", label: "Pending PO", icon: Package },
    rejected_po: { color: "text-red-500", dot: "bg-red-400", label: "Rejected PO", icon: XCircle },
    ready_for_delivery: { color: "text-teal-500", dot: "bg-teal-400", label: "Ready for Delivery", icon: Truck },
    out_for_delivery: { color: "text-sky-500", dot: "bg-sky-400", label: "Out for Delivery", icon: Truck },
    delivery_stage: { color: "text-sky-500", dot: "bg-sky-400", label: "Out for Delivery", icon: Truck },
    delivery_processing: { color: "text-sky-500", dot: "bg-sky-400", label: "Out for Delivery", icon: Truck },
    delivered: { color: "text-green-500", dot: "bg-green-400", label: "Delivered", icon: CheckCircle2 },
    split_approved: { color: "text-violet-500", dot: "bg-violet-400", label: "Split Approved", icon: Layers },
};

const roleMeta: Record<string, { label: string; color: string; bg: string }> = {
    site_engineer: { label: "Site Engineer", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
    manager: { label: "Manager", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
    purchase_officer: { label: "Purchase Officer", color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
};

function getInitials(name: string) {
    return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

export function GRNAuditDialog({
    requestNumber,
    open,
    onOpenChange,
    requestId,
    requestIds,
    poNumber,
    onOpenCC,
    onViewPDF,
}: GRNAuditDialogProps) {
    const auditLogs = useQuery(api.notes.getAuditLogs, { requestNumber });
    const requestsList = useQuery(api.requests.getRequestsByRequestNumber, { requestNumber });
    const sortedLogs = auditLogs ?? [];
    const isLoading = auditLogs === undefined;

    const totalUsers = new Set(sortedLogs.map(n => n.userName)).size;
    const totalRoles = new Set(sortedLogs.map(n => n.userRole)).size;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl md:max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl border-border/60">
                <VisuallyHidden><DialogTitle>Request Logs #{requestNumber}</DialogTitle></VisuallyHidden>

                {/* ── Header ── */}
                <div className="relative px-6 pt-5 pb-4 border-b border-border/50 bg-gradient-to-br from-background via-background to-primary/5">
                    {/* Glow blob */}
                    <div className="absolute top-0 right-0 w-40 h-20 bg-primary/10 rounded-full blur-3xl pointer-events-none" />

                    <div className="relative flex items-start gap-3">
                        {/* Icon */}
                        <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                            <History className="h-5 w-5 text-primary" />
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h2 className="text-base font-semibold tracking-tight">Request Logs</h2>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-muted/60 border border-border/50 text-muted-foreground">
                                    #{requestNumber}
                                </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                Full system processing history · creation → delivery
                            </p>

                            {/* Items List */}
                            {requestsList && requestsList.length > 0 && (
                                <div className="mt-2.5 flex flex-wrap gap-1.5">
                                    {requestsList.map((req, i) => (
                                        <div key={req._id} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-background border border-border/50 shadow-sm transition-colors hover:border-primary/30">
                                            <span className="text-[10px] font-black font-mono text-primary/80">#{req.itemOrder ?? (i + 1)}</span>
                                            <span className="text-foreground/80 truncate max-w-[150px]">{req.itemName}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Mini stats row */}
                    {!isLoading && (
                        <div className="relative flex items-center gap-3 mt-3 pt-3 border-t border-border/30">
                            <Stat icon={Activity} label="Actions" value={sortedLogs.length} color="text-primary" />
                            <div className="h-4 w-px bg-border/50" />
                            <Stat icon={Users} label="Users" value={totalUsers} color="text-blue-500" />
                            <div className="h-4 w-px bg-border/50" />
                            <Stat icon={Shield} label="Roles" value={totalRoles} color="text-violet-500" />
                        </div>
                    )}
                </div>

                {/* ── Body ── */}
                <div className="flex-1 overflow-y-auto">
                    {isLoading ? (
                        <LoadingSkeleton />
                    ) : sortedLogs.length === 0 ? (
                        <EmptyState requestNumber={requestNumber} />
                    ) : (
                        <div className="px-6 py-5">
                            <div className="relative">
                                {/* Vertical timeline line */}
                                <div className="absolute left-[19px] top-5 bottom-2 w-px bg-gradient-to-b from-primary/40 via-border/60 to-transparent" />

                                <div className="space-y-0">
                                    {sortedLogs.map((log, idx) => {
                                        const isLast = idx === sortedLogs.length - 1;
                                        const status = (log as any).status as string;
                                        const meta = statusMeta[status] ?? { color: "text-muted-foreground", dot: "bg-muted-foreground", label: status?.replace(/_/g, " ") ?? "", icon: Activity };
                                        const role = roleMeta[log.userRole ?? ""] ?? { label: log.userRole?.replace(/_/g, " ") ?? "Unknown", color: "text-muted-foreground", bg: "bg-muted/40 border-border/50" };
                                        const Icon = meta.icon;

                                        return (
                                            <div key={log._id} className={cn("relative flex gap-4 group", !isLast && "pb-5")}>
                                                {/* Step node */}
                                                <div className="relative z-10 flex-shrink-0">
                                                    <div className={cn(
                                                        "h-10 w-10 rounded-full flex items-center justify-center border-2 transition-all duration-200",
                                                        isLast
                                                            ? "bg-primary border-primary shadow-lg shadow-primary/30"
                                                            : "bg-background border-border/60 group-hover:border-primary/40"
                                                    )}>
                                                        <Icon className={cn("h-4 w-4", isLast ? "text-primary-foreground" : meta.color)} />
                                                    </div>
                                                    {/* Step number badge */}
                                                    <span className={cn(
                                                        "absolute -bottom-1 -right-1 h-4 w-4 rounded-full text-[9px] font-bold flex items-center justify-center border",
                                                        isLast
                                                            ? "bg-primary text-primary-foreground border-primary"
                                                            : "bg-muted text-muted-foreground border-border/50"
                                                    )}>
                                                        {idx + 1}
                                                    </span>
                                                </div>

                                                {/* Card */}
                                                <div className={cn(
                                                    "flex-1 min-w-0 rounded-xl border p-3.5 transition-all duration-200",
                                                    "bg-card/60 hover:bg-card hover:shadow-sm",
                                                    isLast && "border-primary/30 bg-primary/5 hover:bg-primary/5"
                                                )}>
                                                    {/* Top row: user + time */}
                                                    <div className="flex items-start justify-between gap-2 mb-2">
                                                        {/* Avatar + user info */}
                                                        <div className="flex items-center gap-2 min-w-0">
                                                            <div className={cn(
                                                                "h-7 w-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 border",
                                                                role.bg, role.color
                                                            )}>
                                                                {getInitials(log.userName)}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="text-xs font-semibold truncate leading-tight">{log.userName}</div>
                                                                <div className={cn("text-[10px] truncate leading-tight", role.color)}>{role.label}</div>
                                                            </div>
                                                        </div>

                                                        {/* Date + time */}
                                                        <div className="text-right flex-shrink-0">
                                                            <div className="text-[10px] font-medium text-foreground/70 leading-tight">
                                                                {format(new Date(log.createdAt), "dd MMM yyyy")}
                                                            </div>
                                                            <div className="text-[10px] text-muted-foreground leading-tight">
                                                                {format(new Date(log.createdAt), "hh:mm a")}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Action text */}
                                                    <p className="text-[13px] leading-relaxed text-foreground/90 mb-2.5">
                                                        {log.content}
                                                    </p>

                                                    {/* Status badge & Action Buttons */}
                                                    <div className="flex flex-wrap items-center justify-between gap-3 mt-1">
                                                        {status && (
                                                            <div className="flex items-center gap-1.5">
                                                                <span className={cn("h-1.5 w-1.5 rounded-full flex-shrink-0", meta.dot)} />
                                                                <span className={cn("text-[10px] font-medium capitalize", meta.color)}>
                                                                    {meta.label}
                                                                </span>
                                                            </div>
                                                        )}

                                                        {/* Dynamic CC / PO Buttons */}
                                                        <div className="flex items-center gap-2">
                                                            {onOpenCC && ["cc_pending", "cc_approved", "cc_rejected", "ready_for_cc"].includes(status) && requestId && (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); onOpenCC(requestId, requestIds); }}
                                                                    className="inline-flex items-center justify-center rounded-md text-[10px] font-bold border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-900/30 dark:text-purple-400 dark:hover:bg-purple-900/50 h-5 px-2 transition-colors shadow-sm"
                                                                >
                                                                    <Layers className="h-3 w-3 mr-1" /> View CC
                                                                </button>
                                                            )}
                                                            {onViewPDF && ["ready_for_po", "direct_po", "sign_pending", "sign_rejected", "pending_po", "rejected_po", "ready_for_delivery", "out_for_delivery", "delivery_stage", "delivery_processing", "delivered", "ordered", "partially_processed"].includes(status) && poNumber && requestId && (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); onViewPDF(poNumber, requestId); }}
                                                                    className="inline-flex items-center justify-center rounded-md text-[10px] font-bold border border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 dark:border-orange-800 dark:bg-orange-900/30 dark:text-orange-400 dark:hover:bg-orange-900/50 h-5 px-2 transition-colors shadow-sm"
                                                                >
                                                                    <FileText className="h-3 w-3 mr-1" /> View PDF
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function Stat({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number; color: string }) {
    return (
        <div className="flex items-center gap-1.5">
            <Icon className={cn("h-3.5 w-3.5", color)} />
            <span className="text-[11px] font-bold text-foreground">{value}</span>
            <span className="text-[11px] text-muted-foreground">{label}</span>
        </div>
    );
}

function LoadingSkeleton() {
    return (
        <div className="px-6 py-5 space-y-4">
            {[1, 2, 3].map(i => (
                <div key={i} className="flex gap-4 animate-pulse">
                    <div className="h-10 w-10 rounded-full bg-muted flex-shrink-0" />
                    <div className="flex-1 space-y-2 pt-1">
                        <div className="h-3 bg-muted rounded-full w-1/3" />
                        <div className="h-3 bg-muted rounded-full w-2/3" />
                        <div className="h-3 bg-muted rounded-full w-1/2" />
                    </div>
                </div>
            ))}
        </div>
    );
}

function EmptyState({ requestNumber }: { requestNumber: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            {/* Animated ring */}
            <div className="relative mb-5">
                <div className="h-16 w-16 rounded-full bg-muted/40 border border-border/50 flex items-center justify-center">
                    <History className="h-7 w-7 text-muted-foreground/40" />
                </div>
                <div className="absolute inset-0 rounded-full border border-primary/10 animate-ping" style={{ animationDuration: "3s" }} />
            </div>
            <p className="font-semibold text-sm text-foreground/70">No audit events yet</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-[220px] leading-relaxed">
                System actions for request <span className="font-mono font-medium">#{requestNumber}</span> will appear here as it progresses
            </p>
        </div>
    );
}
