"use client";

import { useState, useEffect, useRef } from "react";
import {
  useSortable,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useBoardContext } from "./BoardContext";
import TaskRow from "./TaskRow";
import ConfirmModal from "./modals/ConfirmModal";
import type { Group } from "@/types";

const COL_HEADERS = [
  { label: "Task",       className: "min-w-[280px] w-[280px]" },
  { label: "Assignee",   className: "min-w-[160px] w-[160px]" },
  { label: "Status",     className: "min-w-[148px] w-[148px]" },
  { label: "Timeline",   className: "min-w-[220px] w-[220px]" },
  { label: "Due Date",   className: "min-w-[116px] w-[116px]" },
  { label: "Attachment", className: "min-w-[96px]  w-[96px]"  },
  { label: "PR Link",    className: "min-w-[160px]"           },
];

const COLOR_PALETTE = [
  { label: "Blue",    value: "#3b82f6" },
  { label: "Violet",  value: "#8b5cf6" },
  { label: "Indigo",  value: "#6366f1" },
  { label: "Teal",    value: "#14b8a6" },
  { label: "Emerald", value: "#10b981" },
  { label: "Lime",    value: "#84cc16" },
  { label: "Amber",   value: "#f59e0b" },
  { label: "Orange",  value: "#f97316" },
  { label: "Red",     value: "#ef4444" },
  { label: "Rose",    value: "#f43f5e" },
  { label: "Pink",    value: "#ec4899" },
  { label: "Cyan",    value: "#06b6d4" },
];

// Fallback palette when no localStorage entry exists yet
const DEFAULT_ACCENTS = COLOR_PALETTE.map((c) => c.value);

function storageKey(groupId: string) {
  return `devcon-group-color-${groupId}`;
}

interface Props {
  group: Group;
  colorIdx: number;
}

export default function GroupSection({ group, colorIdx }: Props) {
  const defaultAccent = DEFAULT_ACCENTS[colorIdx % DEFAULT_ACCENTS.length];

  const [accent, setAccent] = useState(defaultAccent);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Hydrate from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    const saved = localStorage.getItem(storageKey(group.id));
    if (saved) setAccent(saved);
  }, [group.id]);

  // Close picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    };
    if (pickerOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [pickerOpen]);

  function pickColor(value: string) {
    setAccent(value);
    localStorage.setItem(storageKey(group.id), value);
    setPickerOpen(false);
  }

  const {
    tasksByGroup,
    collapsedGroups,
    toggleGroupCollapse,
    addTask,
    updateGroup,
    deleteGroup,
  } = useBoardContext();

  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(group.name);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const tasks = tasksByGroup[group.id] ?? [];
  const collapsed = collapsedGroups.has(group.id);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: group.id, data: { type: "group" } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  function handleNameBlur() {
    setEditingName(false);
    if (nameVal.trim() && nameVal.trim() !== group.name) {
      updateGroup(group.id, nameVal.trim());
    } else {
      setNameVal(group.name);
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={{ ...style, borderLeft: `4px solid ${accent}` }}
      className="rounded-xl border border-gray-200 bg-white overflow-hidden"
    >
      {/* Group header */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-200 group/header"
        style={{ backgroundColor: `${accent}12` }}
      >
        {/* Drag handle */}
        <button
          className="text-gray-300 hover:text-gray-500 cursor-grab opacity-0 group-hover/header:opacity-100 transition-opacity shrink-0"
          {...attributes}
          {...listeners}
        >
          ⠿
        </button>

        {/* Collapse / expand toggle */}
        <button
          onClick={() => toggleGroupCollapse(group.id)}
          title={collapsed ? "Expand group" : "Collapse group"}
          className="text-gray-400 hover:text-gray-700 transition-colors shrink-0 rounded p-0.5 hover:bg-black/5"
        >
          <svg
            className="w-4 h-4 transition-transform duration-150"
            style={{ transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)" }}
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Color picker */}
        <div className="relative shrink-0" ref={pickerRef}>
          <button
            onClick={() => setPickerOpen((v) => !v)}
            title="Change group color"
            className="w-4 h-4 rounded-full border-2 border-white shadow-sm ring-1 ring-gray-200 hover:ring-gray-400 transition-all"
            style={{ backgroundColor: accent }}
          />

          {pickerOpen && (
            <div className="absolute z-30 top-full left-0 mt-2 p-2 bg-white border border-gray-200 rounded-xl shadow-xl w-[136px]">
              <p className="text-[10px] text-gray-400 font-medium mb-2 px-0.5">Group color</p>
              <div className="grid grid-cols-4 gap-1.5">
                {COLOR_PALETTE.map((c) => (
                  <button
                    key={c.value}
                    title={c.label}
                    onClick={() => pickColor(c.value)}
                    className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 flex items-center justify-center"
                    style={{
                      backgroundColor: c.value,
                      borderColor: accent === c.value ? "white" : "transparent",
                      outline: accent === c.value ? `2px solid ${c.value}` : "none",
                    }}
                  >
                    {accent === c.value && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Group name */}
        {editingName ? (
          <input
            autoFocus
            value={nameVal}
            onChange={(e) => setNameVal(e.target.value)}
            onBlur={handleNameBlur}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleNameBlur();
              if (e.key === "Escape") {
                setNameVal(group.name);
                setEditingName(false);
              }
            }}
            className="flex-1 text-sm font-semibold bg-white border border-brand-300 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-brand-400"
          />
        ) : (
          <button
            onClick={() => setEditingName(true)}
            className="flex-1 text-left text-sm font-semibold truncate transition-opacity hover:opacity-80"
            style={{ color: accent }}
          >
            {group.name}
            <span className="ml-2 text-xs font-normal text-gray-400">
              {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
            </span>
          </button>
        )}

        {/* Delete group */}
        <button
          onClick={() => setConfirmDelete(true)}
          className="text-gray-300 hover:text-red-500 opacity-0 group-hover/header:opacity-100 transition-opacity text-xs px-1"
          title="Delete group"
        >
          🗑
        </button>
      </div>

      {/* Task table */}
      {!collapsed && (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <colgroup>
                <col className="w-8" />
                {COL_HEADERS.map((h) => (
                  <col key={h.label} className={h.className} />
                ))}
              </colgroup>
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="w-8" />
                  {COL_HEADERS.map((h) => (
                    <th
                      key={h.label}
                      className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide"
                    >
                      {h.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <SortableContext
                  items={tasks.map((t) => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {tasks.map((task) => (
                    <TaskRow key={task.id} task={task} groupId={group.id} />
                  ))}
                </SortableContext>

                {tasks.length === 0 && (
                  <tr>
                    <td
                      colSpan={COL_HEADERS.length + 1}
                      className="px-4 py-4 text-center text-xs text-gray-400"
                    >
                      No tasks — add one below
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Add task */}
          <div className="border-t border-gray-100 px-3 py-2">
            <button
              onClick={() => addTask(group.id)}
              className="text-xs text-gray-400 hover:text-brand-600 hover:bg-brand-50 px-3 py-1.5 rounded-md transition-colors w-full text-left"
            >
              + Add Task
            </button>
          </div>
        </>
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Delete Group"
          message={`Delete "${group.name}" and all its tasks? This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={() => {
            deleteGroup(group.id);
            setConfirmDelete(false);
          }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}
