/**
 * Sidebar Provider
 * 
 * Context provider to share sidebar state across components.
 */

"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

const SIDEBAR_KEY = "sidebar-collapsed";

interface SidebarContextType {
  isCollapsed: boolean;
  isMounted: boolean;
  toggle: () => void;
  collapse: () => void;
  expand: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  // Always start with false to match server-side rendering
  // This prevents hydration mismatches
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    // Load saved preference from localStorage after mount
    // This ensures consistent server/client rendering
    const saved = localStorage.getItem(SIDEBAR_KEY);
    if (saved !== null) {
      setIsCollapsed(saved === "true");
    } else {
      // If no saved preference, set based on screen size
    const width = window.innerWidth;
    if (width >= 768 && width < 1024) {
      setIsCollapsed(true);
    } else {
      setIsCollapsed(false);
      }
    }
  }, []);

  const toggle = () => {
    setIsCollapsed((prev) => {
      const newValue = !prev;
      localStorage.setItem(SIDEBAR_KEY, String(newValue));
      return newValue;
    });
  };

  const collapse = () => {
    setIsCollapsed(true);
    localStorage.setItem(SIDEBAR_KEY, "true");
  };

  const expand = () => {
    setIsCollapsed(false);
    localStorage.setItem(SIDEBAR_KEY, "false");
  };

  return (
    <SidebarContext.Provider
      value={{
        isCollapsed,
        isMounted,
        toggle,
        collapse,
        expand,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error("useSidebar must be used within SidebarProvider");
  }
  return context;
}

