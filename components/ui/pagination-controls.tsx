"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface PaginationControlsProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    pageSize: number;
    onPageSizeChange: (size: number) => void;
    totalItems: number;
    pageSizeOptions?: number[];
    itemCount?: number;
}

export function PaginationControls({
    currentPage,
    totalPages,
    onPageChange,
    pageSize,
    onPageSizeChange,
    totalItems,
    pageSizeOptions = [10, 25, 50, 100],
    itemCount,
}: PaginationControlsProps) {
    if (totalItems === 0) return null;

    return (
        <div className="flex flex-col gap-4 py-3 pb-8 sm:pb-2 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Mobile View (< 640px) - App-like Feel */}
            {/* Mobile View (< 640px) - Smart Horizontal Row */}
            <div className="sm:hidden flex flex-col gap-2 w-full px-1">
                <div className="flex items-center justify-between gap-1 w-full">
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 shrink-0 rounded-full shadow-sm"
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage <= 1}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>

                    <div className="flex items-center justify-center gap-1 flex-1">
                        {(() => {
                            // Smart mobile pagination logic
                            const mobileItems = [];
                            const maxVisible = 5; // How many items to show in the scrolling area (excluding arrows)

                            // Always show page 1
                            mobileItems.push(
                                <Button
                                    key={1}
                                    variant={currentPage === 1 ? "default" : "ghost"}
                                    size="sm"
                                    className={`h-8 w-8 p-0 rounded-full text-xs ${currentPage === 1 ? "shadow-md" : ""}`}
                                    onClick={() => onPageChange(1)}
                                >
                                    1
                                </Button>
                            );

                            if (totalPages <= 7) {
                                // Show all pages if few
                                for (let i = 2; i <= totalPages; i++) {
                                    mobileItems.push(
                                        <Button
                                            key={i}
                                            variant={currentPage === i ? "default" : "ghost"}
                                            size="sm"
                                            className={`h-8 w-8 p-0 rounded-full text-xs ${currentPage === i ? "shadow-md" : ""}`}
                                            onClick={() => onPageChange(i)}
                                        >
                                            {i}
                                        </Button>
                                    );
                                }
                            } else {
                                // Complex logic for many pages
                                // Start Case: 1 2 3 4 5 ... 10
                                if (currentPage <= 4) {
                                    for (let i = 2; i <= 5; i++) {
                                        mobileItems.push(
                                            <Button key={i} variant={currentPage === i ? "default" : "ghost"} size="sm" className={`h-8 w-8 p-0 rounded-full text-xs ${currentPage === i ? "shadow-md" : ""}`} onClick={() => onPageChange(i)}>{i}</Button>
                                        );
                                    }
                                    mobileItems.push(<span key="end-ellipsis" className="text-muted-foreground text-xs px-1">...</span>);
                                    mobileItems.push(
                                        <Button key={totalPages} variant={currentPage === totalPages ? "default" : "ghost"} size="sm" className={`h-8 w-8 p-0 rounded-full text-xs ${currentPage === totalPages ? "shadow-md" : ""}`} onClick={() => onPageChange(totalPages)}>{totalPages}</Button>
                                    );
                                }
                                // End Case: 1 ... 6 7 8 9 10
                                else if (currentPage >= totalPages - 3) {
                                    mobileItems.push(<span key="start-ellipsis" className="text-muted-foreground text-xs px-1">...</span>);
                                    for (let i = totalPages - 4; i <= totalPages; i++) {
                                        mobileItems.push(
                                            <Button key={i} variant={currentPage === i ? "default" : "ghost"} size="sm" className={`h-8 w-8 p-0 rounded-full text-xs ${currentPage === i ? "shadow-md" : ""}`} onClick={() => onPageChange(i)}>{i}</Button>
                                        );
                                    }
                                }
                                // Middle Case: 1 ... 4 5 6 ... 10
                                else {
                                    mobileItems.push(<span key="start-ellipsis" className="text-muted-foreground text-xs px-1">...</span>);
                                    for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                                        mobileItems.push(
                                            <Button key={i} variant={currentPage === i ? "default" : "ghost"} size="sm" className={`h-8 w-8 p-0 rounded-full text-xs ${currentPage === i ? "shadow-md" : ""}`} onClick={() => onPageChange(i)}>{i}</Button>
                                        );
                                    }
                                    mobileItems.push(<span key="end-ellipsis" className="text-muted-foreground text-xs px-1">...</span>);
                                    mobileItems.push(
                                        <Button key={totalPages} variant={currentPage === totalPages ? "default" : "ghost"} size="sm" className={`h-8 w-8 p-0 rounded-full text-xs ${currentPage === totalPages ? "shadow-md" : ""}`} onClick={() => onPageChange(totalPages)}>{totalPages}</Button>
                                    );
                                }
                            }

                            return mobileItems;
                        })()}
                    </div>

                    <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 shrink-0 rounded-full shadow-sm"
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage >= totalPages}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Mobile Page Size Selector - Polished */}
            <div className="sm:hidden flex items-center justify-center gap-3">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Rows / Page</span>
                <Select
                    value={pageSize.toString()}
                    onValueChange={(value) => onPageSizeChange(Number(value))}
                >
                    <SelectTrigger className="h-7 w-[60px] text-xs px-2 bg-background border-input/60">
                        <SelectValue placeholder={pageSize.toString()} />
                    </SelectTrigger>
                    <SelectContent side="top" align="center">
                        {pageSizeOptions.map((option) => (
                            <SelectItem key={option} value={option.toString()}>
                                {option}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Desktop View (>= 640px) - Traditional Layout */}
            <div className="hidden sm:flex items-center justify-between gap-4 w-full">
                <div className="flex items-center gap-3 text-sm text-muted-foreground whitespace-nowrap">
                    <div className="flex items-center gap-2">
                        <span className="font-medium text-xs uppercase tracking-wide opacity-80">Show</span>
                        <Select
                            value={pageSize.toString()}
                            onValueChange={(value) => onPageSizeChange(Number(value))}
                        >
                            <SelectTrigger className="h-8 w-[75px] bg-background border-input/60 shadow-sm">
                                <SelectValue placeholder={pageSize.toString()} />
                            </SelectTrigger>
                            <SelectContent side="top">
                                {pageSizeOptions.map((option) => (
                                    <SelectItem key={option} value={option.toString()}>
                                        {option}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="w-px h-4 bg-border/60 mx-1"></div>
                    <span className="inline-block px-2 py-0.5 bg-muted/50 rounded-md text-xs font-medium border border-border/50">
                        {totalItems} Requests {itemCount !== undefined && <span className="opacity-70 font-normal">({itemCount} items)</span>}
                    </span>
                </div>

                <div className="flex items-center gap-1">
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-md"
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage <= 1}
                        title="Previous Page"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>

                    <div className="flex items-center gap-1 mx-2">
                        {(() => {
                            const desktopItems = [];

                            // Helper to render a page button
                            const renderPageBtn = (page: number) => (
                                <Button
                                    key={page}
                                    variant={currentPage === page ? "default" : "ghost"}
                                    size="sm"
                                    className={`h-8 w-8 p-0 rounded-md text-sm font-medium ${currentPage === page ? "shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                                    onClick={() => onPageChange(page)}
                                >
                                    {page}
                                </Button>
                            );

                            const renderEllipsis = (key: string) => (
                                <span key={key} className="flex h-8 w-4 items-center justify-center text-muted-foreground text-xs">
                                    ...
                                </span>
                            );

                            if (totalPages <= 7) {
                                // Show all pages
                                for (let i = 1; i <= totalPages; i++) {
                                    desktopItems.push(renderPageBtn(i));
                                }
                            } else {
                                // Dynamic ranges
                                if (currentPage <= 4) {
                                    // Start: 1 2 3 4 5 ... 10
                                    for (let i = 1; i <= 5; i++) {
                                        desktopItems.push(renderPageBtn(i));
                                    }
                                    desktopItems.push(renderEllipsis("end-dots"));
                                    desktopItems.push(renderPageBtn(totalPages));
                                } else if (currentPage >= totalPages - 3) {
                                    // End: 1 ... 6 7 8 9 10
                                    desktopItems.push(renderPageBtn(1));
                                    desktopItems.push(renderEllipsis("start-dots"));
                                    for (let i = totalPages - 4; i <= totalPages; i++) {
                                        desktopItems.push(renderPageBtn(i));
                                    }
                                } else {
                                    // Middle: 1 ... 4 5 6 ... 10
                                    desktopItems.push(renderPageBtn(1));
                                    desktopItems.push(renderEllipsis("start-dots"));
                                    for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                                        desktopItems.push(renderPageBtn(i));
                                    }
                                    desktopItems.push(renderEllipsis("end-dots"));
                                    desktopItems.push(renderPageBtn(totalPages));
                                }
                            }
                            return desktopItems;
                        })()}
                    </div>

                    <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-md"
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage >= totalPages}
                        title="Next Page"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
