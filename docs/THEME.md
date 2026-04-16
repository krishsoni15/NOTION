# 🎨 Theming System Documentation

## Overview

This project uses a **dual-layer theming system** that separates **mode** (light/dark) from **brand theme** (color scheme). This architecture allows for unlimited brand themes without refactoring.

## Architecture

### Two-Layer System

1. **Mode Layer** (Light/Dark)
   - Controlled by `next-themes`
   - Applied via `.dark` class on `<html>`
   - User can toggle via `ThemeToggle` component

2. **Brand Theme Layer** (Notion, Corporate, etc.)
   - Controlled by CSS classes
   - Applied via `.theme-{name}` class on `<html>`
   - Switched programmatically via `setBrandTheme()`

### HTML Structure

```html
<!-- Light mode, Notion theme -->
<html class="light theme-notion">

<!-- Dark mode, Notion theme -->
<html class="dark theme-notion">

<!-- Light mode, Corporate theme (future) -->
<html class="light theme-corporate">
```

## Color System

### Color Rules

- **Blue (`--primary`)**: Navigation & primary actions
- **Orange (`--accent`)**: Actions only (buttons, highlights)
- **No hardcoded colors**: All colors must use CSS variables

### Theme: NOTION

#### Light Mode
- Background: `#F7F9FC`
- Surface/Card: `#FFFFFF`
- Primary (Blue): `#1F4E79`
- Accent (Orange): `#F28C28`
- Text Primary: `#0F172A`
- Text Secondary: `#475569`
- Border: `#E2E8F0`

#### Dark Mode
- Background: `#0B1220`
- Surface/Card: `#111827`
- Primary (Blue): `#3B82F6`
- Accent (Orange): `#FB923C`
- Text Primary: `#E5E7EB`
- Text Secondary: `#9CA3AF`
- Border: `#1F2933`

## File Structure

```
/styles
  themes.css        → All brand theme color variables
  globals.css       → Base styles + Tailwind setup

/components
  theme-toggle.tsx  → Light/dark mode toggle only

/lib
  theme.ts          → Helper functions for brand theme switching

/docs
  THEME.md          → This documentation
```

## Usage

### Toggling Light/Dark Mode

```tsx
import { ThemeToggle } from "@/components/theme-toggle";

// In your component
<ThemeToggle />
```

### Switching Brand Theme

```tsx
import { setBrandTheme, getCurrentTheme } from "@/lib/theme";

// Set theme
setBrandTheme('notion');
setBrandTheme('corporate');

// Get current theme
const currentTheme = getCurrentTheme();
```

### Using Colors in Components

**✅ DO:**
```tsx
<div className="bg-primary text-primary-foreground">
<div className="bg-accent text-accent-foreground">
<div className="text-foreground bg-background">
```

**❌ DON'T:**
```tsx
<div className="bg-[#1F4E79]">  // Hardcoded color
<div style={{ color: '#F28C28' }}>  // Inline style
```

### Initializing Theme

In your root layout or a client component:

```tsx
"use client";
import { useEffect } from "react";
import { initializeTheme } from "@/lib/theme";

export function ThemeInitializer() {
  useEffect(() => {
    initializeTheme();
  }, []);
  
  return null;
}
```

## Adding a New Brand Theme

### Step 1: Define Colors in `styles/themes.css`

```css
/* Light Mode */
.theme-your-theme {
  --background: #FFFFFF;
  --primary: #000000;
  --accent: #FF0000;
  /* ... all other variables */
}

/* Dark Mode */
.dark.theme-your-theme {
  --background: #000000;
  --primary: #FFFFFF;
  --accent: #FF6B6B;
  /* ... all other variables */
}
```

### Step 2: Update TypeScript Types

In `lib/theme.ts`:

```typescript
export type BrandTheme = "notion" | "corporate" | "your-theme";

// Update setBrandTheme() to include your theme:
html.classList.remove(
  "theme-notion",
  "theme-corporate",
  "theme-your-theme"  // Add here
);
```

### Step 3: Use Your Theme

```tsx
setBrandTheme('your-theme');
```

That's it! No component changes needed. All components automatically use the new theme colors via CSS variables.

## Best Practices

### ✅ DO

- Always use CSS variables for colors
- Use semantic color names (`primary`, `accent`, `foreground`)
- Test both light and dark modes
- Keep transitions smooth (200ms max)
- Document new themes

### ❌ DON'T

- Hardcode colors in components
- Use inline styles for colors
- Create separate components per theme
- Mix mode and theme logic
- Add heavy animations

## CSS Variables Reference

All themes must define these variables:

### Base Colors
- `--background`: Main background
- `--surface`: Surface/card background
- `--foreground`: Primary text color

### Primary Colors
- `--primary`: Primary brand color (blue for Notion)
- `--primary-foreground`: Text on primary

### Accent Colors
- `--accent`: Accent color (orange for Notion)
- `--accent-foreground`: Text on accent

### UI Elements
- `--border`: Border color
- `--input`: Input border color
- `--ring`: Focus ring color

### Text Colors
- `--text-primary`: Primary text
- `--text-secondary`: Secondary text
- `--muted-foreground`: Muted text

### Other
- `--radius`: Border radius (0.75rem for Notion)
- `--destructive`: Error/destructive color

## Troubleshooting

### Theme not applying?

1. Check HTML class: `<html class="dark theme-notion">`
2. Verify CSS variables in DevTools
3. Ensure `initializeTheme()` is called
4. Check localStorage for stored theme

### Colors not updating?

1. Verify CSS variable names match
2. Check for hardcoded colors in components
3. Ensure theme class is on `<html>`, not `<body>`

### Flicker on load?

1. Add `suppressHydrationWarning` to `<html>` in layout
2. Use `ThemeProvider` with `attribute="class"`
3. Initialize theme in `useEffect`

## Future Enhancements

- Theme picker UI component
- System preference detection
- Theme preview/editor
- Per-user theme preferences (via Convex)
- Theme export/import

---

**Last Updated**: 2024
**Maintainer**: Frontend Team

