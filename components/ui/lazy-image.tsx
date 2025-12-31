"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

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
  onClick
}: LazyImageProps) {
  console.log('LazyImage rendering with src:', src, 'width:', width, 'height:', height);

  return (
    <div
      className={cn("relative overflow-hidden bg-gray-200 border-2 border-dashed border-gray-300", className)}
      style={{ width, height, minWidth: width, minHeight: height }}
      onClick={onClick}
    >
      {/* Show loading state initially */}
      <div className="absolute inset-0 bg-blue-100 flex items-center justify-center rounded">
        <div className="text-xs text-blue-600">Loading...</div>
      </div>

      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        className="w-full h-full object-cover rounded"
        onError={(e) => {
          console.error('❌ Image failed to load:', src);
          e.currentTarget.style.display = 'none';
          const parent = e.currentTarget.parentElement;
          if (parent) {
            // Clear loading state and show error
            parent.innerHTML = '<div class="absolute inset-0 bg-red-100 flex items-center justify-center rounded text-xs text-red-600">❌ Failed</div>';
          }
        }}
        onLoad={(e) => {
          console.log('✅ Image loaded successfully:', src);
          // Hide loading state
          const loadingDiv = e.currentTarget.previousElementSibling as HTMLElement;
          if (loadingDiv) {
            loadingDiv.style.display = 'none';
          }
        }}
      />
    </div>
  );
}
