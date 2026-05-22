"use client";

import { useState, useRef, useEffect } from "react";
import { useBoardContext } from "../BoardContext";
import type { Task } from "@/types";

interface Props {
  task: Task;
  onUpdate: (updates: Partial<Task>) => void;
}

export default function AssigneeCell({ task, onUpdate }: Props) {
  const { contributors } = useBoardContext();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const assignee = task.assignee ?? contributors.find((c) => c.id === task.assignee_id);

  function select(id: string | null) {
    setOpen(false);
    if (id !== task.assignee_id) onUpdate({ assignee_id: id });
  }

  return (
    <td className="px-3 py-2 relative">
      <div ref={ref}>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1.5 text-xs hover:bg-gray-100 px-2 py-1 rounded-md transition-colors w-full text-left"
        >
          {assignee ? (
            <>
              <span className="w-6 h-6 rounded-full bg-brand-200 text-brand-800 flex items-center justify-center text-xs font-semibold shrink-0 uppercase">
                {(assignee.full_name ?? assignee.email)[0]}
              </span>
              <span className="truncate text-gray-700">
                {assignee.full_name ?? assignee.email}
              </span>
            </>
          ) : (
            <span className="text-gray-300 italic">Unassigned</span>
          )}
        </button>

        {open && (
          <div className="absolute z-20 top-full left-0 mt-1 w-52 bg-white border border-gray-200 rounded-xl shadow-lg py-1 max-h-56 overflow-y-auto">
            <button
              onClick={() => select(null)}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-400 hover:bg-gray-50 italic"
            >
              Unassigned
            </button>
            <div className="border-t border-gray-100 my-1" />
            {contributors.map((c) => (
              <button
                key={c.id}
                onClick={() => select(c.id)}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-brand-50 text-gray-700"
              >
                <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-semibold shrink-0 uppercase">
                  {(c.full_name ?? c.email)[0]}
                </span>
                <span className="flex-1 truncate">{c.full_name ?? c.email}</span>
                {c.id === task.assignee_id && (
                  <span className="text-brand-500">✓</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </td>
  );
}
