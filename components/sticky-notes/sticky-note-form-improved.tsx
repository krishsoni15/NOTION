/**
 * Sticky Note Form Component
 * 
 * Form for creating and editing sticky notes with live preview.
 */

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ROLES } from "@/lib/auth/roles";
import { useUserRole } from "@/hooks/use-user-role";
import type { Id } from "@/convex/_generated/dataModel";
import { format } from "date-fns";
import { Checklist, type ChecklistItem } from "./checklist";

type NoteColor = "yellow" | "pink" | "blue" | "green" | "purple" | "orange";

interface StickyNoteFormProps {
  noteId?: Id<"stickyNotes">;
  initialData?: {
    title: string;
    content: string;
    color: NoteColor;
    reminderAt?: number;
    assignedTo: Id<"users">;
    checklistItems?: ChecklistItem[];
  };
  currentUserId: Id<"users">;
  onSubmit: (data: {
    assignedTo: Id<"users">;
    title: string;
    content: string;
    color: NoteColor;
    reminderAt?: number;
    checklistItems?: ChecklistItem[];
  }) => Promise<void>;
  onCancel: () => void;
}

// Colors ordered: Blue first (default), then others in sequence
const colors: { value: NoteColor; label: string; bgClass: string; darkBg: string }[] = [
  { value: "blue", label: "Blue", bgClass: "bg-blue-100", darkBg: "dark:bg-blue-900/40" },
  { value: "green", label: "Green", bgClass: "bg-green-100", darkBg: "dark:bg-green-900/40" },
  { value: "purple", label: "Purple", bgClass: "bg-purple-100", darkBg: "dark:bg-purple-900/40" },
  { value: "orange", label: "Orange", bgClass: "bg-orange-100", darkBg: "dark:bg-orange-900/40" },
  { value: "yellow", label: "Yellow", bgClass: "bg-yellow-100", darkBg: "dark:bg-yellow-900/40" },
  { value: "pink", label: "Pink", bgClass: "bg-pink-100", darkBg: "dark:bg-pink-900/40" },
];

// Sequential color order: blue -> green -> purple -> orange -> yellow -> pink -> blue...
const colorSequence: NoteColor[] = ["blue", "green", "purple", "orange", "yellow", "pink"];

const STORAGE_KEY = "sticky-note-last-color-index";

// Get next color in sequence
function getNextSequentialColor(): NoteColor {
  if (typeof window === "undefined") return "blue";
  
  // Get last used color index, default to -1 so first note is blue (index 0)
  const lastIndex = parseInt(localStorage.getItem(STORAGE_KEY) || "-1", 10);
  const nextIndex = (lastIndex + 1) % colorSequence.length;
  return colorSequence[nextIndex];
}

// Save color index to localStorage
function saveColorIndex(color: NoteColor) {
  if (typeof window === "undefined") return;
  const index = colorSequence.indexOf(color);
  if (index !== -1) {
    localStorage.setItem(STORAGE_KEY, index.toString());
  }
}

const colorClasses = {
  yellow: "bg-gradient-to-br from-yellow-50 to-yellow-100/80 dark:from-yellow-950/40 dark:to-yellow-900/20 border-yellow-200/60 dark:border-yellow-800/40 text-yellow-950 dark:text-yellow-50",
  pink: "bg-gradient-to-br from-pink-50 to-pink-100/80 dark:from-pink-950/40 dark:to-pink-900/20 border-pink-200/60 dark:border-pink-800/40 text-pink-950 dark:text-pink-50",
  blue: "bg-gradient-to-br from-blue-50 to-blue-100/80 dark:from-blue-950/40 dark:to-blue-900/20 border-blue-200/60 dark:border-blue-800/40 text-blue-950 dark:text-blue-50",
  green: "bg-gradient-to-br from-green-50 to-green-100/80 dark:from-green-950/40 dark:to-green-900/20 border-green-200/60 dark:border-green-800/40 text-green-950 dark:text-green-50",
  purple: "bg-gradient-to-br from-purple-50 to-purple-100/80 dark:from-purple-950/40 dark:to-purple-900/20 border-purple-200/60 dark:border-purple-800/40 text-purple-950 dark:text-purple-50",
  orange: "bg-gradient-to-br from-orange-50 to-orange-100/80 dark:from-orange-950/40 dark:to-orange-900/20 border-orange-200/60 dark:border-orange-800/40 text-orange-950 dark:text-orange-50",
};

export function StickyNoteForm({
  noteId,
  initialData,
  currentUserId,
  onSubmit,
  onCancel,
}: StickyNoteFormProps) {
  const userRole = useUserRole();
  const isManager = userRole === ROLES.MANAGER;
  const allUsers = useQuery(api.users.getAllUsers);
  const currentUser = useQuery(api.users.getCurrentUser);

  // Get initial color: use provided color if editing, otherwise get next sequential color
  const getInitialColor = (): NoteColor => {
    if (initialData?.color) return initialData.color;
    if (noteId) return "blue"; // Default for editing
    return getNextSequentialColor(); // Sequential for new notes
  };

  const [title, setTitle] = useState(initialData?.title || "");
  const [content, setContent] = useState(initialData?.content || "");
  const [color, setColor] = useState<NoteColor>(getInitialColor());
  const [assignedTo, setAssignedTo] = useState<Id<"users">>(
    initialData?.assignedTo || currentUserId
  );
  const [reminderDate, setReminderDate] = useState(
    initialData?.reminderAt
      ? format(new Date(initialData.reminderAt), "yyyy-MM-dd")
      : ""
  );
  const [reminderTime, setReminderTime] = useState(
    initialData?.reminderAt
      ? format(new Date(initialData.reminderAt), "HH:mm")
      : ""
  );
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>(
    initialData?.checklistItems || []
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update form when initialData changes (for editing)
  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || "");
      setContent(initialData.content || "");
      setColor(initialData.color || "blue");
      setAssignedTo(initialData.assignedTo || currentUserId);
      setChecklistItems(initialData.checklistItems || []);
      
      if (initialData.reminderAt) {
        setReminderDate(format(new Date(initialData.reminderAt), "yyyy-MM-dd"));
        setReminderTime(format(new Date(initialData.reminderAt), "HH:mm"));
      } else {
        setReminderDate("");
        setReminderTime("");
      }
    } else {
      // Reset form for new note - use next sequential color
      setTitle("");
      setContent("");
      setColor(getNextSequentialColor());
      setAssignedTo(currentUserId);
      setChecklistItems([]);
      setReminderDate("");
      setReminderTime("");
    }
  }, [initialData, currentUserId, noteId]);

  const canAssignToOthers = isManager;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      let reminderAt: number | undefined;
      if (reminderDate && reminderTime) {
        const reminderDateTime = new Date(`${reminderDate}T${reminderTime}`);
        reminderAt = reminderDateTime.getTime();
      }

      // Save color index to localStorage for sequential rotation (only for new notes)
      if (!noteId) {
        saveColorIndex(color);
      }

      await onSubmit({
        assignedTo,
        title: title.trim(),
        content: content.trim(),
        color,
        reminderAt,
        checklistItems: checklistItems.length > 0 ? checklistItems : [],
      });
    } catch (error) {
      // Error handled by parent component
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`rounded-lg p-4 transition-all duration-300 ${colorClasses[color]}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title and Assign To Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Title */}
        <div className="space-y-2">
          <Label htmlFor="title" className="text-sm font-medium">Title *</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter title"
            required
            className="h-9 bg-background/80 backdrop-blur-sm"
          />
        </div>

        {/* Assign To (only for managers) */}
        {canAssignToOthers && allUsers && allUsers.length > 0 && (
          <div className="space-y-2">
            <Label htmlFor="assignedTo" className="text-sm font-medium">Assign To</Label>
            <Select
              value={assignedTo}
              onValueChange={(value) => setAssignedTo(value as Id<"users">)}
            >
              <SelectTrigger id="assignedTo" className="h-9 bg-background/80 backdrop-blur-sm">
                <SelectValue placeholder="Select user..." />
              </SelectTrigger>
              <SelectContent>
                {allUsers
                  .filter((u) => u.isActive)
                  .map((user) => (
                    <SelectItem key={user._id} value={user._id}>
                      {user.fullName} ({user.role})
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="space-y-2">
        <Label htmlFor="content" className="text-sm font-medium">Description (optional)</Label>
        <textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add details or notes..."
          className="min-h-[70px] w-full rounded-md border border-input bg-background/80 backdrop-blur-sm px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 resize-none"
          rows={3}
        />
      </div>

      {/* Checklist */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Todo Checklist (optional)</Label>
        <div className="border border-border rounded-md p-3 bg-background/60 backdrop-blur-sm">
          <Checklist
            items={checklistItems}
            onChange={setChecklistItems}
          />
        </div>
      </div>

      {/* Reminder */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Set Reminder (optional)</Label>
        <div className="flex gap-2">
          <Input
            type="date"
            value={reminderDate}
            onChange={(e) => setReminderDate(e.target.value)}
            className="flex-1 h-9 bg-background/80 backdrop-blur-sm"
            min={format(new Date(), "yyyy-MM-dd")}
          />
          <Input
            type="time"
            value={reminderTime}
            onChange={(e) => setReminderTime(e.target.value)}
            className="flex-1 h-9 bg-background/80 backdrop-blur-sm"
          />
        </div>
      </div>

      {/* Color Picker */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Color Theme</Label>
        <div className="flex gap-2 items-center flex-wrap">
          {colors.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setColor(c.value)}
              className={`
                w-9 h-9 rounded-md border-2 transition-all flex items-center justify-center
                ${color === c.value ? "border-primary ring-2 ring-primary/20 scale-110" : "border-border hover:border-primary/50 hover:scale-105"}
                ${c.bgClass} ${c.darkBg}
              `}
              aria-label={`Select ${c.label} color`}
              title={c.label}
            >
              {color === c.value && (
                <svg className="w-4 h-4 text-current" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-4 border-t">
        <Button type="submit" disabled={isSubmitting} className="flex-1 h-9">
          {isSubmitting ? "Saving..." : noteId ? "Update Note" : "Create Note"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          className="h-9"
        >
          Cancel
        </Button>
      </div>
    </form>
    </div>
  );
}

