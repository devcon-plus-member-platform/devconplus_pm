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

  function save(override?: string) {
    const next = override !== undefined ? override : val;
    setEditing(false);
    if (next !== (task.due_date ?? "")) {
      onUpdate({ due_date: next || null });
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
            onBlur={() => save()}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") { setEditing(false); setVal(task.due_date ?? ""); }
            }}
            className="text-xs border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-300 w-[128px] transition-shadow"
          />
          {val && (
            <button
              onMouseDown={(e) => { e.preventDefault(); setVal(""); save(""); }}
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
          "flex items-center gap-1.5 text-xs px-2 py-1 rounded-md transition-all duration-100 w-full text-left whitespace-nowrap",
          overdue
            ? "text-red-600 bg-red-50 hover:bg-red-100 font-medium"
            : task.due_date
            ? "text-gray-600 hover:bg-gray-50 hover:text-brand-600"
            : "text-gray-300 italic hover:bg-gray-50"
        )}
      >
        {task.due_date ? (
          <>
            {overdue && (
              <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            )}
            {formatDate(task.due_date)}
          </>
        ) : (
          "Set date"
        )}
      </button>
    </td>
  );
}
