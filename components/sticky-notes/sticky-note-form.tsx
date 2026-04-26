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
import { ChevronsUp, Equal, ChevronsDown } from "lucide-react";

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
    priority?: "high" | "medium" | "low";
    dueDate?: number;
  };
  currentUserId: Id<"users">;
  onSubmit: (data: {
    assignedTo: Id<"users">;
    title: string;
    content: string;
    color: NoteColor;
    reminderAt?: number;
    checklistItems?: ChecklistItem[];
    priority?: "high" | "medium" | "low";
    dueDate?: number;
  }) => Promise<void>;
  onCancel: () => void;
}



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

  const [title, setTitle] = useState(initialData?.title || "");
  const [content, setContent] = useState(initialData?.content || "");
  const [color, setColor] = useState<NoteColor>(initialData?.color || "blue");
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
  
  // New Task Fields
  const [priority, setPriority] = useState<"high" | "medium" | "low" | undefined>(initialData?.priority);
  const [dueDateStr, setDueDateStr] = useState(
    initialData?.dueDate
      ? format(new Date(initialData.dueDate), "yyyy-MM-dd")
      : ""
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
      
      setPriority(initialData.priority);
      setDueDateStr(initialData.dueDate ? format(new Date(initialData.dueDate), "yyyy-MM-dd") : "");
    } else {
      setTitle("");
      setContent("");
      setAssignedTo(currentUserId);
      setChecklistItems([]);
      setReminderDate("");
      setReminderTime("");
      setPriority(undefined);
      setDueDateStr("");
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

      // Non-managers can only assign to themselves
      const finalAssignedTo = canAssignToOthers ? assignedTo : currentUserId;


      let dueDate: number | undefined;
      if (dueDateStr) {
        // Parse date properly using local timezone components to avoid UTC offset shifting the day
        const [year, month, day] = dueDateStr.split('-').map(Number);
        const d = new Date(year, month - 1, day, 12, 0, 0, 0);
        dueDate = d.getTime();
      }

      await onSubmit({
        assignedTo: finalAssignedTo,
        title: title.trim(),
        content: content.trim(),
        color,
        reminderAt,
        checklistItems: checklistItems.length > 0 ? checklistItems : [],
        priority,
        dueDate,
      });
    } catch (error) {
      // Error handled by parent component
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-lg p-4 transition-all duration-300 bg-background text-foreground border border-border shadow-sm">
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
          <div className="space-y-2 min-w-0">
            <Label htmlFor="assignedTo" className="text-sm font-medium">Assign To</Label>
            <Select
              value={assignedTo}
              onValueChange={(value) => setAssignedTo(value as Id<"users">)}
            >
              <SelectTrigger id="assignedTo" className="h-9 w-full bg-background/80 backdrop-blur-sm min-w-0">
                <SelectValue placeholder="Select user..." className="truncate min-w-0" />
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

      {/* Priority and Due Date Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Priority */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Priority</Label>
          <div className="flex gap-1.5 p-1 bg-background/50 backdrop-blur-sm border rounded-lg h-10">
            {(["high", "medium", "low"] as const).map((p) => {
              const isSelected = priority === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(isSelected ? undefined : p)}
                  className={`flex-1 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-1.5 border
                    ${isSelected 
                      ? p === "high" ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800/50 shadow-sm"
                      : p === "medium" ? "bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800/50 shadow-sm"
                      : "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800/50 shadow-sm"
                      : "bg-transparent border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    }
                  `}
                >
                  {p === "high" && <ChevronsUp className={`w-3.5 h-3.5 ${isSelected ? "text-red-600 dark:text-red-500" : ""}`} />}
                  {p === "medium" && <Equal className={`w-3.5 h-3.5 ${isSelected ? "text-orange-600 dark:text-orange-500" : ""}`} />}
                  {p === "low" && <ChevronsDown className={`w-3.5 h-3.5 ${isSelected ? "text-blue-600 dark:text-blue-500" : ""}`} />}
                  <span className="capitalize">{p}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Due Date */}
        <div className="space-y-2">
          <Label htmlFor="dueDate" className="text-sm font-medium">Due Date</Label>
          <Input
            id="dueDate"
            type="date"
            value={dueDateStr}
            onChange={(e) => setDueDateStr(e.target.value)}
            className="h-9 bg-background/80 backdrop-blur-sm"
          />
        </div>
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

      {/* Actions */}
      <div className="flex gap-2 pt-4 border-t justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
          className="h-9"
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting} className="h-9">
          {isSubmitting ? "Saving..." : noteId ? "Update Task" : "Create Task"}
        </Button>
      </div>
    </form>
    </div>
  );
}

