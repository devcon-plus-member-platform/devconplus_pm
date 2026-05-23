"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useBoardContext } from "../BoardContext";
import type { Task } from "@/types";

interface Props {
  task: Task;
  onUpdate: (updates: Partial<Task>) => void;
}

export default function AssigneeCell({ task, onUpdate }: Props) {
  const { contributors } = useBoardContext();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const assignee = task.assignee ?? contributors.find((c) => c.id === task.assignee_id);

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
    const DROPDOWN_H = 280;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow < DROPDOWN_H ? rect.top - DROPDOWN_H - 4 : rect.bottom + 4;
    setPos({ top, left: rect.left });
    setOpen((v) => !v);
  }

  function select(id: string | null) {
    setOpen(false);
    if (id !== task.assignee_id) onUpdate({ assignee_id: id });
  }

  return (
    <td className="px-3 py-2">
      <button
        ref={triggerRef}
        onClick={handleOpen}
        className="flex items-center gap-1.5 text-xs hover:bg-gray-100 px-2 py-1 rounded-md transition-all duration-100 w-full text-left group/assignee"
      >
        {assignee ? (
          <>
            <span className="w-5 h-5 rounded-full bg-brand-200 text-brand-800 flex items-center justify-center text-[10px] font-bold shrink-0 uppercase ring-1 ring-brand-300/50">
              {(assignee.full_name ?? assignee.email)[0]}
            </span>
            <span className="truncate text-gray-700 flex-1">
              {assignee.full_name ?? assignee.email}
            </span>
            <svg className="w-3 h-3 text-gray-300 shrink-0 opacity-0 group-hover/assignee:opacity-100 transition-opacity" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </>
        ) : (
          <span className="text-gray-300 italic hover:text-gray-500 transition-colors">Unassigned</span>
        )}
      </button>

      {open &&
        typeof window !== "undefined" &&
        createPortal(
          <div
            ref={dropdownRef}
            style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 9999 }}
            className="w-56 bg-white border border-gray-200 rounded-xl shadow-xl py-1 max-h-64 overflow-y-auto"
          >
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
          </div>,
          document.body
        )}
    </td>
  );
}
