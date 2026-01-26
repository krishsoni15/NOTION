"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface ReadMoreTextProps {
    text?: string;
    className?: string;
    truncateLength?: number;
}

export function ReadMoreText({ text, className, truncateLength = 90 }: ReadMoreTextProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isOverflowing, setIsOverflowing] = useState(false);
    const textRef = useRef<HTMLDivElement>(null);

    // Initial check using heuristic to minimize layout shift
    // We'll update this with the real DOM check in useEffect
    const heuristicCheck = text ? (text.length > truncateLength || text.split('\n').length > 2) : false;

    // We only use the heuristic for initial render if we haven't measured yet?
    // Actually, safer to start false or heuristic, but let's stick to state.
    // We'll rely on the effect to set the truth.

    if (!text) return <span className="text-muted-foreground/50 italic capitalize text-xs">No description</span>;
    if (text === "—") return <span className="text-muted-foreground">—</span>;

    useEffect(() => {
        const checkOverflow = () => {
            const element = textRef.current;
            if (element && !isExpanded) {
                // Check if the scrollHeight is significantly larger than clientHeight
                // We add a small buffer (1px) to handle sub-pixel rendering differences
                const isClamped = element.scrollHeight > element.clientHeight + 1;
                setIsOverflowing(isClamped);
            }
        };

        // Check immediately
        checkOverflow();

        // Check on resize
        window.addEventListener('resize', checkOverflow);
        return () => window.removeEventListener('resize', checkOverflow);
    }, [text, isExpanded]);

    // Force button to stay visible if expanded, or if overflowing when collapsed
    const showButton = isExpanded || isOverflowing;

    return (
        <div className="relative group/desc">
            <div
                ref={textRef}
                className={cn(
                    "transition-all duration-200",
                    !isExpanded && "line-clamp-2",
                    className
                )}
            >
                {text}
            </div>
            {showButton && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsExpanded(!isExpanded);
                    }}
                    className="text-[10px] font-semibold text-primary/80 hover:text-primary hover:underline mt-1 inline-flex items-center gap-0.5"
                >
                    {isExpanded ? "Show less" : "Read more"}
                </button>
            )}
        </div>
    );
}
