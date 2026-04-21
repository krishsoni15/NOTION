"use client";

/**
 * Direct Actions Section Component
 * 
 * Embeddable component for dashboards to display CC, DC, and PO records
 * Can be integrated into any dashboard layout
 */

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus } from "lucide-react";
import { DirectActionsFilters } from "./shared/direct-actions-filters";
import { DirectActionsTable } from "./shared/direct-actions-table";
import { combineDirectActions, filterDirectActions, sortByDate } from "./shared";
import type { DirectActionFilters, DirectActionItem } from "./shared/types";
import { CostComparisonDialog } from "@/components/purchase/cost-comparison-dialog";
import { DirectCCSetupDialog } from "@/components/purchase/direct-cc-setup-dialog";
import { DirectDeliveryDialog } from "@/components/purchase/direct-delivery-dialog";
import { PDFPreviewDialog } from "@/components/purchase/pdf-preview-dialog";
import { ClientWrapper } from "@/components/ui/client-wrapper";
import type { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { useMutation } from "convex/react";

interface DirectActionsSectionProps {
  showHeader?: boolean;
  showCreateButton?: boolean;
  compact?: boolean;
}

export function DirectActionsSection({
  showHeader = true,
  showCreateButton = true,
  compact = false,
}: DirectActionsSectionProps) {
  // Filters state
  const [filters, setFilters] = useState<DirectActionFilters>({
    entityType: "all",
    actionType: "all",
    searchQuery: "",
  });

  // Dialog states
  const [ccDialogOpen, setCCDialogOpen] = useState(false);
  const [directCCSetupOpen, setDirectCCSetupOpen] = useState(false);
  const [directDeliveryOpen, setDirectDeliveryOpen] = useState(false);
  const [editingDirectDCId, setEditingDirectDCId] = useState<Id<"deliveries"> | null>(null);
  const [poPreviewOpen, setPoPreviewOpen] = useState(false);
  const [selectedPONumber, setSelectedPONumber] = useState<string | null>(null);
  const [selectedCCRequestId, setSelectedCCRequestId] = useState<Id<"requests"> | null>(null);
  const [resetEditingState, setResetEditingState] = useState<(() => void) | null>(null);
  const [dcPreviewOpen, setDCPreviewOpen] = useState(false);
  const [selectedDCId, setSelectedDCId] = useState<Id<"deliveries"> | null>(null);

  // Fetch data
  const costComparisons = useQuery(api.costComparisons.getAllCostComparisons, {});
  const purchaseOrders = useQuery(api.purchaseOrders.getAllPurchaseOrders, {});
  const deliveries = useQuery(api.deliveries.getAllDeliveries, {});

  // Title update mutations
  const updateCCTitle = useMutation(api.costComparisons.updateCostComparisonTitle);
  const updatePOTitle = useMutation(api.purchaseOrders.updatePurchaseOrderTitle);
  const updateDCTitle = useMutation(api.deliveries.updateDeliveryTitle);

  // Transform and combine data
  const allItems = useMemo(() => {
    if (!costComparisons || !purchaseOrders || !deliveries) {
      return [];
    }

    const combined = combineDirectActions(
      costComparisons as any[],
      purchaseOrders as any[],
      deliveries as any[]
    );

    return sortByDate(combined);
  }, [costComparisons, purchaseOrders, deliveries]);

  // Apply filters
  const filteredItems = useMemo(() => {
    return filterDirectActions(allItems, filters);
  }, [allItems, filters]);

  const isLoading = !costComparisons || !purchaseOrders || !deliveries;

  const handleEditItem = (item: DirectActionItem, resetCallback: () => void) => {
    setResetEditingState(() => resetCallback);
    
    switch (item.type) {
      case "cc":
        if (item.requestId) {
          setSelectedCCRequestId(item.requestId);
          setCCDialogOpen(true);
        }
        break;
      case "dc":
        // For direct DCs, open the Direct Delivery dialog in edit mode
        if (item.id) {
          setEditingDirectDCId(item.id as Id<"deliveries">);
          setDirectDeliveryOpen(true);
        }
        break;
      case "po":
        // PO is never editable as per specification
        resetCallback();
        break;
    }
  };

  const handleViewItem = (item: DirectActionItem) => {
    switch (item.type) {
      case "cc":
        // Open CC in read-only viewer - use CostComparisonDialog in preview mode
        if (item.requestId) {
          setSelectedCCRequestId(item.requestId);
          setCCDialogOpen(true);
        }
        break;
      case "dc":
        // Open DC in read-only viewer
        if (item.id) {
          setSelectedDCId(item.id as Id<"deliveries">);
          setDCPreviewOpen(true);
        }
        break;
      case "po":
        // Open PO in the standard view/print format (same as "Approved Requests" sidebar)
        handleViewPO(item);
        break;
    }
  };

  const handleViewPO = (item: DirectActionItem) => {
    // Extract PO number from the raw data
    const poNumber = item.rawData?.poNumber || item.displayId;
    setSelectedPONumber(poNumber);
    setPoPreviewOpen(true);
  };

  const handleViewDC = (deliveryId: Id<"deliveries">) => {
    // Transition from edit form to view modal
    setSelectedDCId(deliveryId);
    setDCPreviewOpen(true);
  };

  const handleCreateCC = () => {
    // Open the pre-step dialog to collect item details
    setDirectCCSetupOpen(true);
  };

  const handleCreateDirectDelivery = () => {
    // Open the direct delivery dialog (Mirror protocol - no selection step)
    setDirectDeliveryOpen(true);
  };

  const handleCCDialogClose = (open: boolean) => {
    setCCDialogOpen(open);
    if (!open) {
      resetEditingState?.();
      setResetEditingState(null);
    }
  };

  const handleUpdateTitle = async (itemId: string, title: string) => {
    const item = allItems.find(i => i.id === itemId);
    if (!item) return;

    try {
      switch (item.type) {
        case "cc":
          await updateCCTitle({ ccId: itemId as Id<"costComparisons">, title });
          break;
        case "po":
          await updatePOTitle({ poId: itemId as Id<"purchaseOrders">, title });
          break;
        case "dc":
          await updateDCTitle({ deliveryId: itemId as Id<"deliveries">, title });
          break;
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to update title");
    }
  };

  return (
    <>
      <Card>
        {showHeader && (
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle>Direct Actions</CardTitle>
              <CardDescription>
                Manage Cost Comparisons, Delivery Challans, and Purchase Orders
              </CardDescription>
            </div>
            {showCreateButton && (
              <ClientWrapper fallback={<Button size="sm" disabled>Loading...</Button>}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Create
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem
                      onClick={handleCreateCC}
                      className="gap-2 cursor-pointer"
                    >
                      <div>
                        <div className="font-medium text-sm">Cost Comparison</div>
                        <div className="text-xs text-muted-foreground">Compare vendor quotes</div>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleCreateDirectDelivery}
                      className="gap-2 cursor-pointer"
                    >
                      <div>
                        <div className="font-medium text-sm">Direct Delivery</div>
                        <div className="text-xs text-muted-foreground">Create dispatch record</div>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </ClientWrapper>
            )}
          </CardHeader>
        )}

        <CardContent className="space-y-4">
          {/* Filters */}
          <DirectActionsFilters filters={filters} onFiltersChange={setFilters} />

          {/* Table */}
          <DirectActionsTable
            items={filteredItems}
            isLoading={isLoading}
            onEdit={handleEditItem}
            onView={handleViewItem}
            onUpdateTitle={handleUpdateTitle}
            emptyMessage={
              filters.searchQuery
                ? "No results found for your search"
                : "No records found"
            }
          />
        </CardContent>
      </Card>

      {/* Dialogs */}
      <ClientWrapper>
        {ccDialogOpen && selectedCCRequestId && (
          <CostComparisonDialog
            open={ccDialogOpen}
            onOpenChange={handleCCDialogClose}
            requestId={selectedCCRequestId}
          />
        )}

        <DirectCCSetupDialog
          open={directCCSetupOpen}
          onOpenChange={setDirectCCSetupOpen}
        />

        <DirectDeliveryDialog
          open={directDeliveryOpen}
          onOpenChange={(open) => {
            setDirectDeliveryOpen(open);
            if (!open) {
              setEditingDirectDCId(null);
            }
          }}
          editingDeliveryId={editingDirectDCId}
          onViewDC={handleViewDC}
          onSuccess={() => {
            // Refresh data after successful creation/update
            allItems; // Trigger re-fetch
          }}
        />

        <PDFPreviewDialog
          open={poPreviewOpen}
          onOpenChange={setPoPreviewOpen}
          poNumber={selectedPONumber}
          type="po"
        />

        <PDFPreviewDialog
          open={dcPreviewOpen}
          onOpenChange={setDCPreviewOpen}
          deliveryId={selectedDCId ? String(selectedDCId) : null}
          type="dc"
        />
      </ClientWrapper>
    </>
  );
}
