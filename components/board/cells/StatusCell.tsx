"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { Task, TaskStatus } from "@/types";

const STATUS_OPTIONS: { value: TaskStatus; label: string; classes: string }[] = [
  { value: "Not Started",      label: "Not Started",      classes: "bg-gray-100 text-gray-600" },
  { value: "In Progress",      label: "In Progress",      classes: "bg-blue-100 text-blue-700" },
  { value: "Done",             label: "Done",             classes: "bg-green-100 text-green-700" },
  { value: "Help",             label: "Help",             classes: "bg-yellow-100 text-yellow-700" },
  { value: "I am Stuck",       label: "I am Stuck",       classes: "bg-red-100 text-red-700" },
  { value: "For Improvements", label: "For Improvements", classes: "bg-purple-100 text-purple-700" },
];

function getBadgeClasses(status: TaskStatus): string {
  return STATUS_OPTIONS.find((o) => o.value === status)?.classes ?? "bg-gray-100 text-gray-600";
}

interface Props {
  task: Task;
  onUpdate: (updates: Partial<Task>) => void;
}

export default function StatusCell({ task, onUpdate }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <td className="px-3 py-2 relative">
      <div ref={ref}>
        <button
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-opacity hover:opacity-80",
            getBadgeClasses(task.status)
          )}
        >
          {task.status}
        </button>

        {open && (
          <div className="absolute z-20 top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-xl shadow-lg py-1">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  setOpen(false);
                  if (opt.value !== task.status) onUpdate({ status: opt.value });
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 text-sm"
              >
                <span
                  className={cn(
                    "inline-flex px-2 py-0.5 rounded-full text-xs font-medium",
                    opt.classes
                  )}
                >
                  {opt.label}
                </span>
                {opt.value === task.status && (
                  <span className="ml-auto text-brand-500 text-xs">✓</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </td>
  );
}
