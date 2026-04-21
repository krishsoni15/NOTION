"use client";

/**
 * Unified Direct Actions Table
 * 
 * Displays CC, DC, and PO in a single table with:
 * - ID (CC-001 / DC-001 / PO-001)
 * - Title (Optional user-defined title)
 * - Status
 * - Created Date
 * - Actions (Edit only)
 */

import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Edit, Loader2, Check, X, Plus, Eye } from "lucide-react";
import type { DirectActionItem } from "./types";
import { getStatusColor, getStatusLabel, formatDate, getEntityLabel, getActionButtonType } from "./utils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface DirectActionsTableProps {
  items: DirectActionItem[];
  isLoading?: boolean;
  onEdit?: (item: DirectActionItem, resetEditingState: () => void) => void;
  onView?: (item: DirectActionItem) => void;
  onUpdateTitle?: (itemId: string, title: string) => void;
  emptyMessage?: string;
}

export function DirectActionsTable({
  items,
  isLoading = false,
  onEdit,
  onView,
  onUpdateTitle,
  emptyMessage = "No records found",
}: DirectActionsTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [titleInput, setTitleInput] = useState("");

  const handleAction = (item: DirectActionItem) => {
    const actionType = getActionButtonType(item);
    setEditingId(item.id);
    
    if (actionType === "edit") {
      onEdit?.(item, resetEditingState);
    } else {
      onView?.(item);
      // Reset immediately for view actions since no dialog might open
      resetEditingState();
    }
  };

  // Reset editing state when needed
  const resetEditingState = () => {
    setEditingId(null);
  };

  const handleStartTitleEdit = (item: DirectActionItem) => {
    setEditingTitle(item.id);
    setTitleInput(item.customTitle || "");
  };

  const handleSaveTitleEdit = (item: DirectActionItem) => {
    const newTitle = titleInput.trim();
    onUpdateTitle?.(item.id, newTitle);
    setEditingTitle(null);
    setTitleInput("");
    if (newTitle) {
      toast.success("Title updated");
    } else {
      toast.success("Title removed");
    }
  };

  const handleCancelTitleEdit = () => {
    setEditingTitle(null);
    setTitleInput("");
  };

  const formatDisplayTitle = (item: DirectActionItem) => {
    return item.customTitle || "";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading records...</p>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 border rounded-lg bg-muted/30">
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[15%]">ID</TableHead>
            <TableHead className="w-[35%]">Title</TableHead>
            <TableHead className="w-[20%]">Status</TableHead>
            <TableHead className="w-[15%]">Created Date</TableHead>
            <TableHead className="w-[15%] text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow
              key={item.id}
              className="hover:bg-muted/50 transition-colors"
            >
              {/* ID Column - Standardized document format */}
              <TableCell className="text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-base text-foreground">
                    {item.displayId}
                  </span>
                  <div className="text-xs text-muted-foreground">
                    {getEntityLabel(item.type)}
                  </div>
                </div>
              </TableCell>

              {/* Title Column - Editable */}
              <TableCell className="text-sm">
                {editingTitle === item.id ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={titleInput}
                      onChange={(e) => setTitleInput(e.target.value)}
                      placeholder="Enter title"
                      className="h-8 text-sm flex-1"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleSaveTitleEdit(item);
                        } else if (e.key === "Escape") {
                          handleCancelTitleEdit();
                        }
                      }}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={() => handleSaveTitleEdit(item)}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      onClick={handleCancelTitleEdit}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 group min-h-[32px]">
                    <span className="text-foreground flex-1">
                      {formatDisplayTitle(item) || (
                        <span className="text-muted-foreground italic">No title</span>
                      )}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleStartTitleEdit(item)}
                      title={item.customTitle ? "Edit title" : "Add title"}
                    >
                      {item.customTitle ? (
                        <Edit className="h-3 w-3" />
                      ) : (
                        <Plus className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                )}
              </TableCell>

              {/* Status Column */}
              <TableCell>
                <Badge className={cn("font-medium text-xs", getStatusColor(item.status, item.type))}>
                  {getStatusLabel(item.status)}
                </Badge>
              </TableCell>

              {/* Created Date Column */}
              <TableCell className="text-sm text-muted-foreground">
                {formatDate(item.createdDate)}
              </TableCell>

              {/* Actions Column - Dynamic based on status */}
              <TableCell className="text-right">
                {(() => {
                  const actionType = getActionButtonType(item);
                  const isEditing = editingId === item.id;
                  
                  if (actionType === "edit") {
                    return (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAction(item)}
                        disabled={isEditing}
                        className="gap-1"
                      >
                        <Edit className="h-4 w-4" />
                        <span className="hidden sm:inline text-xs">Edit</span>
                      </Button>
                    );
                  } else {
                    return (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAction(item)}
                        disabled={isEditing}
                        className="gap-1"
                      >
                        <Eye className="h-4 w-4" />
                        <span className="hidden sm:inline text-xs">View</span>
                      </Button>
                    );
                  }
                })()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
