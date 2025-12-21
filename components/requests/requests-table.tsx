"use client";

/**
 * Requests Table Component
 * 
 * Displays material requests in a table with status badges, urgent tags, and filtering.
 */

import { useState } from "react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Eye, AlertCircle, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Id } from "@/convex/_generated/dataModel";

type RequestStatus = 
  | "pending" 
  | "approved" 
  | "rejected" 
  | "ready_for_cc"
  | "cc_rejected"
  | "cc_pending"
  | "cc_approved"
  | "ready_for_po"
  | "delivery_stage"
  | "delivered";

interface Request {
  _id: Id<"requests">;
  requestNumber: string;
  createdBy: Id<"users">;
  siteId: Id<"sites">;
  itemName: string;
  description: string;
  specsBrand?: string;
  quantity: number;
  unit: string;
  requiredBy: number;
  isUrgent: boolean;
  photo?: {
    imageUrl: string;
    imageKey: string;
  };
  status: RequestStatus;
  approvedBy?: Id<"users">;
  approvedAt?: number;
  rejectionReason?: string;
  deliveryMarkedAt?: number;
  notes?: string;
  createdAt: number;
  updatedAt: number;
  site?: {
    _id: Id<"sites">;
    name: string;
    code?: string;
    address?: string;
  } | null;
  creator?: {
    _id: Id<"users">;
    fullName: string;
  } | null;
  approver?: {
    _id: Id<"users">;
    fullName: string;
  } | null;
}

interface RequestsTableProps {
  requests: Request[] | undefined;
  onViewDetails?: (requestId: Id<"requests">) => void;
  onOpenCC?: (requestId: Id<"requests">) => void; // Open cost comparison dialog
  showCreator?: boolean; // Show creator column (for manager view)
}

export function RequestsTable({
  requests,
  onViewDetails,
  onOpenCC,
  showCreator = false,
}: RequestsTableProps) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  if (!requests) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>;
  }

  // Filter requests
  let filteredRequests = requests;

  // Filter by status
  if (statusFilter !== "all") {
    filteredRequests = filteredRequests.filter(
      (req) => req.status === statusFilter
    );
  }

  // Filter by search query
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filteredRequests = filteredRequests.filter(
      (req) =>
        req.requestNumber.toLowerCase().includes(query) ||
        req.itemName.toLowerCase().includes(query) ||
        req.site?.name.toLowerCase().includes(query) ||
        req.creator?.fullName.toLowerCase().includes(query)
    );
  }

  // Get status badge variant
  const getStatusBadge = (status: RequestStatus) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800">
            Pending
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800">
            Approved
          </Badge>
        );
      case "ready_for_cc":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
            Ready for CC
          </Badge>
        );
      case "cc_pending":
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800">
            CC Pending
          </Badge>
        );
      case "cc_approved":
        return (
          <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-800">
            CC Approved
          </Badge>
        );
      case "ready_for_po":
        return (
          <Badge variant="outline" className="bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950 dark:text-cyan-300 dark:border-cyan-800">
            Ready for PO
          </Badge>
        );
      case "delivery_stage":
        return (
          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800">
            Delivery Stage
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800">
            Rejected
          </Badge>
        );
      case "delivered":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800">
            Delivered
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (filteredRequests.length === 0 && requests.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No requests yet. Create your first request to get started.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <Input
            placeholder="Search by request number, item, site, or creator..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="ready_for_cc">Ready for CC</SelectItem>
            <SelectItem value="cc_rejected">CC Rejected</SelectItem>
            <SelectItem value="cc_pending">CC Pending</SelectItem>
            <SelectItem value="cc_approved">CC Approved</SelectItem>
            <SelectItem value="ready_for_po">Ready for PO</SelectItem>
            <SelectItem value="delivery_stage">Delivery Stage</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {filteredRequests.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No requests found matching your filters.
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request #</TableHead>
                <TableHead>Site Location</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Required By</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tags</TableHead>
                {showCreator && <TableHead>Created By</TableHead>}
                <TableHead>Created Date</TableHead>
                {onViewDetails && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.map((request) => (
                <TableRow key={request._id}>
                  <TableCell className="font-medium font-mono text-xs">
                    {request.requestNumber}
                  </TableCell>
                  <TableCell>
                    {request.site?.name || "—"}
                    {request.site?.code && (
                      <span className="text-muted-foreground ml-1">
                        ({request.site.code})
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{request.itemName}</div>
                      {request.description && (
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {request.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {request.quantity} {request.unit}
                  </TableCell>
                  <TableCell>
                    {format(new Date(request.requiredBy), "dd/MM/yyyy")}
                  </TableCell>
                  <TableCell>{getStatusBadge(request.status)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {request.isUrgent && (
                        <Badge
                          variant="destructive"
                          className="flex items-center gap-1"
                        >
                          <AlertCircle className="h-3 w-3" />
                          Urgent
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  {showCreator && (
                    <TableCell>
                      {request.creator?.fullName || "—"}
                    </TableCell>
                  )}
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(request.createdAt), "dd/MM/yyyy hh:mm a")}
                  </TableCell>
                  {onViewDetails && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {/* CC button for cost comparison statuses */}
                        {(request.status === "cc_pending" || request.status === "ready_for_cc") && onOpenCC && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onOpenCC(request._id)}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            CC
                          </Button>
                        )}
                        {/* View button - always show for all statuses */}
                        <Button
                          variant={request.status === "pending" ? "default" : "ghost"}
                          size="sm"
                          onClick={() => onViewDetails(request._id)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          {request.status === "pending" ? "Review" : "View"}
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

