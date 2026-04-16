import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

export const ExpandableText = ({ text, className, limit = 60 }: { text: string; className?: string; limit?: number }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    if (!text) return null;
    const shouldTruncate = text.length > limit;

    return (
        <div className="flex flex-col items-start gap-0.5">
            <p className={cn("break-words whitespace-normal leading-relaxed max-w-full", className, (!isExpanded && shouldTruncate) && "line-clamp-1")}>
                {text}
            </p>
            {shouldTruncate && (
                <button
                    onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                    className="text-[10px] font-bold text-primary hover:underline flex items-center gap-0.5 select-none"
                >
                    {isExpanded ? (
                        <>Show Less <ChevronUp className="h-3 w-3" /></>
                    ) : (
                        <>Read More <ChevronDown className="h-3 w-3" /></>
                    )}
                </button>
            )}
        </div>
    );
};
