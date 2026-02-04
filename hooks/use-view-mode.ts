"use client";

import { useState, useEffect } from "react";

type ViewMode = "card" | "table";

export function useViewMode(storageKey: string = "requests-view-mode") {
    // Default to table for desktop perception, but we'll check storage/viewport immediately
    const [viewMode, setViewMode] = useState<ViewMode>("table");
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        // 1. Check local storage first
        const savedMode = localStorage.getItem(storageKey) as ViewMode | null;

        // 2. Check viewport
        // User requested 1200px breakpoint for card layout
        const isSmallScreen = window.innerWidth < 1200;

        let initialMode: ViewMode;
        if (savedMode && (savedMode === "card" || savedMode === "table")) {
            // Use saved preference if valid
            initialMode = savedMode;
        } else {
            // Default behavior based on screen size
            initialMode = isSmallScreen ? "card" : "table";
        }

        setViewMode(initialMode);
        setIsInitialized(true);
    }, [storageKey]);

    const toggleViewMode = () => {
        const newMode = viewMode === "card" ? "table" : "card";
        setViewMode(newMode);
        localStorage.setItem(storageKey, newMode);
    };

    return { viewMode, toggleViewMode, isInitialized };
}
