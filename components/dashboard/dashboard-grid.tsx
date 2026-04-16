"use client";

/**
 * Dashboard Grid Component
 *
 * Responsive grid layout for dashboard cards that adapts to screen size.
 * Used across all dashboard pages for consistency.
 */

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DashboardGridProps {
  children: ReactNode;
  className?: string;
}

export function DashboardGrid({ children, className }: DashboardGridProps) {
  return (
    <div className={cn(
      // Responsive grid: 2 cols mobile, 3 tablet, 4 desktop
      "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6",
      className
    )}>
      {children}
    </div>
  );
}

// Pre-built responsive card components for common dashboard elements

interface ResponsiveCardProps {
  children: ReactNode;
  className?: string;
  colSpan?: {
    mobile: number; // 1-2 on mobile
    tablet: number; // 1-3 on tablet
    desktop: number; // 1-4 on desktop
  };
  hover?: boolean;
  onClick?: () => void;
}

export function ResponsiveCard({
  children,
  className,
  colSpan = { mobile: 1, tablet: 1, desktop: 1 },
  hover = false,
  onClick
}: ResponsiveCardProps) {
  const colSpanClasses = `col-span-${colSpan.mobile} md:col-span-${colSpan.tablet} lg:col-span-${colSpan.desktop}`;

  return (
    <div
      className={cn(
        colSpanClasses,
        hover && "hover:shadow-md transition-all active:scale-95 touch-manipulation cursor-pointer",
        "rounded-lg border bg-card text-card-foreground shadow-sm",
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

// Stat card with responsive sizing
interface StatCardProps {
  icon: ReactNode;
  value: string | number;
  label: string;
  color?: 'primary' | 'amber' | 'green' | 'blue' | 'purple' | 'red';
  className?: string;
}

export function StatCard({ icon, value, label, color = 'primary', className }: StatCardProps) {
  const colorClasses = {
    primary: 'border-primary/10 bg-primary/5 text-primary',
    amber: 'border-amber-200/50 bg-amber-50/50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400',
    green: 'border-green-200/50 bg-green-50/50 dark:bg-green-950/20 text-green-600 dark:text-green-400',
    blue: 'border-blue-200/50 bg-blue-50/50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400',
    purple: 'border-purple-200/50 bg-purple-50/50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400',
    red: 'border-red-200/50 bg-red-50/50 dark:bg-red-950/20 text-red-600 dark:text-red-400',
  };

  return (
    <div className={cn(
      `border-2 ${colorClasses[color]} rounded-lg`,
      className
    )}>
      <div className="p-3 md:p-4 lg:p-6">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="h-8 w-8 md:h-10 md:w-10 lg:h-12 lg:w-12 rounded-full bg-current/10 flex items-center justify-center">
            <div className="text-current">
              {icon}
            </div>
          </div>
          <div>
            <p className="text-xl md:text-2xl lg:text-3xl font-bold">{value}</p>
            <p className="text-xs md:text-sm text-muted-foreground">{label}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Action card for quick navigation
interface ActionCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  href?: string;
  onClick?: () => void;
  className?: string;
}

export function ActionCard({ icon, title, description, href, onClick, className }: ActionCardProps) {
  const content = (
    <div className="p-3 md:p-4 lg:p-6 text-center h-full flex flex-col justify-center">
      <div className="h-8 w-8 md:h-10 md:w-10 lg:h-12 lg:w-12 rounded-full bg-current/10 flex items-center justify-center mx-auto mb-2 md:mb-3">
        <div className="text-current">
          {icon}
        </div>
      </div>
      <h3 className="font-semibold text-sm md:text-base mb-1">{title}</h3>
      <p className="text-xs md:text-sm text-muted-foreground">{description}</p>
    </div>
  );

  if (href) {
    return (
      <a href={href} className={cn("block rounded-lg border bg-card hover:shadow-md transition-all active:scale-95 touch-manipulation", className)}>
        {content}
      </a>
    );
  }

  return (
    <div
      className={cn("rounded-lg border bg-card hover:shadow-md transition-all active:scale-95 touch-manipulation cursor-pointer", className)}
      onClick={onClick}
    >
      {content}
    </div>
  );
}
