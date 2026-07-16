"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { TASK_STATUS_THEME } from "@/lib/theme";
import type { Task, TaskStatus } from "@/types";

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "Not Started",      label: "Not Started" },
  { value: "In Progress",      label: "In Progress" },
  { value: "Review",           label: "Review" },
  { value: "Done",             label: "Done" },
  { value: "Help",             label: "Help" },
  { value: "I am Stuck",       label: "I am Stuck" },
  { value: "For Improvements", label: "For Improvements" },
];

function getBadgeClasses(status: TaskStatus): string {
  const theme = TASK_STATUS_THEME[status];
  return cn(theme.bg, theme.fg);
}

interface Props {
  task: Task;
  onUpdate: (updates: Partial<Task>) => void;
}

export default function StatusCell({ task, onUpdate }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click — must check both trigger and portal dropdown
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!triggerRef.current?.contains(t) && !dropdownRef.current?.contains(t)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  function handleOpen() {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const DROPDOWN_H = 260;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow < DROPDOWN_H ? rect.top - DROPDOWN_H - 4 : rect.bottom + 4;
    setPos({ top, left: rect.left });
    setOpen((v) => !v);
  }

  return (
    <td className="px-3 py-2">
      <button
        ref={triggerRef}
        onClick={handleOpen}
        className={cn(
          "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-all duration-100 hover:opacity-80 hover:shadow-sm whitespace-nowrap",
          getBadgeClasses(task.status)
        )}
      >
        {task.status}
        <svg className="w-2.5 h-2.5 opacity-60" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open &&
        typeof window !== "undefined" &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 9999 }}
            className="w-52 bg-white border border-gray-200 rounded-xl shadow-xl py-1"
          >
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
                    "inline-flex px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap",
                    getBadgeClasses(opt.value)
                  )}
                >
                  {opt.label}
                </span>
                {opt.value === task.status && (
                  <span className="ml-auto text-brand-500 text-xs">✓</span>
                )}
              </button>
            ))}
          </div>,
          document.body
        )}
    </td>
  );
}
