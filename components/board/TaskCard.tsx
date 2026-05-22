// Task card — implemented in Batch 2
"use client";

import type { Task } from "@/types";
import { StatusBadge } from "@/components/ui/Badge";
import { formatDate, isOverdue } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface TaskCardProps {
  task: Task;
  onClick?: (task: Task) => void;
}

export default function TaskCard({ task, onClick }: TaskCardProps) {
  const overdue = isOverdue(task.due_date) && task.status !== "Done";

  return (
    <div
      onClick={() => onClick?.(task)}
      className={cn(
        "bg-white rounded-lg p-3 shadow-sm cursor-pointer",
        "hover:shadow-md transition-shadow border border-transparent",
        overdue && "border-red-200"
      )}
    >
      <p className="text-sm font-medium text-gray-800 mb-2">{task.title}</p>
      <div className="flex items-center justify-between gap-2">
        <StatusBadge status={task.status} />
        {task.due_date && (
          <span
            className={cn(
              "text-xs",
              overdue ? "text-red-500" : "text-gray-400"
            )}
          >
            {formatDate(task.due_date)}
          </span>
        )}
      </div>
      {task.assignee && (
        <p className="text-xs text-gray-400 mt-1.5 truncate">
          {task.assignee.full_name ?? task.assignee.email}
        </p>
      )}
    </div>
  );
}
