/**
 * useStickyNotes Hook
 * 
 * Custom hook for fetching and managing sticky notes.
 */

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

/**
 * Hook to get all sticky notes for current user
 */
export function useStickyNotes(includeCompleted: boolean = false) {
  const notes = useQuery(api.stickyNotes.list, { includeCompleted });
  return notes ?? [];
}

/**
 * Hook to create a new sticky note
 */
export function useCreateStickyNote() {
  return useMutation(api.stickyNotes.create);
}

/**
 * Hook to update a sticky note
 */
export function useUpdateStickyNote() {
  return useMutation(api.stickyNotes.update);
}

/**
 * Hook to mark a note as completed/uncompleted
 */
export function useCompleteStickyNote() {
  return useMutation(api.stickyNotes.complete);
}

/**
 * Hook to delete a sticky note
 */
export function useDeleteStickyNote() {
  return useMutation(api.stickyNotes.deleteNote);
}

// ... existing exports ...

/**
 * Hook to get unread sticky notes count
 */
export function useStickyNotesUnreadCount() {
  const count = useQuery(api.stickyNotes.getUnreadCount);
  return count ?? 0;
}

/**
 * Hook to mark all sticky notes as read
 */
export function useMarkStickyNotesAllRead() {
  return useMutation(api.stickyNotes.markAllRead);
}
