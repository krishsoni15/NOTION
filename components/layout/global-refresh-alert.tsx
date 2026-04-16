"use client";

import { useEffect } from "react";

export function GlobalRefreshAlert() {
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            // Only prevent refresh on smaller screens (phones/tablets) where accidental pull-to-refresh is common
            // Limit set to 1200px as requested
            if (window.innerWidth < 1200) {
                e.preventDefault();
                e.returnValue = "";
                return "";
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, []);

    return null;
}
