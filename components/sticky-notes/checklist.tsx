/**
 * Checklist Component
 * 
 * Todo checklist for sticky notes
 */

"use client";

import { useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

interface ChecklistProps {
  items: ChecklistItem[];
  onChange: (items: ChecklistItem[]) => void;
  readonly?: boolean;
}

export function Checklist({ items, onChange, readonly = false }: ChecklistProps) {
  const [newItemText, setNewItemText] = useState("");

  const handleToggle = (id: string) => {
    if (readonly) return;
    const updatedItems = items.map((item) =>
      item.id === id ? { ...item, completed: !item.completed } : item
    );
    onChange(updatedItems);
  };

  const handleAdd = () => {
    if (!newItemText.trim()) return;
    const newItem: ChecklistItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text: newItemText.trim(),
      completed: false,
    };
    onChange([...items, newItem]);
    setNewItemText("");
  };

  const handleRemove = (id: string) => {
    onChange(items.filter((item) => item.id !== id));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  const completedCount = items.filter((item) => item.completed).length;
  const totalCount = items.length;

  return (
    <div className="space-y-2">
      {/* Progress */}
      {totalCount > 0 && (
        <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1.5">
          <span>
            {completedCount} of {totalCount} completed
          </span>
          {completedCount > 0 && (
            <span className="font-medium">
              {Math.round((completedCount / totalCount) * 100)}%
            </span>
          )}
        </div>
      )}

      {/* Items */}
      <div className="space-y-1">
        {items.length > 0 && items.map((item) => (
            <div
              key={item.id}
              className={cn(
                "flex items-center gap-1.5 group p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-all",
                item.completed && "opacity-70"
              )}
            >
              <button
                type="button"
                onClick={() => handleToggle(item.id)}
                disabled={readonly}
                className={cn(
                  "flex-shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-all cursor-pointer",
                  item.completed
                    ? "bg-primary border-primary text-primary-foreground"
                    : "border-muted-foreground/40 hover:border-primary hover:bg-primary/10",
                  readonly && "cursor-default"
                )}
                aria-label={item.completed ? "Mark as incomplete" : "Mark as complete"}
              >
                {item.completed && <Check className="h-2.5 w-2.5" />}
              </button>
              <span
                className={cn(
                  "flex-1 text-xs transition-all",
                  item.completed && "line-through text-muted-foreground"
                )}
              >
                {item.text}
              </span>
              {!readonly && (
                <button
                  type="button"
                  onClick={() => handleRemove(item.id)}
                  className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-0.5 rounded"
                  aria-label="Remove item"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
      </div>

      {/* Add New */}
      {!readonly && (
        <div className="flex items-center gap-1.5 mt-2">
          <Input
            value={newItemText}
            onChange={(e) => setNewItemText(e.target.value)}
            onKeyPress={handleKeyPress}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAdd();
              }
            }}
            placeholder="Add todo..."
            className="h-7 text-xs"
          />
          <Button
            type="button"
            onClick={handleAdd}
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 shrink-0"
            disabled={!newItemText.trim()}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

