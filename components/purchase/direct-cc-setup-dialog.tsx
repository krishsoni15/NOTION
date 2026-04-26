"use client";

/**
 * RFQ (Request for Quotation) Dialog
 *
 * Reuses the Material Request form to create a request, then immediately opens the Cost Comparison dialog.
 * This integrates RFQ into the existing Request → CC → PO → DC workflow.
 */

import { useState } from "react";
import { MaterialRequestForm } from "@/components/requests/material-request-form";
import { CostComparisonDialog } from "./cost-comparison-dialog";
import type { Id } from "@/convex/_generated/dataModel";

interface DirectCCSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DirectCCSetupDialog({ open, onOpenChange }: DirectCCSetupDialogProps) {
  // State to track when Material Request form successfully creates a request
  const [ccRequestId, setCCRequestId] = useState<Id<"requests"> | null>(null);
  const [ccDialogOpen, setCCDialogOpen] = useState(false);

  return (
    <>
      {/* Reuse Material Request Form - it will create the request */}
      <MaterialRequestForm
        open={open}
        onOpenChange={onOpenChange}
        isRFQMode={true}
        onRFQRequestCreated={(requestId) => {
          // After request is created, close material request form and open CC dialog
          onOpenChange(false);
          setCCRequestId(requestId);
          setCCDialogOpen(true);
        }}
      />

      {/* CC dialog opens after request is created */}
      {ccRequestId && (
        <CostComparisonDialog
          open={ccDialogOpen}
          onOpenChange={(v) => {
            setCCDialogOpen(v);
            if (!v) setCCRequestId(null);
          }}
          requestId={ccRequestId}
        />
      )}
    </>
  );
}
