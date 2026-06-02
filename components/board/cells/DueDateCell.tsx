"use client";

import { useEffect, useState } from "react";
import { formatDate, isOverdue } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Task } from "@/types";

interface Props {
  task: Task;
  onUpdate: (updates: Partial<Task>) => void;
}

async function patchDueDate(taskId: string, dueDate: string | null) {
  await fetch(`/api/tasks/${taskId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ due_date: dueDate }),
  });
}

export default function DueDateCell({ task, onUpdate }: Props) {
  const [editing, setEditing] = useState(false);
  const [localDueDate, setLocalDueDate] = useState<string | null>(task.due_date);

  // Stay in sync when realtime updates the parent task
  useEffect(() => {
    if (!editing) setLocalDueDate(task.due_date);
  }, [task.due_date, editing]);

  const overdue = isOverdue(localDueDate) && task.status !== "Done";

  function save(newVal: string | null) {
    setEditing(false);
    if (newVal === localDueDate) return;
    setLocalDueDate(newVal);
    onUpdate({ due_date: newVal });
    patchDueDate(task.id, newVal);
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    save(e.target.value || null);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") save((e.target as HTMLInputElement).value || null);
    if (e.key === "Escape") setEditing(false);
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    setLocalDueDate(null);
    onUpdate({ due_date: null });
    patchDueDate(task.id, null);
  }

  return (
    <td className="px-3 py-2">
      {editing ? (
        <input
          autoFocus
          type="date"
          defaultValue={localDueDate ?? ""}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="text-xs border border-brand-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-400/30 w-[128px]"
        />
      ) : (
        <div className="flex items-center gap-1 group">
          <button
            onClick={() => setEditing(true)}
            className={cn(
              "flex items-center gap-1.5 text-xs px-2 py-1 rounded-md transition-all duration-100 text-left whitespace-nowrap",
              overdue
                ? "text-red-600 bg-red-50 hover:bg-red-100 font-medium"
                : localDueDate
                ? "text-gray-600 hover:bg-gray-50 hover:text-brand-600"
                : "text-gray-300 italic hover:bg-gray-50"
            )}
          >
            {localDueDate ? (
              <>
                {overdue && (
                  <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                )}
                {formatDate(localDueDate)}
              </>
            ) : (
              "Set date"
            )}
          </button>
          {localDueDate && (
            <button
              onClick={handleDelete}
              className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-opacity p-0.5 rounded"
              title="Clear due date"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      )}
    </td>
  );
}
