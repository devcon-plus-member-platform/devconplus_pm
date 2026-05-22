"use client";

import { useState } from "react";
import { formatDate, isOverdue } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Task } from "@/types";

interface Props {
  task: Task;
  onUpdate: (updates: Partial<Task>) => void;
}

export default function DueDateCell({ task, onUpdate }: Props) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(task.due_date ?? "");
  const overdue = isOverdue(task.due_date) && task.status !== "Done";

  function save() {
    setEditing(false);
    if (val !== (task.due_date ?? "")) {
      onUpdate({ due_date: val || null });
    }
  }

  if (editing) {
    return (
      <td className="px-3 py-2">
        <div className="flex items-center gap-1">
          <input
            autoFocus
            type="date"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") { setEditing(false); setVal(task.due_date ?? ""); }
            }}
            className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-300 w-[128px]"
          />
          {val && (
            <button
              onMouseDown={(e) => { e.preventDefault(); setVal(""); save(); }}
              className="text-gray-400 hover:text-red-500 text-xs"
              title="Clear"
            >
              ✕
            </button>
          )}
        </div>
      </td>
    );
  }

  return (
    <td className="px-3 py-2">
      <button
        onClick={() => {
          setVal(task.due_date ?? "");
          setEditing(true);
        }}
        className={cn(
          "text-xs px-2 py-1 rounded-md transition-colors w-full text-left whitespace-nowrap",
          overdue
            ? "text-red-600 bg-red-50 hover:bg-red-100 font-medium"
            : task.due_date
            ? "text-gray-600 hover:bg-gray-50 hover:text-brand-600"
            : "text-gray-300 italic hover:bg-gray-50"
        )}
      >
        {task.due_date ? (
          <>
            {overdue && "⚠ "}
            {formatDate(task.due_date)}
          </>
        ) : (
          "Set date"
        )}
      </button>
    </td>
  );
}
