/**
 * VisuallyHidden Component
 * 
 * Hides content visually but keeps it accessible to screen readers.
 */

import * as React from "react";
import { cn } from "@/lib/utils";

export function VisuallyHidden({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      className={cn(
        "absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0",
        className
      )}
      {...props}
    />
  );
}

