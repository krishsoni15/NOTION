"use client";

/**
 * Mobile Sidebar Component
 * 
 * Navigation menu for mobile devices (inside Sheet).
 */

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Role, ROLES, ROLE_LABELS } from "@/lib/auth/roles";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Store,
  Warehouse,
  CheckCircle,
  Building2,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface NavigationItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: Role[];
}

const navigationItems: NavigationItem[] = [
  // Site Engineer - Logical sequence: Dashboard → Requests → Inventory
  {
    label: "Dashboard",
    href: "/dashboard/site",
    icon: LayoutDashboard,
    roles: [ROLES.SITE_ENGINEER],
  },
  {
    label: "My Requests",
    href: "/dashboard/site/requests",
    icon: ClipboardList,
    roles: [ROLES.SITE_ENGINEER],
  },
  {
    label: "Inventory",
    href: "/dashboard/inventory",
    icon: Warehouse,
    roles: [ROLES.SITE_ENGINEER],
  },

  // Manager - Logical sequence: Dashboard → Requests → Inventory → Vendors → Users → Sites
  {
    label: "Dashboard",
    href: "/dashboard/manager",
    icon: LayoutDashboard,
    roles: [ROLES.MANAGER],
  },
  {
    label: "All Requests",
    href: "/dashboard/manager/requests",
    icon: ClipboardList,
    roles: [ROLES.MANAGER],
  },
  {
    label: "Inventory",
    href: "/dashboard/inventory",
    icon: Warehouse,
    roles: [ROLES.MANAGER],
  },
  {
    label: "Vendors",
    href: "/dashboard/vendors",
    icon: Store,
    roles: [ROLES.MANAGER],
  },
  {
    label: "User Management",
    href: "/dashboard/manager/users",
    icon: Users,
    roles: [ROLES.MANAGER],
  },
  {
    label: "Sites",
    href: "/dashboard/sites",
    icon: Building2,
    roles: [ROLES.MANAGER],
  },

  // Purchase Officer - Logical sequence: Dashboard → Requests → Inventory → Vendors
  {
    label: "Dashboard",
    href: "/dashboard/purchase",
    icon: LayoutDashboard,
    roles: [ROLES.PURCHASE_OFFICER],
  },
  {
    label: "Approved Requests",
    href: "/dashboard/purchase/requests",
    icon: CheckCircle,
    roles: [ROLES.PURCHASE_OFFICER],
  },
  {
    label: "Inventory",
    href: "/dashboard/inventory",
    icon: Warehouse,
    roles: [ROLES.PURCHASE_OFFICER],
  },
  {
    label: "Vendors",
    href: "/dashboard/vendors",
    icon: Store,
    roles: [ROLES.PURCHASE_OFFICER],
  },
];

interface MobileSidebarProps {
  userRole: Role;
}

export function MobileSidebar({ userRole }: MobileSidebarProps) {
  const pathname = usePathname();
  const [logoError, setLogoError] = useState(false);

  // Filter navigation items based on user role
  const filteredItems = navigationItems.filter((item) =>
    item.roles.includes(userRole)
  );

  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="p-6">
        <div className="flex items-center gap-3 mb-2">
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
          <div className="h-10 relative flex items-center">
            {logoError ? (
              <h1 className="text-2xl font-bold">NOTION</h1>
            ) : (
              <Image
                src="/images/logos/Notion_Logo-removebg-preview.png"
                alt="Notion"
                width={180}
                height={40}
                className="object-contain h-full"
                onError={() => setLogoError(true)}
              />
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {ROLE_LABELS[userRole]}
        </p>
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {filteredItems.map((item) => {
          // Dashboard items should only be active on exact match
          const isDashboard = item.label === "Dashboard";
          const isActive = isDashboard
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t">
        <p className="text-xs text-muted-foreground text-center">
          v1.0.0 © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}

