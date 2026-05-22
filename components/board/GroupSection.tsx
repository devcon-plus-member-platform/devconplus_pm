"use client";

import { useState } from "react";
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

interface Props {
  group: Group;
}

export default function GroupSection({ group }: Props) {
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

  // Sortable group drag handle
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
    <div ref={setNodeRef} style={style} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      {/* Group header */}
      <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 border-b border-gray-200 group/header">
        {/* Drag handle */}
        <button
          className="text-gray-300 hover:text-gray-500 cursor-grab opacity-0 group-hover/header:opacity-100 transition-opacity shrink-0"
          {...attributes}
          {...listeners}
        >
          ⠿
        </button>

        {/* Collapse toggle */}
        <button
          onClick={() => toggleGroupCollapse(group.id)}
          className="text-gray-400 hover:text-gray-600 transition-colors shrink-0 text-xs"
        >
          {collapsed ? "▶" : "▼"}
        </button>

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
            className="flex-1 text-left text-sm font-semibold text-gray-700 hover:text-brand-600 truncate"
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
                <col className="w-8" /> {/* drag + delete */}
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
