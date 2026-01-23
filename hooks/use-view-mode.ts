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

        // 2. Check viewport if no saved preference
        const isMobile = window.innerWidth < 768;

        let initialMode: ViewMode;
        if (savedMode && (savedMode === "card" || savedMode === "table")) {
            // Use saved preference if valid
            // However, if it's mobile, we might want to prioritize card view for usability
            // User said "on phone it will be automaticly card"
            if (isMobile) {
                initialMode = "card";
            } else {
                initialMode = savedMode;
            }
        } else {
            // Default behavior
            initialMode = isMobile ? "card" : "table";
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
