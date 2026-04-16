"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useRef } from "react";

/**
 * Theme Toggle Component
 * 
 * Premium smooth theme toggle with circular reveal animation from button.
 * Uses next-themes for mode switching and View Transition API for smooth animations.
 * 
 * Brand themes are controlled separately via setBrandTheme() in lib/theme.ts
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Hydration fix: only render after mount
  useEffect(() => {
    // Using setTimeout to avoid setState in effect warning
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted) return null;

  const toggleTheme = async () => {
    setIsTransitioning(true);
    
    // Get button position for circular reveal
    const button = buttonRef.current;
    if (!button) return;
    
    const rect = button.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    
    // Set CSS custom properties for animation origin
    document.documentElement.style.setProperty('--theme-toggle-x', `${x}px`);
    document.documentElement.style.setProperty('--theme-toggle-y', `${y}px`);
    
    // Modern circular animation from button position (Chrome, Edge, Safari 18+)
    if (typeof document !== "undefined" && "startViewTransition" in document) {
      const transition = (document as unknown as { startViewTransition: (callback: () => void) => { finished: Promise<void> } }).startViewTransition(() => {
        setTheme(theme === "dark" ? "light" : "dark");
      });
      
      // Reset button animation after transition
      transition.finished.finally(() => {
        setIsTransitioning(false);
        // Clean up CSS variables
        document.documentElement.style.removeProperty('--theme-toggle-x');
        document.documentElement.style.removeProperty('--theme-toggle-y');
      });
    } else {
      // Fallback for browsers without View Transition API
      setTheme(theme === "dark" ? "light" : "dark");
      setTimeout(() => {
        setIsTransitioning(false);
        document.documentElement.style.removeProperty('--theme-toggle-x');
        document.documentElement.style.removeProperty('--theme-toggle-y');
      }, 400);
    }
  };

  return (
    <Button
      ref={buttonRef}
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="relative overflow-hidden rounded-full group"
      aria-label="Toggle theme"
      disabled={isTransitioning}
    >
      {/* Hover effect */}
      <span
        className="absolute inset-0 scale-0 rounded-full bg-primary/20 transition-transform duration-300 group-hover:scale-100"
      />
      
      {/* Button animation during theme switch */}
      <span
        className={`absolute inset-0 rounded-full bg-primary/10 transition-all duration-400 ${
          isTransitioning ? "scale-150 opacity-100" : "scale-0 opacity-0"
        }`}
      />
      
      {/* Icon with rotation animation */}
      <span className="relative z-10">
        {theme === "dark" ? (
          <Sun 
            className={`h-5 w-5 transition-all duration-400 ${
              isTransitioning ? "rotate-180 scale-110" : "rotate-0 scale-100"
            }`} 
          />
        ) : (
          <Moon 
            className={`h-5 w-5 transition-all duration-400 ${
              isTransitioning ? "rotate-180 scale-110" : "rotate-0 scale-100"
            }`} 
          />
        )}
      </span>
    </Button>
  );
}

