/**
 * Sticky Note Card Component
 * 
 * Individual sticky note card with colorful design.
 */

"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Check, Trash2, Edit, Clock, ListTodo, Pencil, ChevronsUp, Equal, ChevronsDown, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format, isToday, isTomorrow, isYesterday, differenceInDays } from "date-fns";
import type { Id } from "@/convex/_generated/dataModel";
import { Checklist, type ChecklistItem } from "./checklist";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface StickyNoteCardProps {
  note: {
    _id: Id<"stickyNotes">;
    title: string;
    content: string;
    color: "yellow" | "pink" | "blue" | "green" | "purple" | "orange";
    reminderAt?: number;
    isCompleted: boolean;
    createdAt: number;
    updatedAt: number;
    checklistItems?: ChecklistItem[];
    assignedTo?: Id<"users">;
    createdBy?: Id<"users">;
    creator?: { _id: Id<"users">; fullName: string } | null;
    assignee?: { _id: Id<"users">; fullName: string } | null;
    priority?: "high" | "medium" | "low";
    dueDate?: number;
  };
  onComplete: (noteId: Id<"stickyNotes">, isCompleted: boolean) => void;
  onDelete: (noteId: Id<"stickyNotes">) => void;
  onEdit: (noteId: Id<"stickyNotes">) => void;
  onChecklistUpdate?: (noteId: Id<"stickyNotes">, items: ChecklistItem[]) => void;
  isCreator: boolean;
  disableDrag?: boolean;
  isManager?: boolean;
  currentUserId?: Id<"users">;
  isFloating?: boolean;
  isNew?: boolean;
}



export function StickyNoteCard({
  note,
  onComplete,
  onDelete,
  onEdit,
  onChecklistUpdate,
  isCreator,
  disableDrag = false,
  isManager = false,
  currentUserId,
  isFloating = false,
  isNew = false,
}: StickyNoteCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);


  // Check if current user is the assignee (note is assigned to them)
  // Check both the populated assignee object AND the raw assignedTo field for reliability
  const isAssignee = currentUserId && (
    note.assignee?._id === currentUserId ||
    note.assignedTo === currentUserId
  );

  // Check if current user created this note
  const isSelfCreated = currentUserId && (
    note.creator?._id === currentUserId ||
    note.createdBy === currentUserId
  );

  // Edit: only allowed if you created the task yourself (self-assigned)
  // If a manager assigned the task to you, you can only Mark Done — no Edit
  const canEdit = isAssignee && isSelfCreated;
  const canDelete = isAssignee && isSelfCreated;

  // Check if note has been edited (updatedAt is different from createdAt)
  const isEdited = note.updatedAt && note.createdAt && note.updatedAt > note.createdAt + 1000; // 1 second buffer for timing differences

  const isOverdue = note.dueDate ? Date.now() > note.dueDate && !note.isCompleted : false;

  // Smart relative date label
  const formatSmartDate = (timestamp: number, showTime = false): string => {
    const date = new Date(timestamp);
    const timeStr = showTime ? `, ${format(date, "h:mm a")}` : "";
    if (isToday(date)) return `Today${timeStr}`;
    if (isTomorrow(date)) return `Tomorrow${timeStr}`;
    if (isYesterday(date)) return `Yesterday${timeStr}`;
    const diff = differenceInDays(date, new Date());
    if (diff > 0 && diff <= 6) return `${format(date, "EEEE")}${timeStr}`; // e.g. "Monday"
    return format(date, "MMM d") + timeStr;
  };
  const getPriorityBorder = () => {
    switch (note.priority) {
      case "high": return "border-l-4 border-l-red-500 border-t-border/60 border-r-border/60 border-b-border/60";
      case "medium": return "border-l-4 border-l-orange-500 border-t-border/60 border-r-border/60 border-b-border/60";
      case "low": return "border-l-4 border-l-blue-500 border-t-border/60 border-r-border/60 border-b-border/60";
      default: return "border border-border/60";
    }
  };

  const getPriorityIcon = () => {
    switch (note.priority) {
      case "high": return <ChevronsUp className="w-4 h-4 text-red-500" />;
      case "medium": return <Equal className="w-4 h-4 text-orange-500" />;
      case "low": return <ChevronsDown className="w-4 h-4 text-blue-500" />;
      default: return null;
    }
  };

  const colorClass = `bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow ${getPriorityBorder()}`;

  useEffect(() => {
    const savedPosition = localStorage.getItem(`sticky-note-pos-${note._id}`);
    if (savedPosition) {
      try {
        const pos = JSON.parse(savedPosition);
        setPosition(pos);
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, [note._id]);

  // Save position to localStorage
  useEffect(() => {
    if (position.x !== 0 || position.y !== 0) {
      localStorage.setItem(`sticky-note-pos-${note._id}`, JSON.stringify(position));
    }
  }, [position, note._id]);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Disable dragging if disableDrag is true
    if (disableDrag) return;

    // Only start drag if clicking on the drag handle or card header area
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('input') || target.closest('textarea')) {
      return; // Don't drag if clicking buttons or inputs
    }

    // Only allow dragging from the top area of the card
    const card = cardRef.current;
    if (!card) return;

    const cardRect = card.getBoundingClientRect();
    const clickY = e.clientY - cardRect.top;

    // Only allow dragging if clicking in the top 60px (header area)
    if (clickY > 60) return;

    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !cardRef.current) return;

    const container = cardRef.current.closest('.sticky-notes-container');
    if (!container) {
      // Fallback to document if container not found
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      setPosition({ x: newX, y: newY });
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const cardWidth = cardRef.current.offsetWidth || 300;
    const cardHeight = cardRef.current.offsetHeight || 200;

    const newX = e.clientX - containerRect.left - dragStart.x;
    const newY = e.clientY - containerRect.top - dragStart.y;

    // Constrain to container bounds
    const maxX = Math.max(0, containerRect.width - cardWidth);
    const maxY = Math.max(0, containerRect.height - cardHeight);

    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY)),
    });
  };

  useEffect(() => {
    if (!isDragging) return;

    const moveHandler = (e: MouseEvent) => {
      if (!cardRef.current) return;

      const container = cardRef.current.closest('.sticky-notes-container');
      if (!container) {
        const newX = e.clientX - dragStart.x;
        const newY = e.clientY - dragStart.y;
        setPosition({ x: newX, y: newY });
        return;
      }

      const containerRect = container.getBoundingClientRect();
      const cardWidth = cardRef.current.offsetWidth || 300;
      const cardHeight = cardRef.current.offsetHeight || 200;

      const newX = e.clientX - containerRect.left - dragStart.x;
      const newY = e.clientY - containerRect.top - dragStart.y;

      const maxX = Math.max(0, containerRect.width - cardWidth);
      const maxY = Math.max(0, containerRect.height - cardHeight);

      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    };

    const upHandler = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', moveHandler);
    document.addEventListener('mouseup', upHandler);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grabbing';

    return () => {
      document.removeEventListener('mousemove', moveHandler);
      document.removeEventListener('mouseup', upHandler);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isDragging, dragStart]);

  return (
    <div
      ref={cardRef}
      className={cn(
        "relative p-4 rounded-lg transition-all duration-300 ease-out",
        "select-none",
        "flex flex-col",
        disableDrag ? "h-full w-full" : "min-h-[220px] w-full",
        disableDrag && "max-h-none",
        disableDrag ? "cursor-default" : "cursor-pointer",
        colorClass,
        note.isCompleted && "opacity-60",
        isDragging && "z-50 scale-105 shadow-2xl",
        !isDragging && "hover:transition-all hover:duration-300 hover:ease-out",
        isFloating && "backdrop-blur-0",
        !isFloating && "backdrop-blur-sm",
        isFloating && "transform-gpu", // Better performance for floating notes
        // Ensure color is maintained during drag
        isDragging && isFloating && "!bg-inherit",
        isOverdue && "shadow-red-500/20 shadow-md dark:shadow-red-900/20"
      )}
      style={{
        transform: disableDrag
          ? 'none'
          : position.x !== 0 || position.y !== 0
            ? `translate(${position.x}px, ${position.y}px)`
            : `none`,
        position: disableDrag || (position.x === 0 && position.y === 0) ? 'relative' : 'absolute',
        left: disableDrag || (position.x === 0 && position.y === 0) ? 'auto' : 0,
        top: disableDrag || (position.x === 0 && position.y === 0) ? 'auto' : 0,
      }}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => !isDragging && setIsHovered(false)}
    >
      {/* Drag Handle Area - For Rnd component */}
      {disableDrag && (
        <div className="sticky-note-drag-handle absolute top-0 left-0 right-0 h-12 cursor-move z-10" />
      )}
      <div className="flex flex-col h-full min-h-0">
        {/* Content Area */}
        <div className={cn("flex-1 min-h-0", disableDrag ? "overflow-y-auto overflow-x-hidden" : "overflow-hidden")}>
          {/* Title and Status */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-start gap-2">
              <h3 className={cn(
                "font-bold text-base leading-tight",
                disableDrag ? "" : "line-clamp-2",
                note.isCompleted && "line-through decoration-2",
                // Ensure text color matches note color theme
                isFloating && "text-inherit"
              )}>
                {note.title}
              </h3>
              {isNew && !note.isCompleted && (
                <div className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 mt-0.5 whitespace-nowrap border border-blue-200 dark:border-blue-800/40 shadow-sm animate-in fade-in zoom-in duration-300">
                  New
                </div>
              )}
            </div>
            <div className="flex gap-1.5 shrink-0 items-center mt-0.5">
                {isOverdue && <span className="text-[9px] font-bold text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/50 px-1.5 py-0.5 rounded uppercase tracking-wider border border-red-200 dark:border-red-800">Overdue</span>}
                {note.priority && (
                    <div title={`Priority: ${note.priority}`} className="flex items-center justify-center bg-muted/50 p-1 rounded-md">
                      {getPriorityIcon()}
                    </div>
                )}
            </div>
          </div>

          {/* Content */}
          {note.content && note.content.trim() && (
            <p className={cn(
              "text-sm mb-3 whitespace-pre-wrap break-words leading-relaxed",
              disableDrag ? "" : "line-clamp-3",
              note.isCompleted && "line-through decoration-2",
              // Ensure text color matches note color theme
              isFloating ? "text-inherit opacity-95" : "opacity-90"
            )}>
              {note.content}
            </p>
          )}

          {/* Checklist */}
          {note.checklistItems && note.checklistItems.length > 0 && (
            <div className="mb-3">
              <Checklist
                items={note.checklistItems}
                onChange={(items) => {
                  if (onChecklistUpdate) {
                    onChecklistUpdate(note._id, items);
                  }
                }}
                readonly={!onChecklistUpdate}
                canAddItems={canEdit}
              />
            </div>
          )}

          {/* Bottom Section */}
          <div className="space-y-1.5 mt-auto">
            {/* Due Date */}
            {note.dueDate && (
              <div className={cn("flex items-center gap-1.5 text-xs px-2 py-1 rounded-md bg-black/5 dark:bg-white/5 backdrop-blur-sm", isOverdue && "text-red-700 dark:text-red-300 bg-red-100/50 dark:bg-red-900/30 border border-red-200/50 dark:border-red-800/50")}>
                <Clock className="h-3 w-3 opacity-70" />
                <span className="font-medium opacity-80">Due: {formatSmartDate(note.dueDate)}</span>
              </div>
            )}

            {/* Reminder */}
            {note.reminderAt && (
              <div className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-md bg-purple-100/50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/50">
                <Bell className="h-3 w-3" />
                <span className="font-medium">Reminder: {formatSmartDate(note.reminderAt, true)}</span>
              </div>
            )}

            {/* Assignment info for managers - only show if assigned to someone else */}
            {isManager && note.assignee && note.assignee.fullName && currentUserId && note.assignee._id !== currentUserId && (
              <div className="text-xs font-semibold px-2 py-1.5 rounded-md bg-primary/10 dark:bg-primary/20 border border-primary/20 dark:border-primary/30 text-primary dark:text-primary-foreground">
                Assigned to: {note.assignee.fullName}
              </div>
            )}

            {/* Creator info (if not self) */}
            {note.creator && !isCreator && note.creator.fullName && (
              <div className="text-xs opacity-50 font-medium">
                From {note.creator.fullName}
              </div>
            )}

            {/* Timestamp and Edited indicator */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="text-xs opacity-50 font-medium">
                {formatSmartDate(note.createdAt, true)}
              </div>
              {isEdited && (
                <div className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-blue-100/50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/50">
                  <Pencil className="h-3 w-3" />
                  <span className="font-medium">Edited</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions - Always Visible at Bottom */}
        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-current/10 shrink-0">
          {/* Done/Undo button - Only show if note is assigned to current user */}
          {isAssignee && (
            <Button
              size="sm"
              variant={note.isCompleted ? "default" : "ghost"}
              onClick={(e) => {
                e.stopPropagation();
                onComplete(note._id, !note.isCompleted);
              }}
              className={cn(
                "h-9 px-4 text-xs font-semibold flex-1 min-w-0 transition-all duration-300 group relative overflow-hidden",
                note.isCompleted
                  ? "bg-orange-600 hover:bg-orange-700 dark:bg-orange-600 dark:hover:bg-orange-700 text-white shadow-md hover:shadow-lg"
                  : "hover:bg-green-100 dark:hover:bg-green-900/30 hover:text-green-700 dark:hover:text-green-300 hover:scale-[1.02] active:scale-[0.98] hover:shadow-sm border border-green-200/50 dark:border-green-800/50"
              )}
              title={note.isCompleted ? "Mark as incomplete" : "Mark as complete"}
            >
              {/* Shine effect on hover */}
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />

              <div className="relative flex items-center justify-center gap-2">
                {note.isCompleted ? (
                  <>
                    {/* Undo icon */}
                    <svg className="h-4 w-4 text-white transition-transform duration-300 group-hover:rotate-[-12deg]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                    </svg>
                    <span className="truncate font-medium">Undo</span>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-center rounded-full bg-green-500/10 dark:bg-green-500/20 w-5 h-5 group-hover:bg-green-500/20 dark:group-hover:bg-green-500/30 transition-all duration-300">
                      <Check className="h-3 w-3 text-green-600 dark:text-green-400 group-hover:scale-110 group-hover:rotate-12 transition-all duration-300" />
                    </div>
                    <span className="truncate font-medium">Mark Done</span>
                  </>
                )}
              </div>
            </Button>
          )}

          {/* Edit button - Show only if assignee 
              - Only the assigned manager can edit the note */}
          {canEdit && (
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(note._id);
              }}
              className={`h-8 ${(isAssignee && !isCreator) || (isCreator && !isAssignee) ? 'flex-1 px-3' : 'w-8 p-0'} shrink-0 transition-all duration-200 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-300 hover:scale-110 active:scale-95 hover:rotate-6 group hover:shadow-sm`}
              title="Edit note"
            >
              <Edit className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
              {((isAssignee && !isCreator) || (isCreator && !isAssignee)) && (
                <span className="ml-1.5 text-xs">Edit</span>
              )}
            </Button>
          )}

          {/* Delete button - Only show if assignee 
              - Only the assigned manager can delete the note */}
          {canDelete && (
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteDialog(true);
              }}
              className="h-8 w-8 p-0 shrink-0 text-red-600 dark:text-red-400 transition-all duration-200 hover:bg-red-100 dark:hover:bg-red-950/50 hover:text-red-700 dark:hover:text-red-300 hover:scale-110 active:scale-95 hover:rotate-[-6deg] group hover:shadow-sm"
              title="Delete note"
            >
              <Trash2 className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
            </Button>
          )}
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Task?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{note.title}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(note._id);
                  setShowDeleteDialog(false);
                }}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

