/**
 * Vendor Selector Component
 * 
 * Multi-select dropdown for selecting vendors with search functionality.
 */

"use client";

import { useState } from "react";
import { Search, X, Check, Building2, Info, Mail, Phone, Hash, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn, normalizeSearchQuery, matchesAnySearchQuery } from "@/lib/utils";
import type { Id } from "@/convex/_generated/dataModel";

interface VendorSelectorProps {
  selectedVendors: Id<"vendors">[];
  onSelectionChange: (vendorIds: Id<"vendors">[]) => void;
  disabled?: boolean;
}

export function VendorSelector({
  selectedVendors,
  onSelectionChange,
  disabled = false,
}: VendorSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const allVendors = useQuery(api.vendors.getAllVendors, {});

  // Filter vendors based on search - smart search with normalized query
  const filteredVendors = allVendors?.filter((vendor) => {
    const normalizedQuery = normalizeSearchQuery(searchQuery);
    if (!normalizedQuery) return true;
    return matchesAnySearchQuery(
      [vendor.companyName, vendor.email, vendor.gstNumber, vendor.phone, vendor.address],
      normalizedQuery
    );
  }) || [];

  const handleOpenInMap = (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
    window.open(mapUrl, '_blank');
  };

  // Get selected vendor details
  const selectedVendorDetails = allVendors?.filter((vendor) =>
    selectedVendors.includes(vendor._id)
  ) || [];

  const handleToggleVendor = (vendorId: Id<"vendors">) => {
    if (selectedVendors.includes(vendorId)) {
      onSelectionChange(selectedVendors.filter((id) => id !== vendorId));
    } else {
      onSelectionChange([...selectedVendors, vendorId]);
    }
  };

  const handleRemoveVendor = (vendorId: Id<"vendors">) => {
    onSelectionChange(selectedVendors.filter((id) => id !== vendorId));
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen} modal={false}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start text-left font-normal h-auto min-h-9 py-2"
            disabled={disabled}
          >
            <div className="flex items-center gap-2 flex-wrap w-full">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              {selectedVendorDetails.length > 0 ? (
                <div className="flex items-center gap-1.5 flex-wrap flex-1">
                  {selectedVendorDetails.map((vendor) => (
                    <div key={vendor._id} className="flex items-center gap-1">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Badge
                            variant="secondary"
                            className="text-xs px-2 py-0.5 cursor-pointer hover:bg-primary/10 transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {vendor.companyName}
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                if (!disabled) {
                                  handleRemoveVendor(vendor._id);
                                }
                              }}
                              className={cn(
                                "ml-1.5 hover:bg-destructive/20 rounded-full p-0.5 cursor-pointer inline-flex items-center justify-center transition-colors",
                                disabled && "opacity-50 cursor-not-allowed"
                              )}
                              role="button"
                              tabIndex={disabled ? -1 : 0}
                              onKeyDown={(e) => {
                                if ((e.key === "Enter" || e.key === " ") && !disabled) {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleRemoveVendor(vendor._id);
                                }
                              }}
                            >
                              <X className="h-3 w-3" />
                            </span>
                          </Badge>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-80 p-4 z-[110]"
                          align="start"
                          onClick={(e) => e.stopPropagation()}
                          onInteractOutside={(e) => {
                            const target = e.target as HTMLElement;
                            if (target.closest('[role="dialog"]')) {
                              e.preventDefault();
                            }
                          }}
                          onPointerDownOutside={(e) => {
                            const target = e.target as HTMLElement;
                            if (target.closest('[role="dialog"]')) {
                              e.preventDefault();
                            }
                          }}
                        >
                          <div className="space-y-3">
                            <div>
                              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-primary" />
                                {vendor.companyName}
                              </h4>
                            </div>
                            <div className="space-y-2 text-sm">
                              <div className="flex items-start gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-xs text-muted-foreground">Email</p>
                                  <p className="font-medium">{vendor.email}</p>
                                </div>
                              </div>
                              {vendor.phone && (
                                <div className="flex items-start gap-2">
                                  <Phone className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                  <div>
                                    <p className="text-xs text-muted-foreground">Phone</p>
                                    <p className="font-medium">{vendor.phone}</p>
                                  </div>
                                </div>
                              )}
                              <div className="flex items-start gap-2">
                                <Hash className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-xs text-muted-foreground">GST Number</p>
                                  <p className="font-medium">{vendor.gstNumber}</p>
                                </div>
                              </div>
                              {vendor.address && (
                                <div className="flex items-start gap-2">
                                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                  <div className="flex-1">
                                    <p className="text-xs text-muted-foreground">Address</p>
                                    <div className="flex items-center gap-1">
                                      <p className="font-medium text-xs flex-1">{vendor.address}</p>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleOpenInMap(vendor.address);
                                        }}
                                        className="text-muted-foreground hover:text-primary transition-colors p-2 rounded-full hover:bg-muted/50 shrink-0 border border-muted-foreground/20 hover:border-primary/40"
                                        title="Open in Maps"
                                      >
                                        <MapPin className="h-3 w-3" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-muted-foreground">Select vendors...</span>
              )}
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[400px] p-0 z-[100]"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={(e) => {
            // Don't close if clicking on the parent dialog
            const target = e.target as HTMLElement;
            if (target.closest('[role="dialog"]')) {
              e.preventDefault();
            }
          }}
          onPointerDownOutside={(e) => {
            // Don't close if clicking on the parent dialog
            const target = e.target as HTMLElement;
            if (target.closest('[role="dialog"]')) {
              e.preventDefault();
            }
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-3 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search vendors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            {filteredVendors.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No vendors found
              </div>
            ) : (
              filteredVendors.map((vendor) => {
                const isSelected = selectedVendors.includes(vendor._id);
                return (
                  <button
                    key={vendor._id}
                    type="button"
                    onClick={() => handleToggleVendor(vendor._id)}
                    className={cn(
                      "w-full text-left px-4 py-2.5 text-sm hover:bg-accent transition-colors flex items-center gap-3 border-b last:border-b-0",
                      isSelected && "bg-accent/50"
                    )}
                  >
                    <div
                      className={cn(
                        "w-4 h-4 rounded border flex items-center justify-center shrink-0",
                        isSelected
                          ? "bg-primary border-primary"
                          : "border-border"
                      )}
                    >
                      {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                    </div>
                    <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{vendor.companyName}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {vendor.email}
                      </div>
                    </div>
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="shrink-0"
                    >
                      <Popover>
                        <PopoverTrigger asChild>
                          <span
                            className="inline-flex items-center justify-center h-6 w-6 rounded hover:bg-primary/10 cursor-pointer transition-colors"
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                              }
                            }}
                          >
                            <Info className="h-4 w-4 text-primary" />
                          </span>
                        </PopoverTrigger>
                      <PopoverContent
                        className="w-80 p-4 z-[110]"
                        align="end"
                        onClick={(e) => e.stopPropagation()}
                        onInteractOutside={(e) => {
                          const target = e.target as HTMLElement;
                          if (target.closest('[role="dialog"]')) {
                            e.preventDefault();
                          }
                        }}
                        onPointerDownOutside={(e) => {
                          const target = e.target as HTMLElement;
                          if (target.closest('[role="dialog"]')) {
                            e.preventDefault();
                          }
                        }}
                      >
                        <div className="space-y-3">
                          <div>
                            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-primary" />
                              {vendor.companyName}
                            </h4>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-start gap-2">
                              <Mail className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                              <div>
                                <p className="text-xs text-muted-foreground">Email</p>
                                <p className="font-medium">{vendor.email}</p>
                              </div>
                            </div>
                            {vendor.phone && (
                              <div className="flex items-start gap-2">
                                <Phone className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-xs text-muted-foreground">Phone</p>
                                  <p className="font-medium">{vendor.phone}</p>
                                </div>
                              </div>
                            )}
                            <div className="flex items-start gap-2">
                              <Hash className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                              <div>
                                <p className="text-xs text-muted-foreground">GST Number</p>
                                <p className="font-medium">{vendor.gstNumber}</p>
                              </div>
                            </div>
                            {vendor.address && (
                              <div className="flex items-start gap-2">
                                <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                <div className="flex-1">
                                  <p className="text-xs text-muted-foreground">Address</p>
                                  <div className="flex items-center gap-1">
                                    <p className="font-medium text-xs flex-1">{vendor.address}</p>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenInMap(vendor.address);
                                      }}
                                      className="text-muted-foreground hover:text-primary transition-colors p-1 rounded-sm hover:bg-muted/50 shrink-0"
                                      title="Open in Maps"
                                    >
                                      <MapPin className="h-3 w-3" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </PopoverContent>
                      </Popover>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

