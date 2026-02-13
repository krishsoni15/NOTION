"use client";

/**
 * GRN Audit Trail Dialog
 * 
 * Shows a complete table of all actions for a specific request —
 * from creation through to delivery, with who, when, status, etc.
 * This is separate from the Notes Timeline dialog.
 */

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ScrollText } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface GRNAuditDialogProps {
    requestNumber: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-300",
    pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    approved: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    recheck: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
    ready_for_cc: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    cc_pending: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    cc_approved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
    cc_rejected: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
    ready_for_po: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
    direct_po: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
    sign_pending: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
    sign_rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    pending_po: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    rejected_po: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    ready_for_delivery: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
    out_for_delivery: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300",
    delivered: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    split_approved: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
};

const roleLabels: Record<string, string> = {
    site_engineer: "Site Engineer",
    manager: "Manager",
    purchase_officer: "Purchase Officer",
};

const roleIcons: Record<string, string> = {
    site_engineer: "🟢",
    manager: "🔵",
    purchase_officer: "🟣",
};

const roleAvatarColors: Record<string, string> = {
    site_engineer: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    manager: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    purchase_officer: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

export function GRNAuditDialog({
    requestNumber,
    open,
    onOpenChange,
}: GRNAuditDialogProps) {
    const notes = useQuery(api.notes.getNotes, { requestNumber });

    // Show oldest first (chronological)
    const sortedNotes = notes ? [...notes].reverse() : [];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl md:max-w-3xl h-[85vh] flex flex-col p-0 gap-0">
                <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-slate-50 to-blue-50/50 dark:from-slate-900 dark:to-blue-950/20">
                    <DialogTitle className="flex items-center gap-2.5">
                        <ScrollText className="h-5 w-5 text-primary" />
                        <span>GRN Audit Trail</span>
                        <Badge variant="outline" className="font-mono text-xs ml-1">#{requestNumber}</Badge>
                    </DialogTitle>
                    {notes && (
                        <p className="text-xs text-muted-foreground mt-1">
                            {notes.length} action{notes.length !== 1 ? "s" : ""} recorded — Full processing history from creation to delivery
                        </p>
                    )}
                </DialogHeader>

                <div className="flex-1 overflow-hidden relative bg-muted/5">
                    <div className="h-full overflow-y-auto scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
                        {!notes ? (
                            <div className="text-center text-muted-foreground py-16 animate-pulse">
                                <ScrollText className="h-8 w-8 mx-auto mb-3 opacity-30" />
                                Loading audit trail...
                            </div>
                        ) : notes.length === 0 ? (
                            <div className="text-center text-muted-foreground py-16 flex flex-col items-center gap-2">
                                <ScrollText className="h-12 w-12 opacity-15" />
                                <p className="font-medium">No actions recorded yet</p>
                                <p className="text-xs opacity-70">Actions will appear here as the request progresses</p>
                            </div>
                        ) : (
                            <div className="p-4">
                                {/* Table */}
                                <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-muted/40 border-b">
                                                <th className="text-left py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-10">#</th>
                                                <th className="text-left py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Action</th>
                                                <th className="text-left py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-[130px]">By</th>
                                                <th className="text-left py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-[90px]">Status</th>
                                                <th className="text-left py-2.5 px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-[130px]">Date & Time</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sortedNotes.map((note, idx) => (
                                                <tr
                                                    key={note._id}
                                                    className={cn(
                                                        "border-b last:border-b-0 transition-colors hover:bg-muted/20",
                                                        idx === sortedNotes.length - 1 && "bg-primary/5"
                                                    )}
                                                >
                                                    {/* Step # */}
                                                    <td className="py-2.5 px-3 text-center">
                                                        <span className={cn(
                                                            "inline-flex items-center justify-center h-6 w-6 rounded-full text-[10px] font-bold",
                                                            idx === sortedNotes.length - 1
                                                                ? "bg-primary text-primary-foreground"
                                                                : "bg-muted text-muted-foreground"
                                                        )}>
                                                            {idx + 1}
                                                        </span>
                                                    </td>

                                                    {/* Action Content */}
                                                    <td className="py-2.5 px-3">
                                                        <p className="text-sm leading-relaxed break-words">{note.content}</p>
                                                    </td>

                                                    {/* By - User */}
                                                    <td className="py-2.5 px-3">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-xs">{roleIcons[note.userRole || ""] || "⚪"}</span>
                                                            <div className="min-w-0">
                                                                <div className="text-xs font-semibold truncate">{note.userName}</div>
                                                                <div className="text-[10px] text-muted-foreground truncate">
                                                                    {roleLabels[note.userRole || ""] || note.userRole?.replace(/_/g, " ")}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Status Badge */}
                                                    <td className="py-2.5 px-3">
                                                        {(note as any).status && (
                                                            <Badge
                                                                className={cn(
                                                                    "text-[9px] h-5 px-1.5 capitalize font-normal border-0 whitespace-nowrap",
                                                                    statusColors[(note as any).status] || "bg-gray-100 text-gray-700"
                                                                )}
                                                            >
                                                                {(note as any).status.replace(/_/g, " ")}
                                                            </Badge>
                                                        )}
                                                    </td>

                                                    {/* Date & Time */}
                                                    <td className="py-2.5 px-3">
                                                        <div className="flex flex-col">
                                                            <span className="text-xs font-medium">{format(new Date(note.createdAt), "dd MMM yyyy")}</span>
                                                            <span className="text-[10px] text-muted-foreground">{format(new Date(note.createdAt), "hh:mm a")}</span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Summary Stats */}
                                <div className="grid grid-cols-3 gap-3 mt-4">
                                    <div className="rounded-lg border p-2.5 bg-card/80 text-center">
                                        <div className="text-lg font-bold text-primary">{notes.length}</div>
                                        <div className="text-[10px] text-muted-foreground font-medium">Total Actions</div>
                                    </div>
                                    <div className="rounded-lg border p-2.5 bg-card/80 text-center">
                                        <div className="text-lg font-bold text-blue-600">{new Set(notes.map(n => n.userName)).size}</div>
                                        <div className="text-[10px] text-muted-foreground font-medium">Users Involved</div>
                                    </div>
                                    <div className="rounded-lg border p-2.5 bg-card/80 text-center">
                                        <div className="text-lg font-bold text-green-600">{new Set(notes.map(n => n.userRole)).size}</div>
                                        <div className="text-[10px] text-muted-foreground font-medium">Roles</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
