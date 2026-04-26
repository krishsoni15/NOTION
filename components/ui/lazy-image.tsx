"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ImageOff } from "lucide-react";

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
  onClick?: () => void;
}

export function LazyImage({
  src,
  alt,
  className,
  width,
  height,
  priority = false,
  onClick,
}: LazyImageProps) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading");

  return (
    <div
      className={cn("relative overflow-hidden bg-muted", className)}
      style={{ width, height, minWidth: width, minHeight: height }}
      onClick={onClick}
    >
      {/* Loading shimmer */}
      {status === "loading" && (
        <div className="absolute inset-0 bg-muted animate-pulse rounded" />
      )}

      {/* Error fallback */}
      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-muted rounded text-muted-foreground">
          <ImageOff className="h-5 w-5 opacity-40" />
          <span className="text-[10px] opacity-50">No image</span>
        </div>
      )}

      {/* Actual image — always rendered so onLoad/onError fire */}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? "eager" : "lazy"}
        className={cn(
          "w-full h-full object-cover rounded transition-opacity duration-200",
          status === "loaded" ? "opacity-100" : "opacity-0"
        )}
        onLoad={() => setStatus("loaded")}
        onError={() => setStatus("error")}
      />
    </div>
  );
}
