/**
 * Reminder Scheduler Component
 * 
 * Client-side component that checks for due reminders and shows notifications.
 */

"use client";

import { useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { notifyReminder } from "@/lib/notifications";

/**
 * Component that runs in the background to check for due reminders
 * Should be added to the root layout or dashboard layout
 */
export function ReminderScheduler() {
  const currentUser = useQuery(api.users.getCurrentUser);
  const dueReminders = useQuery(api.stickyNotes.getDueReminders);
  const markTriggered = useMutation(api.stickyNotes.markReminderTriggered);
  const processedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!dueReminders || !currentUser || dueReminders.length === 0) return;

    // Process each due reminder that's assigned to the current user
    dueReminders.forEach(async (note) => {
      // Only process reminders assigned to current user
      if (note.assignedTo !== currentUser._id) return;

      // Skip if already processed
      if (processedRef.current.has(note._id)) return;

      // Mark as processed
      processedRef.current.add(note._id);

      // Show notification
      notifyReminder(note.title, note.content);

      // Mark as triggered
      try {
        await markTriggered({ noteId: note._id });
      } catch (error) {
        // Remove from processed set if marking failed
        processedRef.current.delete(note._id);
      }
    });
  }, [dueReminders, currentUser, markTriggered]);

  return null; // This component doesn't render anything
}

