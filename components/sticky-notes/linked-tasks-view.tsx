"use client";

import { useLinkedTasks } from "@/hooks/use-sticky-notes";
import { ListTodo, Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface LinkedTasksViewProps {
  entityType: "cc" | "dc" | "po";
  entityId: string;
  onNewTask?: () => void;
}

export function LinkedTasksView({ entityType, entityId, onNewTask }: LinkedTasksViewProps) {
  const tasks = useLinkedTasks(entityType, entityId);

  if (!tasks || tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 border border-dashed rounded-lg bg-muted/20">
        <ListTodo className="h-8 w-8 text-muted-foreground mb-2 opacity-50" />
        <p className="text-sm font-medium text-muted-foreground">No tasks linked</p>
        <p className="text-xs text-muted-foreground/70 mb-4 text-center max-w-[250px]">
          Create a task and link it to this document to track related activities.
        </p>
        {onNewTask && (
          <Button variant="outline" size="sm" onClick={onNewTask}>
            <Plus className="h-4 w-4 mr-1.5" />
            New Task
          </Button>
        )}
      </div>
    );
  }

  const priorityColors = {
      high: "bg-red-500",
      medium: "bg-yellow-500",
      low: "bg-green-500",
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <ListTodo className="h-4 w-4 text-primary" />
          Linked Tasks ({tasks.length})
        </h4>
        {onNewTask && (
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={onNewTask}>
            <Plus className="h-3 w-3 mr-1" />
            Add
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {tasks.map((task: any) => (
          <div key={task._id} className={cn(
            "p-3 rounded-lg border border-border/50 flex flex-col gap-2 relative overflow-hidden",
            task.isCompleted ? "bg-muted/50 opacity-70" : "bg-background"
          )}>
            <div className="flex items-start justify-between gap-2">
              <span className={cn(
                "font-medium text-sm line-clamp-1",
                task.isCompleted && "line-through text-muted-foreground"
              )}>
                {task.title}
              </span>
              {task.priority && !task.isCompleted && (
                <div className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", priorityColors[task.priority as keyof typeof priorityColors])} />
              )}
              {task.isCompleted && <Check className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />}
            </div>
            
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>{task.assignee?.fullName || "Unassigned"}</span>
              {task.dueDate && (
                <span className={cn(
                  Date.now() > task.dueDate && !task.isCompleted ? "text-red-500 font-medium" : ""
                )}>
                  Due: {format(new Date(task.dueDate), "MMM d")}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
