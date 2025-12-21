"use client";

/**
 * Request Card with Cost Comparison Info
 * 
 * Shows request details with cost comparison status and rejection notes if applicable.
 */

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Edit, FileText } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

interface Request {
  _id: Id<"requests">;
  requestNumber: string;
  itemName: string;
  quantity: number;
  unit: string;
  requiredBy: number;
  description?: string;
  isUrgent: boolean;
  status: string;
  site?: {
    name: string;
  } | null;
  creator?: {
    fullName: string;
  } | null;
}

interface RequestCardWithCCProps {
  request: Request;
  statusInfo: {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    icon: any;
  };
  onViewDetails: (requestId: Id<"requests">) => void;
  onOpenCC?: (requestId: Id<"requests">) => void;
}

export function RequestCardWithCC({ request, statusInfo, onViewDetails, onOpenCC }: RequestCardWithCCProps) {
  const StatusIcon = statusInfo.icon;
  
  // Fetch cost comparison for this request
  const costComparison = useQuery(
    api.costComparisons.getCostComparisonByRequestId,
    { requestId: request._id }
  );

  const isRejected = costComparison?.status === "cc_rejected";
  const showResubmit = request.status === "ready_for_cc" && isRejected;

  return (
    <Card key={request._id} className={isRejected ? "border-destructive/50" : ""}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className="font-semibold text-base">{request.itemName}</span>
              <Badge variant={statusInfo.variant} className="text-xs">
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusInfo.label}
              </Badge>
              {request.isUrgent && (
                <Badge variant="destructive" className="text-xs">Urgent</Badge>
              )}
              {isRejected && (
                <Badge variant="destructive" className="text-xs gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Rejected
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span><span className="font-medium">ID:</span> {request.requestNumber}</span>
              <span><span className="font-medium">Site:</span> {request.site?.name || "N/A"}</span>
              <span><span className="font-medium">Qty:</span> {request.quantity} {request.unit}</span>
              <span><span className="font-medium">By:</span> {new Date(request.requiredBy).toLocaleDateString()}</span>
            </div>

            {/* Rejection Notes - Compact */}
            {isRejected && costComparison?.managerNotes && (
              <div className="mt-2 p-2 bg-destructive/10 border border-destructive/20 rounded text-xs">
                <span className="font-semibold text-destructive">Rejected: </span>
                <span className="text-muted-foreground">{costComparison.managerNotes}</span>
              </div>
            )}
          </div>

          <div className="flex gap-2 shrink-0">
            {request.status === "ready_for_cc" && onOpenCC && (
              <Button
                size="sm"
                onClick={() => onOpenCC(request._id)}
                className="text-xs"
              >
                {showResubmit ? (
                  <>
                    <Edit className="h-3 w-3 mr-1" />
                    Resubmit
                  </>
                ) : (
                  <>
                    <FileText className="h-3 w-3 mr-1" />
                    CC
                  </>
                )}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onViewDetails(request._id)}
              className="text-xs"
            >
              View
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

