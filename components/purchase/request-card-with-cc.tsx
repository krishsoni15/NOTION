"use client";

/**
 * Purchase Request Card - Matches Requests-Table Layout Exactly
 *
 * Shows request details in the same card format as manager/site pages.
 * Consistent styling and layout across all user roles.
 */

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Edit, FileText, MapPin, Eye } from "lucide-react";
import { CompactImageGallery } from "@/components/ui/image-gallery";
import { cn } from "@/lib/utils";
import type { Id } from "@/convex/_generated/dataModel";

interface Request {
  _id: Id<"requests">;
  requestNumber: string;
  itemName: string;
  quantity: number;
  unit: string;
  requiredBy: number;
  description?: string;
  specsBrand?: string;
  isUrgent: boolean;
  status: string;
  photo?: {
    imageUrl: string;
    imageKey: string;
  };
  photos?: Array<{
    imageUrl: string;
    imageKey: string;
  }>;
  createdAt: number;
  site?: {
    _id: Id<"sites">;
    name: string;
    code?: string;
    address?: string;
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
  viewMode?: "compact" | "detailed";
  showSiteInfo?: boolean;
  showCreatorInfo?: boolean;
  onSiteClick?: (siteId: Id<"sites">) => void;
  onItemClick?: (itemName: string) => void;
}

// Helper function to collect photos from both photo and photos fields
const getItemPhotos = (item: Request) => {
  const photos: Array<{ imageUrl: string; imageKey: string }> = [];

  // Check for new photos array first
  if (item.photos && item.photos.length > 0) {
    item.photos.forEach((photo) => {
      photos.push({
        imageUrl: photo.imageUrl,
        imageKey: photo.imageKey,
      });
    });
  }
  // Fallback to legacy photo field
  else if (item.photo) {
    photos.push({
      imageUrl: item.photo.imageUrl,
      imageKey: item.photo.imageKey,
    });
  }

  return photos;
};

const handleOpenInMap = (address: string) => {
  const encodedAddress = encodeURIComponent(address);
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
  window.open(mapUrl, '_blank');
};

export function RequestCardWithCC({
  request,
  statusInfo,
  onViewDetails,
  onOpenCC,
  viewMode = "detailed",
  showSiteInfo = true,
  showCreatorInfo = false,
  onSiteClick,
  onItemClick
}: RequestCardWithCCProps) {
  const StatusIcon = statusInfo.icon;

  // Fetch cost comparison for this request
  const costComparison = useQuery(
    api.costComparisons.getCostComparisonByRequestId,
    { requestId: request._id }
  );

  const isRejected = costComparison?.status === "cc_rejected";
  const showResubmit = request.status === "ready_for_cc" && isRejected;
  const itemPhotos = getItemPhotos(request);

  // Always use detailed view that matches requests-table layout exactly
  return (
    <div
      className={cn(
        "border rounded-lg p-3 sm:p-4 bg-card shadow-sm grouped-card-hover touch-manipulation",
        "transition-all duration-200 hover:shadow-md"
      )}
    >
      {/* Card Header - Matches requests-table exactly */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-nowrap overflow-x-auto">
            <span className="font-mono text-xs font-semibold text-primary flex-shrink-0">
              #{request.requestNumber}
            </span>
            <Badge variant={statusInfo.variant} className="text-xs flex-shrink-0">
              <StatusIcon className="h-3 w-3 mr-1" />
              {statusInfo.label}
            </Badge>
            {request.isUrgent && request.status !== "direct_po" && request.directAction !== "po" && (
              <Badge variant="destructive" className="text-xs flex-shrink-0">
                <AlertCircle className="h-3 w-3 mr-1" />
                Urgent
              </Badge>
            )}
            {isRejected && (
              <Badge variant="destructive" className="text-xs flex-shrink-0">
                <AlertCircle className="h-3 w-3 mr-1" />
                Rejected
              </Badge>
            )}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {request.site?.address && (
                <button
                  onClick={() => handleOpenInMap(request.site?.address || '')}
                  className="text-primary hover:text-primary/80 hover:bg-primary/10 rounded-full p-2 transition-colors shrink-0 border border-primary/20 hover:border-primary/40"
                  title="Open in Maps"
                >
                  <MapPin className="h-3.5 w-3.5" />
                </button>
              )}
              {request.site ? (
                onSiteClick && request.site._id ? (
                  <button
                    onClick={() => onSiteClick(request.site!._id as Id<"sites">)}
                    className="font-semibold text-sm text-foreground hover:text-primary hover:bg-muted/50 rounded-full px-3 py-1.5 -mx-2 -my-1 transition-colors cursor-pointer text-left truncate flex-1 border border-transparent hover:border-primary/20"
                  >
                    {request.site.name}
                    {request.site.code && <span className="text-muted-foreground ml-1">({request.site.code})</span>}
                  </button>
                ) : (
                  <span className="font-semibold text-sm truncate flex-1">
                    {request.site.name}
                    {request.site.code && <span className="text-muted-foreground ml-1">({request.site.code})</span>}
                  </span>
                )
              ) : (
                "—"
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Item Details - Matches requests-table item card layout exactly */}
      <div className="space-y-3">
        <div className="p-3 rounded-lg border bg-card/50 shadow-sm">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <Badge variant="outline" className="text-xs px-1.5 py-0.5 h-5 min-w-[24px] flex items-center justify-center flex-shrink-0">
                1
              </Badge>
              <div className="space-y-1 text-sm flex-1 min-w-0">
                <div className="break-words">
                  <span className="font-medium text-muted-foreground">Item:</span>{" "}
                  {onItemClick ? (
                    <button
                      onClick={() => onItemClick(request.itemName)}
                      className="font-semibold text-sm text-foreground hover:text-primary hover:bg-muted/50 rounded-full px-3 py-1.5 -mx-2 -my-1 transition-colors cursor-pointer text-left border border-transparent hover:border-primary/20 whitespace-normal"
                    >
                      {request.itemName}
                    </button>
                  ) : (
                    <span className="font-semibold text-sm">{request.itemName}</span>
                  )}
                </div>
                {request.description && (
                  <div className="text-xs text-muted-foreground break-words whitespace-normal">
                    <span className="font-medium">Dis:</span> {request.description}
                  </div>
                )}
                <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-2">
                  <span><span className="font-medium">Quantity:</span> {request.quantity} {request.unit}</span>
                  {request.specsBrand && (
                    <span className="text-primary">• {request.specsBrand}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <CompactImageGallery
                images={itemPhotos}
                maxDisplay={1}
                size="md"
              />
            </div>
          </div>
          {/* Status badges on new line */}
          <div className="flex items-center justify-between pt-2 border-t mt-2">
            <div className="flex items-center gap-2">
              {request.isUrgent && request.status !== "direct_po" && request.directAction !== "po" && (
                <Badge variant="destructive" className="text-xs flex-shrink-0">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Urgent
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <span><span className="font-medium">Required by:</span> {new Date(request.requiredBy).toLocaleDateString()}</span>
                <span><span className="font-medium">Created:</span> {new Date(request.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Rejection Notes */}
        {isRejected && costComparison?.managerNotes && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-destructive text-sm">Rejection Reason:</span>
                <p className="text-sm text-muted-foreground mt-1 break-words">{costComparison.managerNotes}</p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            {showCreatorInfo && request.creator && (
              <span className="text-xs text-muted-foreground">
                <span className="font-medium">Requested by:</span> {request.creator.fullName}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {request.status === "ready_for_cc" && onOpenCC && (
              <Button
                size="sm"
                onClick={() => onOpenCC(request._id)}
                className="text-xs h-8"
              >
                {showResubmit ? (
                  <>
                    <Edit className="h-3 w-3 mr-1" />
                    <span className="hidden sm:inline">Resubmit</span>
                  </>
                ) : (
                  <>
                    <FileText className="h-3 w-3 mr-1" />
                    <span className="hidden sm:inline">CC</span>
                  </>
                )}
              </Button>
            )}
            <Button
              variant="default"
              size="sm"
              onClick={() => onViewDetails(request._id)}
              className="text-xs h-8 bg-primary hover:bg-primary/90"
            >
              <Eye className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">View Details</span>
              <span className="sm:hidden">View</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}