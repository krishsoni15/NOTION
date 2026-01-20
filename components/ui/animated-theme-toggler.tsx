"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function AnimatedThemeToggler() {
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        // Check initial heme
        if (document.documentElement.classList.contains("dark")) {
            setIsDark(true);
        }

        // Observer for external changes
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === "class") {
                    setIsDark(document.documentElement.classList.contains("dark"));
                }
            });
        });

        observer.observe(document.documentElement, { attributes: true });
        return () => observer.disconnect();
    }, []);

    const toggleTheme = () => {
        document.documentElement.classList.toggle("dark");
        setIsDark(!isDark);
    };

    return (
        <button
            onClick={toggleTheme}
            className={`relative p-3 rounded-full transition-all duration-500 ease-in-out hover:scale-110 active:scale-95
        ${isDark
                    ? "bg-slate-800/80 text-yellow-400 hover:bg-slate-800"
                    : "bg-white/80 text-slate-700 hover:bg-white"
                } 
        backdrop-blur-md shadow-sm hover:shadow-md ring-1 ring-inset ${isDark ? "ring-white/10" : "ring-black/5"}`}
            aria-label="Toggle theme"
        >
            <div className="relative w-6 h-6">
                <div
                    className={`absolute inset-0 flex items-center justify-center transition-all duration-500 transform ${isDark ? "rotate-0 opacity-100 scale-100" : "-rotate-90 opacity-0 scale-50"
                        }`}
                >
                    <Moon size={20} strokeWidth={2.5} fill="currentColor" className="text-yellow-400 drop-shadow-sm" />
                </div>
                <div
                    className={`absolute inset-0 flex items-center justify-center transition-all duration-500 transform ${isDark ? "rotate-90 opacity-0 scale-50" : "rotate-0 opacity-100 scale-100"
                        }`}
                >
                    <Sun size={22} strokeWidth={2.5} className="text-orange-500 drop-shadow-sm" />
                </div>
            </div>
            <span className="sr-only">Toggle theme</span>
        </button>
    );
}
