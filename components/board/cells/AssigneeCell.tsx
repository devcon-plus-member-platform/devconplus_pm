"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useBoardContext } from "../BoardContext";
import type { Task, Contributor } from "@/types";

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

  const assigneeIds: string[] = task.assignee_ids ?? (task.assignee_id ? [task.assignee_id] : []);
  const assignees: Contributor[] = assigneeIds
    .map((id) => contributors.find((c) => c.id === id))
    .filter(Boolean) as Contributor[];

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
    const DROPDOWN_H = 300;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow < DROPDOWN_H ? rect.top - DROPDOWN_H - 4 : rect.bottom + 4;
    setPos({ top, left: rect.left });
    setOpen((v) => !v);
  }

  function toggle(id: string) {
    const current = task.assignee_ids ?? (task.assignee_id ? [task.assignee_id] : []);
    const next = current.includes(id)
      ? current.filter((x) => x !== id)
      : [...current, id];
    onUpdate({ assignee_ids: next, assignee_id: next[0] ?? null });
  }

  const MAX_SHOWN = 3;

  return (
    <td className="px-3 py-2">
      <button
        ref={triggerRef}
        onClick={handleOpen}
        className="flex items-center gap-1 text-xs hover:bg-gray-100 px-2 py-1 rounded-md transition-all duration-100 w-full text-left group/assignee min-h-[28px]"
      >
        {assignees.length > 0 ? (
          <div className="flex items-center flex-1 min-w-0">
            {/* Stacked avatars */}
            <div className="flex -space-x-1.5 shrink-0">
              {assignees.slice(0, MAX_SHOWN).map((a) => (
                <span
                  key={a.id}
                  title={a.full_name ?? a.email}
                  className="w-5 h-5 rounded-full bg-brand-200 text-brand-800 flex items-center justify-center text-[10px] font-bold uppercase ring-1 ring-white"
                >
                  {(a.full_name ?? a.email)[0]}
                </span>
              ))}
              {assignees.length > MAX_SHOWN && (
                <span className="w-5 h-5 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-[9px] font-bold ring-1 ring-white">
                  +{assignees.length - MAX_SHOWN}
                </span>
              )}
            </div>
            {assignees.length === 1 && (
              <span className="ml-1.5 truncate text-gray-700 flex-1">
                {assignees[0].full_name ?? assignees[0].email}
              </span>
            )}
            <svg className="w-3 h-3 text-gray-300 shrink-0 opacity-0 group-hover/assignee:opacity-100 transition-opacity ml-1" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </div>
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
            className="w-56 bg-white border border-gray-200 rounded-xl shadow-xl py-1 max-h-72 overflow-y-auto"
          >
            <p className="px-3 pt-1 pb-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
              Assignees
            </p>
            <div className="border-t border-gray-100 mb-1" />
            {contributors.map((c) => {
              const selected = assigneeIds.includes(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => toggle(c.id)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-brand-50 text-gray-700"
                >
                  <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-semibold shrink-0 uppercase">
                    {(c.full_name ?? c.email)[0]}
                  </span>
                  <span className="flex-1 truncate">{c.full_name ?? c.email}</span>
                  {selected && (
                    <svg className="w-3.5 h-3.5 text-brand-500 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  )}
                </button>
              );
            })}
            {assignees.length > 0 && (
              <>
                <div className="border-t border-gray-100 my-1" />
                <button
                  onClick={() => { onUpdate({ assignee_ids: [], assignee_id: null }); setOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-50"
                >
                  Clear all
                </button>
              </>
            )}
          </div>,
          document.body
        )}
    </td>
  );
}
