/**
 * Theme Settings Component
 * 
 * Allows users to select color themes and preview them.
 */

"use client";

import { useState, useEffect } from "react";
import { Check, Palette, Monitor, Moon, Sun } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { setBrandTheme, getCurrentTheme, BrandTheme, THEME_LABELS, THEME_COLORS } from "@/lib/theme";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

export function ThemeSettings() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [selectedTheme, setSelectedTheme] = useState<BrandTheme>("notion");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setSelectedTheme(getCurrentTheme());
  }, []);

  const handleThemeChange = (theme: BrandTheme) => {
    setSelectedTheme(theme);
    setBrandTheme(theme);
  };

  const handleModeChange = (mode: "system" | "dark" | "light") => {
    setTheme(mode);
  };

  if (!mounted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Theme Settings</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const modeOptions = [
    { value: "system" as const, label: "System", icon: Monitor, description: "Adapts to your system preference" },
    { value: "dark" as const, label: "Dark", icon: Moon, description: "Always use dark mode" },
    { value: "light" as const, label: "Light", icon: Sun, description: "Always use light mode" },
  ];

  const themes: BrandTheme[] = ["notion", "ocean", "forest", "purple", "dark", "red"];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
            <Palette className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>Color Theme</CardTitle>
            <CardDescription>
              Customize your interface appearance
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Mode Selector (System/Dark/Light) */}
        <div>
          <h3 className="text-sm font-semibold mb-3 text-foreground">Color Mode</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {modeOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = theme === option.value;
              
              return (
                <button
                  key={option.value}
                  onClick={() => handleModeChange(option.value)}
                  className={cn(
                    "relative p-3 rounded-lg border-2 transition-all cursor-pointer",
                    "hover:shadow-sm hover:-translate-y-0.5",
                    "flex items-center gap-3",
                    isSelected
                      ? "border-primary shadow-md bg-primary/5"
                      : "border-border hover:border-primary/50 bg-card"
                  )}
                >
                  {/* Selected Indicator */}
                  {isSelected && (
                    <div className="absolute top-2 right-2 h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-2.5 w-2.5 text-primary-foreground" />
                    </div>
                  )}

                  {/* Icon */}
                  <div className={cn(
                    "h-8 w-8 rounded-md flex items-center justify-center transition-colors shrink-0",
                    isSelected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>

                  {/* Label */}
                  <div className="text-left flex-1 min-w-0">
                    <h4 className="font-semibold text-sm">{option.label}</h4>
                    <p className="text-xs text-muted-foreground truncate">{option.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border" />

        {/* Brand Theme Selector */}
        <div>
          <h3 className="text-sm font-semibold mb-3 text-foreground">Color Theme</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {themes.map((brandTheme) => {
            const isSelected = selectedTheme === brandTheme;
            const colors = THEME_COLORS[brandTheme];

            return (
              <button
                key={brandTheme}
                onClick={() => handleThemeChange(brandTheme)}
                className={cn(
                  "relative p-3 rounded-lg border-2 transition-all cursor-pointer",
                  "hover:shadow-sm hover:-translate-y-0.5",
                  isSelected
                    ? "border-primary shadow-md bg-primary/5"
                    : "border-border hover:border-primary/50 bg-card"
                )}
              >
                {/* Selected Indicator */}
                {isSelected && (
                  <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary flex items-center justify-center shadow-sm">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                )}

                {/* Theme Name */}
                <div className="mb-2.5">
                  <h3 className="font-semibold text-sm mb-0.5">
                    {THEME_LABELS[brandTheme]}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {colors.description}
                  </p>
                </div>

                {/* Color Palette Preview */}
                <div className="flex gap-2 mb-2.5">
                  <div
                    className="h-8 flex-1 rounded-md shadow-sm border border-border/50"
                    style={{ backgroundColor: colors.primary }}
                  />
                  <div
                    className="h-8 flex-1 rounded-md shadow-sm border border-border/50"
                    style={{ backgroundColor: colors.accent }}
                  />
                </div>

                {/* Preview Text */}
                <div className="flex items-center gap-1.5">
                  <div
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: colors.primary }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {isSelected ? "Active" : "Click to apply"}
                  </span>
                </div>
              </button>
            );
          })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

