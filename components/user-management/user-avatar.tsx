"use client";

import { useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
    name: string;
    image?: string | null;
    className?: string;
    size?: "xs" | "sm" | "md" | "lg" | "xl";
}

export function UserAvatar({ name, image, className, size = "md" }: UserAvatarProps) {
    // Filter out common default/placeholder images to ensure our custom initials show
    const processedImage = useMemo(() => {
        if (!image) return null;
        // If it's a Clerk default avatar (colorful abstract circles/person), we prefer our own initials
        if (image.includes("clerk") && (image.includes("default") || image.includes("avatar"))) {
            return null;
        }
        return image;
    }, [image]);

    const initials = useMemo(() => {
        return name
            ?.split(" ")
            .filter(Boolean)
            .map((n) => n[0])
            .slice(0, 2)
            .join("")
            .toUpperCase() || "?";
    }, [name]);

    const sizeClasses = {
        xs: "h-6 w-6 text-[10px]",
        sm: "h-8 w-8 text-xs",
        md: "h-9 w-9 text-sm",
        lg: "h-12 w-12 text-base",
        xl: "h-20 w-20 text-xl",
    };

    return (
        <Avatar className={cn(sizeClasses[size], "border border-border/10 shadow-sm", className)}>
            {processedImage ? (
                <AvatarImage src={processedImage} alt={name} className="object-cover" />
            ) : null}
            <AvatarFallback className="bg-gradient-to-br from-primary/20 via-primary/15 to-primary/5 text-primary font-bold tracking-tighter">
                {initials}
            </AvatarFallback>
        </Avatar>
    );
}
