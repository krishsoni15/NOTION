"use client";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { useEffect, useState, useRef } from "react";

export function AnimatedThemeToggler() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const buttonRef = useRef<HTMLButtonElement>(null);

    // Hydration fix
    useEffect(() => {
        const timer = setTimeout(() => setMounted(true), 0);
        return () => clearTimeout(timer);
    }, []);

    if (!mounted) return null;

    const toggleTheme = async () => {
        setIsTransitioning(true);

        const button = buttonRef.current;
        if (!button) return;

        const rect = button.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;

        document.documentElement.style.setProperty('--theme-toggle-x', `${x}px`);
        document.documentElement.style.setProperty('--theme-toggle-y', `${y}px`);

        if (typeof document !== "undefined" && "startViewTransition" in document) {
            const transition = (document as unknown as { startViewTransition: (callback: () => void) => { finished: Promise<void> } }).startViewTransition(() => {
                setTheme(theme === "dark" ? "light" : "dark");
            });

            transition.finished.finally(() => {
                setIsTransitioning(false);
                document.documentElement.style.removeProperty('--theme-toggle-x');
                document.documentElement.style.removeProperty('--theme-toggle-y');
            });
        } else {
            setTheme(theme === "dark" ? "light" : "dark");
            setTimeout(() => {
                setIsTransitioning(false);
                document.documentElement.style.removeProperty('--theme-toggle-x');
                document.documentElement.style.removeProperty('--theme-toggle-y');
            }, 400);
        }
    };

    return (
        <button
            ref={buttonRef}
            onClick={toggleTheme}
            className="relative p-3 rounded-full overflow-hidden group transition-all duration-300 hover:bg-primary/10"
            aria-label="Toggle theme"
            disabled={isTransitioning}
        >
            {/* Button animation during theme switch */}
            <span
                className={`absolute inset-0 rounded-full bg-primary/10 transition-all duration-400 ${isTransitioning ? "scale-150 opacity-100" : "scale-0 opacity-0"
                    }`}
            />

            {/* Icon with rotation animation */}
            <div className="relative z-10 text-foreground">
                {theme === "dark" ? (
                    <Sun
                        className={`w-6 h-6 transition-all duration-400 ${isTransitioning ? "rotate-180 scale-110" : "rotate-0 scale-100"
                            }`}
                    />
                ) : (
                    <Moon
                        className={`w-6 h-6 transition-all duration-400 ${isTransitioning ? "rotate-180 scale-110" : "rotate-0 scale-100"
                            }`}
                    />
                )}
            </div>
        </button>
    );
}
