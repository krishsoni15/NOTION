/**
 * Floating Sticky Notes Component
 * 
 * Displays sticky notes as draggable and resizable elements on the screen.
 * Only shows notes that have been explicitly dragged out (have positionX/positionY set).
 */

"use client";

import { useState } from "react";
import { Rnd } from "react-rnd";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StickyNoteCard } from "./sticky-note-card";
import {
  useStickyNotes,
  useUpdateStickyNote,
  useCompleteStickyNote,
  useDeleteStickyNote,
} from "@/hooks/use-sticky-notes";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel";
import { useUserRole } from "@/hooks/use-user-role";
import { ROLES } from "@/lib/auth/roles";
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

interface FloatingStickyNotesProps {
  currentUserId: Id<"users">;
}

const DEFAULT_WIDTH = 300;
const DEFAULT_HEIGHT = 250;
const MIN_WIDTH = 200;
const MIN_HEIGHT = 180;

export function FloatingStickyNotes({
  currentUserId,
}: FloatingStickyNotesProps) {
  const [deleteNoteId, setDeleteNoteId] = useState<Id<"stickyNotes"> | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const allNotes = useStickyNotes(true); // Get all notes including completed
  const currentUser = useQuery(api.users.getCurrentUser);
  const userRole = useUserRole();
  const isManager = userRole === ROLES.MANAGER;

  // Only show notes that have been dragged out (have position set and not removed)
  const floatingNotes = allNotes?.filter(note => {
    if (note.isCompleted) return false;
    const noteAny = note as any;
    return noteAny.positionX !== undefined &&
      noteAny.positionY !== undefined &&
      noteAny.positionX >= 0 &&
      noteAny.positionY >= 0;
  }) || [];
  const updateNote = useUpdateStickyNote();
  const completeNote = useCompleteStickyNote();
  const deleteNote = useDeleteStickyNote();

  const handlePositionChange = async (
    noteId: Id<"stickyNotes">,
    x: number,
    y: number
  ) => {
    try {
      await updateNote({
        noteId,
        positionX: x,
        positionY: y,
      });
    } catch (error: any) {
      console.error("Failed to update position:", error);
    }
  };

  const handleResize = async (
    noteId: Id<"stickyNotes">,
    width: number,
    height: number
  ) => {
    try {
      await updateNote({
        noteId,
        width,
        height,
      });
    } catch (error: any) {
      console.error("Failed to update size:", error);
    }
  };

  const handleComplete = async (noteId: Id<"stickyNotes">, isCompleted: boolean) => {
    try {
      await completeNote({ noteId, isCompleted });
      toast.success(isCompleted ? "Note marked as completed!" : "Note unmarked!");
    } catch (error: any) {
      toast.error(error.message || "Failed to update note");
    }
  };

  const handleDelete = async (noteId: Id<"stickyNotes">) => {
    setDeleteNoteId(noteId);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!deleteNoteId) return;
    try {
      await deleteNote({ noteId: deleteNoteId });
      toast.success("Note deleted!");
      setShowDeleteDialog(false);
      setDeleteNoteId(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete note");
      setShowDeleteDialog(false);
      setDeleteNoteId(null);
    }
  };

  const handleEdit = (noteId: Id<"stickyNotes">) => {
    // For now, we'll just show a toast. In a full implementation,
    // you might want to open an edit dialog or inline editor.
    toast.info("Edit functionality - open the sticky notes window to edit");
  };

  const handleClose = async (noteId: Id<"stickyNotes">) => {
    try {
      // Remove position to hide from floating view by setting to null
      // We'll use a special value to indicate removal
      await updateNote({
        noteId,
        positionX: -1, // Special value to indicate removal
        positionY: -1,
      });
      toast.success("Note removed from screen");
    } catch (error: any) {
      toast.error("Failed to remove note");
    }
  };

  const isCreator = (note: typeof floatingNotes[0]) => {
    return note.creator?._id === currentUserId;
  };

  if (floatingNotes.length === 0) {
    return null;
  }

  return (
    <>
      {/* Floating Sticky Notes */}
      {floatingNotes.map((note) => {
        const noteAny = note as any;
        let x = noteAny.positionX ?? 100;
        let y = noteAny.positionY ?? 100;

        const width = noteAny.width ?? DEFAULT_WIDTH;
        const height = noteAny.height ?? DEFAULT_HEIGHT;

        // Ensure notes stay within window bounds with safety margin
        // We use innerWidth/Height - (width/height) to ensure the whole note stays visible
        const maxX = typeof window !== 'undefined' ? window.innerWidth - width - 20 : 1000;
        const maxY = typeof window !== 'undefined' ? window.innerHeight - height - 20 : 1000;

        x = Math.max(20, Math.min(x, maxX));
        y = Math.max(20, Math.min(y, maxY));

        // Generate a subtle rotation based on note ID for realistic sticky note effect
        const rotation = (note._id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 7) - 3; // -3 to +3 degrees

        return (
          <Rnd
            key={note._id}
            size={{ width, height }}
            position={{ x, y }}
            minWidth={MIN_WIDTH}
            minHeight={MIN_HEIGHT}
            bounds="window"
            onDragStart={() => {
              // Add visual feedback when dragging starts
              document.body.style.cursor = 'grabbing';
            }}
            onDragStop={(e, d) => {
              document.body.style.cursor = '';
              const target = e.target as HTMLElement; // Cast or optional chain
              // Clamp coordinates before saving to avoid "stuck" notes off-screen
              // Safely access width/height, fallback to defaults
              const currentWidth = target?.style?.width ? parseInt(target.style.width) : DEFAULT_WIDTH;
              const currentHeight = target?.style?.height ? parseInt(target.style.height) : DEFAULT_HEIGHT;

              const maxX = window.innerWidth - (currentWidth || DEFAULT_WIDTH) - 20;
              const maxY = window.innerHeight - (currentHeight || DEFAULT_HEIGHT) - 20;

              const clampedX = Math.max(20, Math.min(d.x, maxX));
              const clampedY = Math.max(20, Math.min(d.y, maxY));
              handlePositionChange(note._id, clampedX, clampedY);
            }}
            onResizeStop={(e, direction, ref, delta, position) => {
              handleResize(
                note._id,
                parseInt(ref.style.width),
                parseInt(ref.style.height)
              );
              handlePositionChange(note._id, position.x, position.y);
            }}
            className="z-50"
            style={{
              zIndex: 50,
              transform: `rotate(${rotation}deg)`,
              // Ensure background color is maintained
              backgroundColor: 'transparent',
            }}
            resizeHandleClasses={{
              bottom: "hover:bg-primary/30 transition-colors",
              bottomRight: "hover:bg-primary/30 transition-colors",
              bottomLeft: "hover:bg-primary/30 transition-colors",
              left: "hover:bg-primary/30 transition-colors",
              right: "hover:bg-primary/30 transition-colors",
              top: "hover:bg-primary/30 transition-colors",
              topLeft: "hover:bg-primary/30 transition-colors",
              topRight: "hover:bg-primary/30 transition-colors",
            }}
            dragHandleClassName="sticky-note-drag-handle"
          >
            <div className="h-full w-full overflow-hidden relative">
              {/* Close Button - Always visible with better styling */}
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  handleClose(note._id);
                }}
                size="icon"
                variant="ghost"
                className="absolute top-2 right-2 z-50 h-8 w-8 opacity-90 hover:opacity-100 transition-all duration-200 bg-white/95 dark:bg-gray-900/95 hover:bg-red-100 dark:hover:bg-red-950/70 hover:text-red-600 dark:hover:text-red-400 text-gray-700 dark:text-gray-300 shadow-lg hover:shadow-xl rounded-full hover:scale-110 active:scale-95 border border-gray-200/50 dark:border-gray-700/50 hover:border-red-300 dark:hover:border-red-800"
                title="Remove from screen"
              >
                <X className="h-4 w-4 transition-transform duration-200 hover:rotate-90" />
              </Button>

              <StickyNoteCard
                note={note}
                onComplete={handleComplete}
                onDelete={handleDelete}
                onEdit={handleEdit}
                onChecklistUpdate={async (noteId, items) => {
                  try {
                    await updateNote({ noteId, checklistItems: items });
                  } catch (error: any) {
                    toast.error("Failed to update checklist");
                  }
                }}
                isCreator={isCreator(note)}
                disableDrag={true}
                isManager={isManager}
                currentUserId={currentUserId}
                isFloating={true}
              />
            </div>
          </Rnd>
        );
      })}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sticky Note?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteNoteId && (() => {
                const noteToDelete = allNotes?.find(n => n._id === deleteNoteId);
                return noteToDelete
                  ? `Are you sure you want to delete "${noteToDelete.title}"? This action cannot be undone.`
                  : "Are you sure you want to delete this note? This action cannot be undone.";
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

