/**
 * Sticky Note Card Component
 * 
 * Individual sticky note card with colorful design.
 */

"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Check, Trash2, Edit, Clock, ListTodo, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
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
    creator?: { _id: Id<"users">; fullName: string } | null;
    assignee?: { _id: Id<"users">; fullName: string } | null;
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
}

const colorClasses = {
  yellow: "bg-gradient-to-br from-yellow-50 via-yellow-50/90 to-yellow-100/70 dark:from-yellow-950/50 dark:via-yellow-900/30 dark:to-yellow-800/20 border-2 border-yellow-300/80 dark:border-yellow-700/60 text-yellow-900 dark:text-yellow-100 shadow-lg shadow-yellow-200/30 dark:shadow-yellow-900/20 hover:shadow-xl hover:shadow-yellow-400/50 dark:hover:shadow-yellow-700/40 hover:border-yellow-400/100 dark:hover:border-yellow-600/80 hover:scale-[1.02] hover:from-yellow-50 hover:via-yellow-50 hover:to-yellow-100 dark:hover:from-yellow-950/60 dark:hover:via-yellow-900/40 dark:hover:to-yellow-800/30 hover:ring-2 hover:ring-yellow-300/30 dark:hover:ring-yellow-700/30",
  pink: "bg-gradient-to-br from-pink-50 via-pink-50/90 to-pink-100/70 dark:from-pink-950/50 dark:via-pink-900/30 dark:to-pink-800/20 border-2 border-pink-300/80 dark:border-pink-700/60 text-pink-900 dark:text-pink-100 shadow-lg shadow-pink-200/30 dark:shadow-pink-900/20 hover:shadow-xl hover:shadow-pink-400/50 dark:hover:shadow-pink-700/40 hover:border-pink-400/100 dark:hover:border-pink-600/80 hover:scale-[1.02] hover:from-pink-50 hover:via-pink-50 hover:to-pink-100 dark:hover:from-pink-950/60 dark:hover:via-pink-900/40 dark:hover:to-pink-800/30 hover:ring-2 hover:ring-pink-300/30 dark:hover:ring-pink-700/30",
  blue: "bg-gradient-to-br from-blue-50 via-blue-50/90 to-blue-100/70 dark:from-blue-950/50 dark:via-blue-900/30 dark:to-blue-800/20 border-2 border-blue-300/80 dark:border-blue-700/60 text-blue-900 dark:text-blue-100 shadow-lg shadow-blue-200/30 dark:shadow-blue-900/20 hover:shadow-xl hover:shadow-blue-400/50 dark:hover:shadow-blue-700/40 hover:border-blue-400/100 dark:hover:border-blue-600/80 hover:scale-[1.02] hover:from-blue-50 hover:via-blue-50 hover:to-blue-100 dark:hover:from-blue-950/60 dark:hover:via-blue-900/40 dark:hover:to-blue-800/30 hover:ring-2 hover:ring-blue-300/30 dark:hover:ring-blue-700/30",
  green: "bg-gradient-to-br from-green-50 via-green-50/90 to-green-100/70 dark:from-green-950/50 dark:via-green-900/30 dark:to-green-800/20 border-2 border-green-300/80 dark:border-green-700/60 text-green-900 dark:text-green-100 shadow-lg shadow-green-200/30 dark:shadow-green-900/20 hover:shadow-xl hover:shadow-green-400/50 dark:hover:shadow-green-700/40 hover:border-green-400/100 dark:hover:border-green-600/80 hover:scale-[1.02] hover:from-green-50 hover:via-green-50 hover:to-green-100 dark:hover:from-green-950/60 dark:hover:via-green-900/40 dark:hover:to-green-800/30 hover:ring-2 hover:ring-green-300/30 dark:hover:ring-green-700/30",
  purple: "bg-gradient-to-br from-purple-50 via-purple-50/90 to-purple-100/70 dark:from-purple-950/50 dark:via-purple-900/30 dark:to-purple-800/20 border-2 border-purple-300/80 dark:border-purple-700/60 text-purple-900 dark:text-purple-100 shadow-lg shadow-purple-200/30 dark:shadow-purple-900/20 hover:shadow-xl hover:shadow-purple-400/50 dark:hover:shadow-purple-700/40 hover:border-purple-400/100 dark:hover:border-purple-600/80 hover:scale-[1.02] hover:from-purple-50 hover:via-purple-50 hover:to-purple-100 dark:hover:from-purple-950/60 dark:hover:via-purple-900/40 dark:hover:to-purple-800/30 hover:ring-2 hover:ring-purple-300/30 dark:hover:ring-purple-700/30",
  orange: "bg-gradient-to-br from-orange-50 via-orange-50/90 to-orange-100/70 dark:from-orange-950/50 dark:via-orange-900/30 dark:to-orange-800/20 border-2 border-orange-300/80 dark:border-orange-700/60 text-orange-900 dark:text-orange-100 shadow-lg shadow-orange-200/30 dark:shadow-orange-900/20 hover:shadow-xl hover:shadow-orange-400/50 dark:hover:shadow-orange-700/40 hover:border-orange-400/100 dark:hover:border-orange-600/80 hover:scale-[1.02] hover:from-orange-50 hover:via-orange-50 hover:to-orange-100 dark:hover:from-orange-950/60 dark:hover:via-orange-900/40 dark:hover:to-orange-800/30 hover:ring-2 hover:ring-orange-300/30 dark:hover:ring-orange-700/30",
};

// Enhanced color classes for floating notes - more realistic sticky note appearance
// Enhanced color classes for floating notes - premium glassmorphism look
const floatingColorClasses = {
  yellow: "bg-[#FFFC9B]/90 dark:bg-yellow-950/80 backdrop-blur-md border border-yellow-400/50 dark:border-yellow-700/50 text-yellow-950 dark:text-yellow-100 shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.2)] dark:shadow-none",
  pink: "bg-[#FFB3D9]/90 dark:bg-pink-950/80 backdrop-blur-md border border-pink-400/50 dark:border-pink-700/50 text-pink-950 dark:text-pink-100 shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.2)] dark:shadow-none",
  blue: "bg-[#B3D9FF]/90 dark:bg-blue-950/80 backdrop-blur-md border border-blue-400/50 dark:border-blue-700/50 text-blue-950 dark:text-blue-100 shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.2)] dark:shadow-none",
  green: "bg-[#B3FFB3]/90 dark:bg-green-950/80 backdrop-blur-md border border-green-400/50 dark:border-green-700/50 text-green-950 dark:text-green-100 shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.2)] dark:shadow-none",
  purple: "bg-[#D9B3FF]/90 dark:bg-purple-950/80 backdrop-blur-md border border-purple-400/50 dark:border-purple-700/50 text-purple-950 dark:text-purple-100 shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.2)] dark:shadow-none",
  orange: "bg-[#FFD9B3]/90 dark:bg-orange-950/80 backdrop-blur-md border border-orange-400/50 dark:border-orange-700/50 text-orange-950 dark:text-orange-100 shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.2)] dark:shadow-none",
};

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
}: StickyNoteCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const colorClass = isFloating ? floatingColorClasses[note.color] : colorClasses[note.color];

  // Check if current user is the assignee (note is assigned to them)
  const isAssignee = currentUserId && note.assignee?._id === currentUserId;

  // Only the assigned manager can edit and delete sticky notes
  const canEdit = isAssignee; // Only assignee can edit
  const canDelete = isAssignee; // Only assignee can delete

  // Check if note has been edited (updatedAt is different from createdAt)
  const isEdited = note.updatedAt && note.createdAt && note.updatedAt > note.createdAt + 1000; // 1 second buffer for timing differences

  // Generate a consistent rotation based on note ID
  const rotation = useMemo(() => {
    const hash = note._id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return (hash % 7) - 3; // -3 to +3 degrees
  }, [note._id]);

  // Load saved position from localStorage
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
        disableDrag ? "cursor-default" : "cursor-move",
        colorClass,
        note.isCompleted && "opacity-60",
        isDragging && "z-50 scale-105 shadow-2xl",
        !isDragging && "hover:transition-all hover:duration-300 hover:ease-out",
        isFloating && "backdrop-blur-0",
        !isFloating && "backdrop-blur-sm",
        isFloating && "transform-gpu", // Better performance for floating notes
        // Ensure color is maintained during drag
        isDragging && isFloating && "!bg-inherit"
      )}
      style={{
        transform: disableDrag
          ? 'none'
          : position.x !== 0 || position.y !== 0
            ? `translate(${position.x}px, ${position.y}px) rotate(${rotation}deg)`
            : `rotate(${rotation}deg)`,
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
          {/* Title */}
          <h3 className={cn(
            "font-bold text-base mb-2 leading-tight",
            disableDrag ? "" : "line-clamp-2",
            note.isCompleted && "line-through decoration-2",
            // Ensure text color matches note color theme
            isFloating && "text-inherit"
          )}>
            {note.title}
          </h3>

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
              />
            </div>
          )}

          {/* Bottom Section */}
          <div className="space-y-1.5 mt-auto">
            {/* Reminder */}
            {note.reminderAt && (
              <div className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-md bg-black/5 dark:bg-white/5 backdrop-blur-sm">
                <Clock className="h-3 w-3 opacity-70" />
                <span className="font-medium opacity-80">{format(new Date(note.reminderAt), "MMM d, h:mm a")}</span>
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
                {format(new Date(note.createdAt), "MMM d, h:mm a")}
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
              <AlertDialogTitle>Delete Sticky Note?</AlertDialogTitle>
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

