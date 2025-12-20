"use client";

/**
 * Sidebar Navigation Component
 * 
 * Role-based navigation menu for desktop with collapsible functionality.
 */

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Role, ROLES, ROLE_LABELS } from "@/lib/auth/roles";
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  ShoppingCart, 
  Package,
  Building2,
  MessageCircle,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useSidebar } from "./sidebar-provider";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface NavigationItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: Role[]; // Which roles can see this item
}

const navigationItems: NavigationItem[] = [
  // Site Engineer
  {
    label: "Dashboard",
    href: "/dashboard/site",
    icon: LayoutDashboard,
    roles: [ROLES.SITE_ENGINEER],
  },
  {
    label: "My Requests",
    href: "/dashboard/site/requests",
    icon: FileText,
    roles: [ROLES.SITE_ENGINEER],
  },
  {
    label: "Inventory",
    href: "/dashboard/inventory",
    icon: Package,
    roles: [ROLES.SITE_ENGINEER],
  },
  
  // Manager
  {
    label: "Dashboard",
    href: "/dashboard/manager",
    icon: LayoutDashboard,
    roles: [ROLES.MANAGER],
  },
  {
    label: "All Requests",
    href: "/dashboard/manager/requests",
    icon: FileText,
    roles: [ROLES.MANAGER],
  },
  {
    label: "User Management",
    href: "/dashboard/manager/users",
    icon: Users,
    roles: [ROLES.MANAGER],
  },
  {
    label: "Vendors",
    href: "/dashboard/vendors",
    icon: Building2,
    roles: [ROLES.MANAGER],
  },
  {
    label: "Inventory",
    href: "/dashboard/inventory",
    icon: Package,
    roles: [ROLES.MANAGER],
  },
  
  // Purchase Officer
  {
    label: "Dashboard",
    href: "/dashboard/purchase",
    icon: LayoutDashboard,
    roles: [ROLES.PURCHASE_OFFICER],
  },
  {
    label: "Purchase Orders",
    href: "/dashboard/purchase/orders",
    icon: ShoppingCart,
    roles: [ROLES.PURCHASE_OFFICER],
  },
  {
    label: "Approved Requests",
    href: "/dashboard/purchase/requests",
    icon: Package,
    roles: [ROLES.PURCHASE_OFFICER],
  },
  {
    label: "Vendors",
    href: "/dashboard/vendors",
    icon: Building2,
    roles: [ROLES.PURCHASE_OFFICER],
  },
  {
    label: "Inventory",
    href: "/dashboard/inventory",
    icon: Package,
    roles: [ROLES.PURCHASE_OFFICER],
  },
];

interface SidebarProps {
  userRole: Role;
}

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();
  const { isCollapsed, toggle, isMounted } = useSidebar();
  const [logoError, setLogoError] = useState(false);

  // Filter navigation items based on user role
  const filteredItems = navigationItems.filter((item) =>
    item.roles.includes(userRole)
  );

  return (
    <aside 
      className={cn(
        "hidden md:flex md:flex-col md:border-r md:bg-card/50 md:backdrop-blur-sm transition-all duration-300 ease-in-out fixed left-0 top-0 h-screen z-30 shadow-sm",
        "group",
        isCollapsed ? "md:w-20" : "md:w-64"
      )}
    >
      <TooltipProvider delayDuration={0}>
        <div className="flex-1 overflow-y-auto">
          {/* Brand with Toggle */}
          <div className={cn(
            "transition-all duration-300 flex items-center",
            isCollapsed ? "p-4 justify-center" : "p-6 justify-between"
          )}>
            {isCollapsed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={toggle}
                    className="flex items-center justify-center h-10 w-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 hover:from-primary/30 hover:to-primary/20 transition-all hover:scale-105 active:scale-95 cursor-ew-resize group"
                  >
                    {logoError ? (
                      <span className="text-xl font-bold text-primary">N</span>
                    ) : (
                      <Image
                        src="/images/logos/Notion_Favicon-removebg-preview.png"
                        alt="Notion"
                        width={32}
                        height={32}
                        className="object-contain"
                        onError={() => setLogoError(true)}
                      />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-medium">
                  Expand sidebar
                </TooltipContent>
              </Tooltip>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shrink-0 overflow-hidden p-1.5">
                    {logoError ? (
                      <h1 className="text-xl font-bold text-primary">N</h1>
                    ) : (
                      <Image
                        src="/images/logos/Notion_Favicon-removebg-preview.png"
                        alt="Notion Logo"
                        width={32}
                        height={32}
                        className="object-contain"
                        onError={() => setLogoError(true)}
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex flex-col gap-1">
                    <div className="h-10 relative flex items-center">
                      {logoError ? (
                        <h1 className="text-xl font-bold truncate">NOTION</h1>
                      ) : (
                        <Image
                          src="/images/logos/Notion_Logo-removebg-preview.png"
                          alt="Notion"
                          width={160}
                          height={40}
                          className="object-contain h-full"
                          onError={() => setLogoError(true)}
                        />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {ROLE_LABELS[userRole]}
                    </p>
                  </div>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={toggle}
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 hover:bg-accent hover:scale-105 active:scale-95 cursor-ew-resize group"
                    >
                      <PanelLeftClose className="h-4 w-4 font-bold stroke-[2.5] transition-transform group-hover:scale-110" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">
                    Collapse sidebar
                  </TooltipContent>
                </Tooltip>
              </>
            )}
          </div>

          <Separator />

          {/* Navigation */}
          <nav className={cn(
            "space-y-1 transition-all duration-300",
            isCollapsed ? "p-2" : "p-4"
          )}>
            {filteredItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              const Icon = item.icon;

              if (isCollapsed) {
                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center justify-center h-12 w-full rounded-lg text-sm font-medium transition-all",
                          "hover:scale-105 active:scale-95",
                          isActive
                            ? "bg-primary text-primary-foreground shadow-md"
                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:shadow-sm"
                        )}
                        style={{ cursor: 'pointer' }}
                      >
                        <Icon className="h-5 w-5" />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="font-medium">
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                    "hover:translate-x-1 active:scale-[0.98]",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:shadow-sm"
                  )}
                  style={{ cursor: 'pointer' }}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer */}
        {!isCollapsed && (
          <div className="p-4 border-t">
            <p className="text-xs text-muted-foreground text-center">
              v1.0.0 © {new Date().getFullYear()}
            </p>
          </div>
        )}
      </TooltipProvider>
    </aside>
  );
}

