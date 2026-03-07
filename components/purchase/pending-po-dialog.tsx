"use client";

/**
 * Pending PO View — mirrors the main requests page layout exactly.
 * Layout: Back btn → Search → View Toggle → Filter → Create PO → Pagination → Card/Table → Pagination
 */

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { toast } from "sonner";
import {
    Clock,
    Building2,
    Package,
    Hash,
    CalendarDays,
    Eye,
    Zap,
    Search,
    X,
    RefreshCw,
    MessageSquare,
    ChevronDown,
    CalendarCheck,
    Layers,
    ArrowLeft,
    MapPin,
    ChevronRight,
    Calendar as CalendarIcon,
    LayoutGrid,
    Filter,
    Check,
    Table2,
    IndianRupee,
    CalendarRange,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { useViewMode } from "@/hooks/use-view-mode";

/* ─────────────── helpers ─────────────── */
function fmtDate(ts: number | undefined | null): string {
    if (!ts) return "—";
    return format(new Date(ts), "dd MMM yy");
}

function getDaysLeft(ts: number | undefined | null): number | null {
    if (!ts) return null;
    return Math.ceil((ts - Date.now()) / 86400000);
}

function ExpiryPill({ ts }: { ts?: number | null }) {
    const d = getDaysLeft(ts);
    if (d === null) return null;
    if (d < 0) return <span className="block text-[10px] font-medium text-red-500">• {Math.abs(d)}d overdue</span>;
    if (d === 0) return <span className="block text-[10px] font-medium text-orange-500">• Due today</span>;
    if (d <= 7) return <span className="block text-[10px] font-medium text-orange-400">• {d}d left</span>;
    return <span className="block text-[10px] font-medium text-emerald-500">• {d}d left</span>;
}

function EditableDate({
    value,
    onChange,
    placeholder,
    icon: Icon,
}: {
    value: number | undefined | null;
    onChange: (ts: number) => void;
    placeholder: string;
    icon?: React.ElementType;
}) {
    const dateStr = value ? new Date(value).toISOString().split("T")[0] : "";
    const Ic = Icon ?? CalendarIcon;
    return (
        <label className="group relative inline-flex items-center gap-1.5 cursor-pointer select-none">
            <Ic className="h-3 w-3 text-muted-foreground group-hover:text-blue-400 transition-colors shrink-0" />
            <span className={cn("text-xs font-medium transition-colors group-hover:text-blue-400", value ? "text-foreground" : "text-muted-foreground italic")}>
                {value ? fmtDate(value) : placeholder}
            </span>
            <input
                type="date"
                value={dateStr}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    if (e.target.value) onChange(new Date(e.target.value).getTime());
                }}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
        </label>
    );
}

function formatCurrency(amount: number) {
    if (!amount) return "—";
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
    }).format(amount);
}

function EditableTalk({
    dateValue,
    textValue,
    onDateChange,
    onTextChange,
}: {
    dateValue: number | undefined | null;
    textValue: string | undefined | null;
    onDateChange: (ts: number | null) => void;
    onTextChange: (text: string) => void;
}) {
    const dateStr = dateValue ? new Date(dateValue).toISOString().split("T")[0] : "";
    const [localText, setLocalText] = useState(textValue || "");
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        setLocalText(textValue || "");
    }, [textValue]);

    return (
        <div className="flex flex-col gap-1.5 min-w-[140px] w-full">
            <div className="flex items-center gap-1.5 mb-0.5">
                <label className="group relative inline-flex items-center gap-1.5 cursor-pointer select-none">
                    <CalendarIcon className="h-3 w-3 text-muted-foreground group-hover:text-blue-400 transition-colors shrink-0" />
                    <span className={cn("text-[11px] font-medium transition-colors group-hover:text-blue-400", dateValue ? "text-foreground" : "text-muted-foreground italic")}>
                        {dateValue ? fmtDate(dateValue) : "Set date"}
                    </span>
                    <input
                        type="date"
                        value={dateStr}
                        onChange={(e) => {
                            if (e.target.value) {
                                onDateChange(new Date(e.target.value).getTime());
                            } else {
                                onDateChange(null);
                            }
                        }}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                </label>
                {dateValue && (
                    <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDateChange(null); }}
                        className="text-muted-foreground hover:text-red-500 rounded p-0.5 z-10"
                        title="Clear date"
                    >
                        <X className="h-3 w-3" />
                    </button>
                )}
            </div>
            <div className="flex items-start w-full mt-1">
                {isEditing ? (
                    <textarea
                        autoFocus
                        value={localText}
                        onChange={(e) => setLocalText(e.target.value)}
                        onBlur={() => {
                            setIsEditing(false);
                            if (localText !== (textValue || "")) onTextChange(localText);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                setIsEditing(false);
                                if (localText !== (textValue || "")) onTextChange(localText);
                            }
                        }}
                        className="min-h-[60px] text-[11px] px-2 py-1.5 w-full rounded-md border border-input bg-transparent shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
                        placeholder="Write notes here..."
                    />
                ) : (
                    <div
                        onClick={() => setIsEditing(true)}
                        className={cn("text-[11px] cursor-text min-h-[24px] w-full rounded px-1.5 py-0.5 border border-transparent hover:border-border hover:bg-muted/50 transition-colors empty:before:content-['Write_anything...'] empty:before:text-muted-foreground/50 line-clamp-2", !localText && "italic")}
                    >
                        {localText}
                    </div>
                )}
            </div>
        </div>
    );
}

/* ─────────────── Props ─────────────── */
interface PendingPOViewProps {
    onBack: () => void;
    onViewPO: (poNumber: string, requestId: string) => void;
    onCreateDirectPO: () => void;
}

/* ─────────────── Main Component ─────────────── */
export function PendingPODialog({ onBack, onViewPO, onCreateDirectPO }: PendingPOViewProps) {
    const allRequests = useQuery(api.requests.getPurchaseRequestsByStatus, {});
    const vendors = useQuery(api.vendors.getAllVendors);
    const allPOs = useQuery(api.purchaseOrders.getAllPurchaseOrders);
    const updateLastTalkDate = useMutation(api.requests.updateLastTalkDate);
    const updateLastTalkText = useMutation(api.requests.updateLastTalkText);
    const updateCommittedDate = useMutation(api.requests.updateCommittedDate);

    const { viewMode, toggleViewMode } = useViewMode();
    const [search, setSearch] = useState("");
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    const [filterSite, setFilterSite] = useState<string[]>([]);
    const [timeFilter, setTimeFilter] = useState("all");

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
        setIsHydrated(true);
        const saved = localStorage.getItem("pendingPOPageSize");
        if (saved) setPageSize(Number(saved));
    }, []);

    useEffect(() => {
        if (isHydrated) localStorage.setItem("pendingPOPageSize", pageSize.toString());
    }, [pageSize, isHydrated]);

    useEffect(() => { setCurrentPage(1); }, [search, filterSite.length]);

    /* PO expiry map: requestId → validTill */
    const poExpiryMap = useMemo(() => {
        const map = new Map<string, number>();
        if (!allPOs) return map;
        for (const po of allPOs) {
            if (po.requestId && po.validTill) {
                const existing = map.get(po.requestId as string);
                if (!existing || po.validTill > existing) map.set(po.requestId as string, po.validTill);
            }
        }
        return map;
    }, [allPOs]);

    /* Pending items */
    const pendingItems = useMemo(
        () => (allRequests ?? []).filter((r) => r.status === "pending_po"),
        [allRequests]
    );

    /* Unique sites for filter */
    const allSites = useMemo(() => {
        const map = new Map<string, string>();
        pendingItems.forEach((r) => {
            if (r.site?._id && r.site?.name) map.set(r.site._id, r.site.name);
        });
        return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
    }, [pendingItems]);

    /* Group by poNumber / requestNumber */
    const groups = useMemo(() => {
        const map = new Map<string, typeof pendingItems>();
        pendingItems.forEach((r) => {
            const key = r.poNumber ?? r.requestNumber;
            const arr = map.get(key) || [];
            arr.push(r);
            map.set(key, arr);
        });
        return Array.from(map.entries())
            .map(([key, items]) => {
                const poNumber = items[0]?.poNumber ?? null;
                let totalAmount = 0;

                // 1. Calculate from vendor quotes (preferred for pending PO items)
                items.forEach((item) => {
                    const quote = (item as any).vendorQuotes?.find((q: any) => q.vendorId === (item as any).selectedVendorId);
                    if (quote && quote.amount) {
                        totalAmount += quote.amount;
                    } else if (item.quantity && quote?.unitPrice) {
                        totalAmount += item.quantity * quote.unitPrice;
                    }
                });

                // 2. Fallback to extracting from allPOs if a PO number exists but no quotes amount
                if (totalAmount === 0 && poNumber && allPOs) {
                    const poRecords = allPOs.filter((p) => p.poNumber === poNumber);
                    totalAmount = poRecords.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
                }
                return {
                    key,
                    poNumber,
                    requestNumber: items[0]?.requestNumber ?? key,
                    items,
                    firstItem: items[0],
                    site: items[0]?.site,
                    totalAmount,
                };
            })
            .sort((a, b) => {
                const aT = Math.max(...a.items.map((i) => i.updatedAt ?? i.createdAt ?? 0));
                const bT = Math.max(...b.items.map((i) => i.updatedAt ?? i.createdAt ?? 0));
                return bT - aT;
            });
    }, [pendingItems]);

    /* Filtered */
    const filtered = useMemo(() => {
        let result = groups;
        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter(
                (g) =>
                    g.poNumber?.toLowerCase().includes(q) ||
                    g.requestNumber?.toLowerCase().includes(q) ||
                    g.site?.name?.toLowerCase().includes(q) ||
                    g.items.some((i) => i.itemName.toLowerCase().includes(q))
            );
        }
        if (filterSite.length > 0) {
            result = result.filter((g) => filterSite.includes(g.site?._id ?? ""));
        }
        if (timeFilter !== "all") {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const nextDay = new Date(tomorrow);
            nextDay.setDate(nextDay.getDate() + 1);

            const lastWeek = new Date(today);
            lastWeek.setDate(lastWeek.getDate() - 7);

            const lastMonth = new Date(today);
            lastMonth.setMonth(lastMonth.getMonth() - 1);

            result = result.filter((g) => {
                const created = g.firstItem.createdAt;
                const poExpiry = poExpiryMap.get(g.firstItem._id as string);
                const committed = (g.firstItem as any)?.committedDate;

                const matchesDate = (ts: number | undefined | null, start: Date, end: Date) => {
                    if (!ts) return false;
                    const d = new Date(ts);
                    return d >= start && d < end;
                };

                const matchesPastDate = (ts: number | undefined | null, start: Date) => {
                    if (!ts) return false;
                    const d = new Date(ts);
                    return d >= start;
                };

                if (timeFilter === "today") {
                    return matchesPastDate(created, today) || matchesDate(committed, today, tomorrow) || matchesDate(poExpiry, today, tomorrow);
                }
                if (timeFilter === "tomorrow") {
                    return matchesDate(committed, tomorrow, nextDay) || matchesDate(poExpiry, tomorrow, nextDay);
                }
                if (timeFilter === "last_week") {
                    return matchesPastDate(created, lastWeek);
                }
                if (timeFilter === "last_month") {
                    return matchesPastDate(created, lastMonth);
                }
                return true;
            });
        }
        return result;
    }, [groups, search, filterSite, timeFilter, poExpiryMap]);

    /* Pagination */
    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const toggleExpand = (key: string) => {
        setExpandedGroups((prev) => {
            const next = new Set(prev);
            next.has(key) ? next.delete(key) : next.add(key);
            return next;
        });
    };

    const handleSetLastTalk = async (requestId: Id<"requests">, ts: number | null) => {
        try {
            await updateLastTalkDate({ requestId, lastTalkDate: ts });
            toast.success("Last talk date updated");
        } catch {
            toast.error("Failed to update");
        }
    };

    const handleSetLastTalkText = async (requestId: Id<"requests">, text: string) => {
        try {
            await updateLastTalkText({ requestId, lastTalkText: text });
            toast.success("Last talk notes updated");
        } catch {
            toast.error("Failed to update notes");
        }
    };

    const handleSetCommitted = async (requestId: Id<"requests">, ts: number) => {
        try {
            await updateCommittedDate({ requestId, committedDate: ts });
            toast.success("Committed date updated");
        } catch {
            toast.error("Failed to update");
        }
    };

    const getVendorName = (item: any) =>
        vendors?.find((v) => v._id === item?.selectedVendorId)?.companyName ?? null;
    const getVendorContact = (item: any) =>
        vendors?.find((v) => v._id === item?.selectedVendorId)?.contactName ?? null;

    /* ── Render ── */
    return (
        <div className="space-y-4">

            {/* ── Row 1: Search + View Toggle ── */}
            <div className="flex gap-2">
                <div className="relative flex-1 min-w-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by PO number, item, or site..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className={`pl-9 pr-9 h-9 sm:h-10 text-base w-full ${search.trim() ? "ring-2 ring-blue-500/50 border-blue-500" : ""}`}
                    />
                    {search && (
                        <Button variant="ghost" size="sm" onClick={() => setSearch("")} className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-muted">
                            <X className="h-3 w-3" />
                        </Button>
                    )}
                </div>

                <Button variant="outline" size="icon" onClick={toggleViewMode} className="h-9 sm:h-10 w-9 sm:w-10 flex-shrink-0" title={`Switch to ${viewMode === "card" ? "table" : "card"} view`}>
                    {viewMode === "card" ? <Table2 className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
                </Button>
            </div>

            {/* ── Row 2: Filter + Create PO ── */}
            <div className="flex gap-2 items-center">
                {/* Time filter */}
                <div className="flex-1 sm:flex-none sm:w-[150px]">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-between h-9 sm:h-10">
                                {timeFilter === "all" ? "All Time" : timeFilter === "today" ? "Today" : timeFilter === "tomorrow" ? "Tomorrow" : timeFilter === "last_week" ? "Last 7 Days" : "Last 30 Days"}
                                <CalendarRange className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[180px] p-0" align="start">
                            <Command>
                                <CommandList>
                                    <CommandGroup>
                                        <CommandItem onSelect={() => setTimeFilter("all")} className="font-medium">
                                            <div className={cn("mr-2 flex h-4 w-4 items-center justify-center rounded-sm border", timeFilter === "all" ? "bg-primary text-primary-foreground border-primary" : "opacity-50 [&_svg]:invisible")}>
                                                <Check className="h-4 w-4" />
                                            </div>
                                            All Time
                                        </CommandItem>
                                        <CommandItem onSelect={() => setTimeFilter("today")}>
                                            <div className={cn("mr-2 flex h-4 w-4 items-center justify-center rounded-sm border", timeFilter === "today" ? "bg-primary text-primary-foreground border-primary" : "opacity-50 [&_svg]:invisible")}>
                                                <Check className="h-4 w-4" />
                                            </div>
                                            Today
                                        </CommandItem>
                                        <CommandItem onSelect={() => setTimeFilter("tomorrow")}>
                                            <div className={cn("mr-2 flex h-4 w-4 items-center justify-center rounded-sm border", timeFilter === "tomorrow" ? "bg-primary text-primary-foreground border-primary" : "opacity-50 [&_svg]:invisible")}>
                                                <Check className="h-4 w-4" />
                                            </div>
                                            Tomorrow
                                        </CommandItem>
                                        <CommandItem onSelect={() => setTimeFilter("last_week")}>
                                            <div className={cn("mr-2 flex h-4 w-4 items-center justify-center rounded-sm border", timeFilter === "last_week" ? "bg-primary text-primary-foreground border-primary" : "opacity-50 [&_svg]:invisible")}>
                                                <Check className="h-4 w-4" />
                                            </div>
                                            Last 7 Days
                                        </CommandItem>
                                        <CommandItem onSelect={() => setTimeFilter("last_month")}>
                                            <div className={cn("mr-2 flex h-4 w-4 items-center justify-center rounded-sm border", timeFilter === "last_month" ? "bg-primary text-primary-foreground border-primary" : "opacity-50 [&_svg]:invisible")}>
                                                <Check className="h-4 w-4" />
                                            </div>
                                            Last 30 Days
                                        </CommandItem>
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>
                </div>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={onBack}
                    className="h-9 sm:h-10 gap-1.5 border-muted-foreground/30 text-muted-foreground hover:text-foreground shrink-0"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Requests
                </Button>

                {/* Right side: Create PO */}
                <div className="flex items-center gap-2 ml-auto">
                    <Button
                        onClick={onCreateDirectPO}
                        className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 h-9 sm:h-10"
                    >
                        <Zap className="h-4 w-4 mr-2" />
                        Create Direct PO
                    </Button>
                </div>
            </div>

            {/* ── Loading ── */}
            {allRequests === undefined ? (
                <div className="flex items-center justify-center py-24">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3">
                    <div className="h-16 w-16 rounded-2xl bg-muted/60 flex items-center justify-center">
                        <Clock className="h-8 w-8 text-muted-foreground/40" />
                    </div>
                    <div className="text-center">
                        <p className="font-semibold text-base">No pending POs</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            {search || filterSite.length > 0 ? "Try adjusting your search or filter" : "All purchase orders have been placed"}
                        </p>
                    </div>
                </div>
            ) : (
                <>
                    {/* ── Pagination Top ── */}
                    <div className="mb-3">
                        <PaginationControls
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                            pageSize={pageSize}
                            onPageSizeChange={setPageSize}
                            totalItems={totalItems}
                            pageSizeOptions={[10, 25, 50, 100]}
                            itemCount={paginated.length}
                        />
                    </div>

                    {/* ── Card View ── */}
                    {viewMode === "card" ? (
                        <div className="space-y-4">
                            {paginated.map((group) => {
                                const { key, poNumber, requestNumber, items, firstItem, site } = group;
                                const hasMultiple = items.length > 1;
                                const expanded = expandedGroups.has(key);
                                const totalQty = items.reduce((s, i) => s + i.quantity, 0);
                                const vendorName = getVendorName(firstItem);
                                const vendorContact = getVendorContact(firstItem);
                                const poExpiry = poExpiryMap.get(firstItem._id as string) ?? null;
                                const lastTalkDate = (firstItem as any)?.lastTalkDate ?? null;
                                const committedDate = (firstItem as any)?.committedDate ?? null;

                                return (
                                    <div key={key} className="rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                                        {/* Card Header */}
                                        <div className="flex items-center justify-between px-5 py-3 border-b bg-muted/20">
                                            <div className="flex items-center gap-3">
                                                <div>
                                                    {poNumber ? (
                                                        <span className="font-bold text-base">#{poNumber}</span>
                                                    ) : (
                                                        <span className="text-sm text-muted-foreground italic">No PO #</span>
                                                    )}
                                                    <span className="text-xs text-muted-foreground ml-2">Req #{requestNumber}</span>
                                                </div>
                                                {hasMultiple && (
                                                    <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-[10px] px-2 gap-1">
                                                        <Layers className="h-3 w-3" />{items.length} items
                                                    </Badge>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {poNumber && (
                                                    <Button size="sm" variant="outline" onClick={() => onViewPO(poNumber, firstItem._id)} className="h-7 text-xs px-2.5 gap-1 border-blue-500/30 text-blue-500 hover:bg-blue-500/10 hover:border-blue-500">
                                                        <Eye className="h-3 w-3" /> View PO
                                                    </Button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Card Body — CRM style */}
                                        <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                                            {/* Vendor (Customer) */}
                                            <div className="col-span-2 sm:col-span-1">
                                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1 flex items-center gap-1"><Building2 className="h-3 w-3" />Vendor</p>
                                                {vendorName ? (
                                                    <>
                                                        <p className="text-sm font-semibold">{vendorName}</p>
                                                        {vendorContact && <p className="text-[10px] text-muted-foreground">{vendorContact}</p>}
                                                    </>
                                                ) : <p className="text-xs text-muted-foreground italic">No vendor</p>}
                                            </div>

                                            {/* Source — PO # */}
                                            <div>
                                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1 flex items-center gap-1"><Hash className="h-3 w-3" />Order No</p>
                                                <p className="text-sm font-mono font-medium">{poNumber ? `#${poNumber}` : "—"}</p>
                                                <p className="text-[10px] text-muted-foreground mt-0.5">Req #{requestNumber}</p>
                                            </div>

                                            {/* Since — created date */}
                                            <div>
                                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1 flex items-center gap-1"><Clock className="h-3 w-3" />Order Date</p>
                                                <p className="text-sm font-medium">{fmtDate(firstItem.createdAt)}</p>
                                            </div>

                                            {/* Last Talk */}
                                            <div className="col-span-1 sm:col-span-1 lg:col-span-1">
                                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1 flex items-center gap-1"><MessageSquare className="h-3 w-3" />Last Talk</p>
                                                <EditableTalk dateValue={lastTalkDate} textValue={(firstItem as any)?.lastTalkText} onDateChange={(ts) => handleSetLastTalk(firstItem._id as Id<"requests">, ts)} onTextChange={(txt) => handleSetLastTalkText(firstItem._id as Id<"requests">, txt)} />
                                            </div>

                                            {/* Total Amount */}
                                            <div>
                                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1 flex items-center gap-1"><IndianRupee className="h-3 w-3" />Total Amount</p>
                                                <p className="text-sm font-semibold">{formatCurrency(group.totalAmount)}</p>
                                            </div>
                                        </div>

                                        {/* PO Expiry footer */}
                                        {poExpiry && (
                                            <div className="px-5 py-2 border-t bg-muted/10 flex items-center gap-2">
                                                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                                                <span className="text-xs text-muted-foreground">PO Expires:</span>
                                                <span className="text-xs font-medium">{fmtDate(poExpiry)}</span>
                                                <ExpiryPill ts={poExpiry} />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        /* ── Table View (CRM-style) ── */
                        <div className="rounded-lg border overflow-hidden bg-card">
                            {/* thead */}
                            <div className="grid grid-cols-[1.5fr_120px_120px_250px_130px_100px] bg-muted/40 border-b">
                                {[
                                    { label: "Vendor", icon: Building2 },
                                    { label: "Order No", icon: Hash },
                                    { label: "Order Date", icon: Clock },
                                    { label: "Last Talk", icon: MessageSquare },
                                    { label: "Total Amount", icon: IndianRupee },
                                    { label: "Actions", icon: null },
                                ].map(({ label, icon: Icon }, i) => (
                                    <div key={i} className="px-3 py-2.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-r last:border-r-0">
                                        {Icon && <Icon className="h-3 w-3 shrink-0" />}
                                        {label}
                                    </div>
                                ))}
                            </div>

                            {/* tbody */}
                            <div className="divide-y">
                                {paginated.map((group) => {
                                    const { key, poNumber, requestNumber, items, firstItem } = group;
                                    const vendorName = getVendorName(firstItem);
                                    const vendorContact = getVendorContact(firstItem);
                                    const poExpiry = poExpiryMap.get(firstItem._id as string) ?? null;
                                    const lastTalkDate = (firstItem as any)?.lastTalkDate ?? null;
                                    const committedDate = (firstItem as any)?.committedDate ?? null;
                                    const poc = (firstItem as any)?.creator?.fullName ?? "—";

                                    return (
                                        <div key={key} className="group hover:bg-muted/20 transition-colors border-b last:border-0 border-border">
                                            <div className="grid grid-cols-[1.5fr_120px_120px_250px_130px_100px] items-center min-h-[64px]">

                                                {/* Vendor */}
                                                <div className="px-3 py-2.5 border-r h-full flex flex-col justify-center min-w-0">
                                                    {vendorName ? (
                                                        <>
                                                            <p className="text-sm font-semibold truncate">{vendorName}</p>
                                                            {vendorContact && <p className="text-[10px] text-muted-foreground truncate">{vendorContact}</p>}
                                                        </>
                                                    ) : <span className="text-xs text-muted-foreground italic">No vendor</span>}
                                                    {items.length > 1 && (
                                                        <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-[9px] px-1.5 py-0 mt-1 gap-0.5 w-fit">
                                                            <Layers className="h-2.5 w-2.5" />{items.length} items
                                                        </Badge>
                                                    )}
                                                </div>

                                                {/* Source — PO # */}
                                                <div className="px-3 py-2.5 border-r h-full flex flex-col justify-center">
                                                    <p className="text-[13px] font-mono font-medium">{poNumber ? `#${poNumber}` : "—"}</p>
                                                    <p className="text-[10px] text-muted-foreground mt-0.5">Req #{requestNumber}</p>
                                                </div>

                                                {/* Since — created date */}
                                                <div className="px-3 py-2.5 border-r h-full flex flex-col justify-center">
                                                    <span className="text-[13px] font-medium">{fmtDate(firstItem?.createdAt)}</span>
                                                </div>

                                                {/* Last Talk */}
                                                <div className="px-3 py-2.5 border-r h-full flex items-start">
                                                    <EditableTalk dateValue={lastTalkDate} textValue={(firstItem as any)?.lastTalkText} onDateChange={(ts) => handleSetLastTalk(firstItem._id as Id<"requests">, ts)} onTextChange={(txt) => handleSetLastTalkText(firstItem._id as Id<"requests">, txt)} />
                                                </div>

                                                {/* Total Amount */}
                                                <div className="px-3 py-2.5 border-r h-full flex flex-col justify-center">
                                                    <span className="text-sm font-semibold">{formatCurrency(group.totalAmount)}</span>
                                                </div>

                                                {/* Actions */}
                                                <div className="px-3 py-2.5 h-full flex items-center">
                                                    {poNumber && (
                                                        <Button size="sm" variant="outline" onClick={() => onViewPO(poNumber, firstItem._id)} className="h-7 text-xs px-2.5 gap-1 border-blue-500/30 text-blue-500 hover:bg-blue-500/10 hover:border-blue-500 w-full">
                                                            <Eye className="h-3 w-3" /> View
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* tfoot */}
                            <div className="px-4 py-2.5 border-t bg-muted/20 flex items-center">
                                <p className="text-xs text-muted-foreground">
                                    <span className="font-semibold text-foreground">{filtered.length}</span> PO group{filtered.length !== 1 ? "s" : ""}
                                    {" · "}
                                    <span className="font-semibold text-foreground">{pendingItems.length}</span> total item{pendingItems.length !== 1 ? "s" : ""}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* ── Pagination Bottom ── */}
                    <div className="mt-4 border-t pt-4">
                        <PaginationControls
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                            pageSize={pageSize}
                            onPageSizeChange={setPageSize}
                            totalItems={totalItems}
                            pageSizeOptions={[10, 25, 50, 100]}
                            itemCount={paginated.length}
                        />
                    </div>
                </>
            )}
        </div>
    );
}
