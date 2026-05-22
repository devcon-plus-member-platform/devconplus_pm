"use client";

import { useState } from "react";
import { formatDate } from "@/lib/utils";
import type { Task } from "@/types";

interface Props {
  task: Task;
  onUpdate: (updates: Partial<Task>) => void;
}

export default function TimelineCell({ task, onUpdate }: Props) {
  const [editing, setEditing] = useState(false);
  const [start, setStart] = useState(task.timeline_start ?? "");
  const [end, setEnd] = useState(task.timeline_end ?? "");

  function save() {
    setEditing(false);
    const updates: Partial<Task> = {};
    if (start !== (task.timeline_start ?? "")) updates.timeline_start = start || null;
    if (end !== (task.timeline_end ?? "")) updates.timeline_end = end || null;
    if (Object.keys(updates).length > 0) onUpdate(updates);
  }

  if (editing) {
    return (
      <td className="px-3 py-2">
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-300 w-[120px]"
          />
          <span className="text-gray-400 text-xs shrink-0">→</span>
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            onBlur={save}
            className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-300 w-[120px]"
          />
          <button
            onMouseDown={(e) => { e.preventDefault(); save(); }}
            className="text-xs text-brand-600 font-medium px-1 shrink-0"
          >
            ✓
          </button>
        </div>
      </td>
    );
  }

  const hasTimeline = task.timeline_start || task.timeline_end;

  return (
    <td className="px-3 py-2">
      <button
        onClick={() => {
          setStart(task.timeline_start ?? "");
          setEnd(task.timeline_end ?? "");
          setEditing(true);
        }}
        className="text-xs text-gray-500 hover:text-brand-600 hover:bg-gray-50 px-2 py-1 rounded-md transition-colors w-full text-left whitespace-nowrap"
      >
        {hasTimeline ? (
          <>
            {formatDate(task.timeline_start)}{" "}
            <span className="text-gray-300">→</span>{" "}
            {formatDate(task.timeline_end)}
          </>
        ) : (
          <span className="text-gray-300 italic">Set timeline</span>
        )}
      </button>
    </td>
  );
}
