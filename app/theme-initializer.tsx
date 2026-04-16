"use client";

import { useEffect } from "react";
import { initializeTheme } from "@/lib/theme";

/**
 * Theme Initializer
 * 
 * Initializes the brand theme on mount.
 * This ensures the theme is applied immediately on page load,
 * preventing any flash of unstyled content.
 */
export function ThemeInitializer() {
  useEffect(() => {
    initializeTheme();
  }, []);

  return null;
}

