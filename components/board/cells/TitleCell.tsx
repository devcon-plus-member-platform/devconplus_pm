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
        <button
          onClick={onToggleExpand}
          className="shrink-0 w-5 h-5 flex items-center justify-center text-gray-300 hover:text-brand-500 hover:bg-brand-50 rounded transition-all duration-100"
          title="Toggle description"
        >
          {expanded ? (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          ) : (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          )}
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
            className="flex-1 text-sm bg-white border border-brand-300 rounded-md px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400 transition-shadow"
          />
        ) : (
          <button
            onClick={startEdit}
            className="flex-1 text-left text-sm text-gray-800 hover:text-brand-700 truncate font-medium transition-colors"
            title="Click to edit"
          >
            {task.title}
          </button>
        )}
      </div>
    </td>
  );
}
