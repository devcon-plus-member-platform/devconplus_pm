"use client";

import { useState, useRef } from "react";
import type { Task } from "@/types";

interface Props {
  task: Task;
  expanded: boolean;
  onToggleExpand: () => void;
  onUpdate: (updates: Partial<Task>) => void;
}

export default function TitleCell({ task, expanded, onToggleExpand, onUpdate }: Props) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(task.title);
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    setVal(task.title);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 10);
  }

  function save() {
    setEditing(false);
    const trimmed = val.trim();
    if (trimmed && trimmed !== task.title) onUpdate({ title: trimmed });
    else setVal(task.title);
  }

  return (
    <td className="px-3 py-2 min-w-[280px]">
      <div className="flex items-center gap-1.5">
        {/* Description expand toggle */}
        <button
          onClick={onToggleExpand}
          className="shrink-0 text-gray-300 hover:text-gray-500 text-xs w-4 h-4 flex items-center justify-center transition-colors"
          title="Toggle description"
        >
          {expanded ? "▼" : "▶"}
        </button>

        {editing ? (
          <input
            ref={inputRef}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") { setEditing(false); setVal(task.title); }
            }}
            className="flex-1 text-sm bg-white border border-brand-300 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-brand-400"
          />
        ) : (
          <button
            onClick={startEdit}
            className="flex-1 text-left text-sm text-gray-800 hover:text-brand-700 truncate font-medium"
          >
            {task.title}
          </button>
        )}
      </div>
    </td>
  );
}
