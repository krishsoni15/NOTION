/**
 * Theme Helper Functions
 * 
 * Utilities for managing brand themes (not light/dark mode).
 * Light/dark mode is handled by next-themes.
 * 
 * Brand themes are applied via CSS classes on the <html> element.
 */

export type BrandTheme = "notion" | "ocean" | "forest" | "purple" | "dark" | "red" | "blossom" | "slate" | "amber"; // Professional CRM themes

const THEME_STORAGE_KEY = "brand-theme";
const DEFAULT_THEME: BrandTheme = "notion";

export const THEME_LABELS: Record<BrandTheme, string> = {
  notion: "Notion Blue",
  ocean: "Ocean Teal",
  forest: "Forest Green",
  purple: "Royal Purple",
  dark: "Midnight",
  red: "Crimson Red",
  blossom: "Elegant Rose",
  slate: "Slate Professional",
  amber: "Amber Gold",
};

export const THEME_COLORS: Record<BrandTheme, { primary: string; accent: string; description: string }> = {
  notion: {
    primary: "#1F4E79",
    accent: "#F28C28",
    description: "Classic blue with orange accents"
  },
  ocean: {
    primary: "#0891B2",
    accent: "#06B6D4",
    description: "Refreshing teal and cyan tones"
  },
  forest: {
    primary: "#059669",
    accent: "#10B981",
    description: "Professional green palette"
  },
  purple: {
    primary: "#7C3AED",
    accent: "#A78BFA",
    description: "Modern purple aesthetic"
  },
  dark: {
    primary: "#1F2937",
    accent: "#6B7280",
    description: "Black and grey midnight theme"
  },
  red: {
    primary: "#DC2626",
    accent: "#EF4444",
    description: "Bold crimson red theme"
  },
  blossom: {
    primary: "#BE185D",
    accent: "#F472B6",
    description: "Chic and professional rose aesthetic"
  },
  slate: {
    primary: "#475569",
    accent: "#94A3B8",
    description: "Classy and masculine slate theme"
  },
  amber: {
    primary: "#D97706",
    accent: "#FBBF24",
    description: "Warm and luxurious gold theme"
  },
};

/**
 * Set the brand theme
 * 
 * @param themeName - The name of the theme (e.g., 'notion', 'corporate')
 * 
 * @example
 * setBrandTheme('notion')
 * setBrandTheme('corporate')
 */
export function setBrandTheme(themeName: BrandTheme): void {
  if (typeof window === "undefined") return;

  const html = document.documentElement;

  // Remove all theme classes
  html.classList.remove(
    "theme-notion",
    "theme-ocean",
    "theme-forest",
    "theme-purple",
    "theme-dark",
    "theme-red",
    "theme-blossom",
    "theme-slate",
    "theme-amber"
  );

  // Add the new theme class
  html.classList.add(`theme-${themeName}`);

  // Persist to localStorage
  localStorage.setItem(THEME_STORAGE_KEY, themeName);
}

/**
 * Get the current brand theme
 * 
 * @returns The current brand theme name
 */
export function getCurrentTheme(): BrandTheme {
  if (typeof window === "undefined") return DEFAULT_THEME;

  // Check localStorage first
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  if (stored && (stored === "notion" || stored === "ocean" || stored === "forest" || stored === "purple" || stored === "dark" || stored === "red" || stored === "blossom" || stored === "slate" || stored === "amber")) {
    return stored as BrandTheme;
  }

  // Check HTML class
  const html = document.documentElement;
  for (const className of html.classList) {
    if (className.startsWith("theme-")) {
      const themeName = className.replace("theme-", "") as BrandTheme;
      return themeName;
    }
  }

  // Default fallback
  return DEFAULT_THEME;
}

/**
 * Initialize theme on mount
 * 
 * Call this in a useEffect or in your root layout to ensure
 * the theme is applied on page load.
 */
export function initializeTheme(): void {
  if (typeof window === "undefined") return;

  const theme = getCurrentTheme();
  setBrandTheme(theme);
}

