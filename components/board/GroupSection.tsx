"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
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

  useEffect(() => {
    const saved = localStorage.getItem(storageKey(group.id));
    if (saved) setAccent(saved);
  }, [group.id]);

  useEffect(() => {
    if (!pickerOpen) return;
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
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
    canEdit,
  } = useBoardContext();

  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(group.name);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setExpanded(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [expanded]);

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
      style={{ ...style, borderLeft: `3px solid ${accent}` }}
      className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200"
    >
      {/* Group header */}
      <div
        className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100 group/header"
        style={{ backgroundColor: `${accent}0d` }}
      >
        {/* Drag handle */}
        {canEdit && (
          <button
            className="text-gray-300 hover:text-gray-500 cursor-grab opacity-0 group-hover/header:opacity-100 transition-all duration-150 shrink-0 p-0.5 rounded hover:bg-black/5"
            title="Drag group"
            {...attributes}
            {...listeners}
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M7 4a1 1 0 11-2 0 1 1 0 012 0zM7 8a1 1 0 11-2 0 1 1 0 012 0zM7 12a1 1 0 11-2 0 1 1 0 012 0zM13 4a1 1 0 11-2 0 1 1 0 012 0zM13 8a1 1 0 11-2 0 1 1 0 012 0zM13 12a1 1 0 11-2 0 1 1 0 012 0z" />
            </svg>
          </button>
        )}

        {/* Collapse / expand toggle */}
        <button
          onClick={() => toggleGroupCollapse(group.id)}
          title={collapsed ? "Expand group" : "Collapse group"}
          className="shrink-0 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-black/5 rounded transition-all duration-150"
        >
          <svg
            className="w-3.5 h-3.5 transition-transform duration-200"
            style={{ transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)" }}
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        {/* Color picker */}
        <div className="relative shrink-0" ref={pickerRef}>
          <button
            onClick={() => setPickerOpen((v) => !v)}
            title="Change group color"
            className="w-3.5 h-3.5 rounded-full border-2 border-white shadow ring-1 ring-black/10 hover:ring-black/25 transition-all duration-150 hover:scale-110"
            style={{ backgroundColor: accent }}
          />

          {pickerOpen && (
            <div className="absolute z-30 top-full left-0 mt-2 p-2.5 bg-white border border-gray-200 rounded-xl shadow-xl w-[144px]">
              <p className="text-[10px] text-gray-400 font-semibold mb-2 px-0.5 uppercase tracking-wide">Color</p>
              <div className="grid grid-cols-4 gap-1.5">
                {COLOR_PALETTE.map((c) => (
                  <button
                    key={c.value}
                    title={c.label}
                    onClick={() => pickColor(c.value)}
                    className="w-7 h-7 rounded-full border-2 transition-all duration-150 hover:scale-110 flex items-center justify-center"
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
            className="flex-1 text-sm font-semibold bg-white border border-brand-300 rounded-md px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400 transition-shadow"
          />
        ) : (
          <button
            onClick={() => canEdit && setEditingName(true)}
            className="flex-1 text-left text-sm font-semibold truncate hover:opacity-75 transition-opacity"
            style={{ color: accent }}
            title={canEdit ? "Click to rename" : undefined}
          >
            {group.name}
            <span className="ml-2 text-xs font-normal text-gray-400">
              {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
            </span>
          </button>
        )}

        {/* Expand group */}
        <button
          onClick={() => setExpanded(true)}
          className="shrink-0 opacity-0 group-hover/header:opacity-100 transition-all duration-150 p-1 rounded text-gray-300 hover:text-brand-500 hover:bg-brand-50"
          title="Expand group"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
          </svg>
        </button>

        {/* Delete group */}
        {canEdit && (
          <button
            onClick={() => setConfirmDelete(true)}
            className="shrink-0 opacity-0 group-hover/header:opacity-100 transition-all duration-150 p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50"
            title="Delete group"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          </button>
        )}
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
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="w-8" />
                  {COL_HEADERS.map((h) => (
                    <th
                      key={h.label}
                      className="px-3 py-2 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider"
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
                      className="px-4 py-5 text-center text-xs text-gray-300"
                    >
                      No tasks yet — add one below
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Add task */}
          {canEdit && (
            <div className="border-t border-gray-100 px-3 py-2">
              <button
                onClick={() => addTask(group.id)}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-brand-600 hover:bg-brand-50 px-3 py-1.5 rounded-md transition-all duration-150 w-full text-left group/add"
              >
                <svg className="w-3.5 h-3.5 transition-transform duration-150 group-hover/add:scale-110" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add Task
              </button>
            </div>
          )}
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

      {expanded && createPortal(
        <div
          className="fixed inset-0 z-50 flex flex-col bg-white"
          role="dialog"
          aria-modal="true"
        >
          {/* Modal header */}
          <div
            className="flex items-center gap-3 px-6 py-3 border-b border-gray-200 shrink-0"
            style={{ borderLeft: `4px solid ${accent}`, backgroundColor: `${accent}0d` }}
          >
            <span className="text-sm font-semibold" style={{ color: accent }}>
              {group.name}
            </span>
            <span className="text-xs text-gray-400">
              {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
            </span>
            <div className="flex-1" />
            <button
              onClick={() => setExpanded(false)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              title="Close (Esc)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Modal body */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm border-collapse">
              <colgroup>
                <col className="w-8" />
                {COL_HEADERS.map((h) => (
                  <col key={h.label} className={h.className} />
                ))}
              </colgroup>
              <thead className="sticky top-0 z-10 bg-white border-b border-gray-100">
                <tr>
                  <th className="w-8" />
                  {COL_HEADERS.map((h) => (
                    <th
                      key={h.label}
                      className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wider"
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
                    <td colSpan={COL_HEADERS.length + 1} className="px-4 py-10 text-center text-xs text-gray-300">
                      No tasks in this group yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Modal footer — add task */}
          {canEdit && (
            <div className="border-t border-gray-100 px-6 py-3 shrink-0">
              <button
                onClick={() => addTask(group.id)}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-brand-600 hover:bg-brand-50 px-3 py-1.5 rounded-md transition-all duration-150 group/add"
              >
                <svg className="w-3.5 h-3.5 transition-transform duration-150 group-hover/add:scale-110" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add Task
              </button>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
