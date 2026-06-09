"use client";

import React, { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useBoardContext } from "./BoardContext";
import TitleCell from "./cells/TitleCell";
import AssigneeCell from "./cells/AssigneeCell";
import StatusCell from "./cells/StatusCell";
import PriorityCell from "./cells/PriorityCell";
import TimelineCell from "./cells/TimelineCell";
import DueDateCell from "./cells/DueDateCell";
import AttachmentCell from "./cells/AttachmentCell";
import PRLinkCell from "./cells/PRLinkCell";
import DefinitionOfDoneCell from "./cells/DefinitionOfDoneCell";
import CommentsCell from "./cells/CommentsCell";
import ConfirmModal from "./modals/ConfirmModal";
import type { Task, TaskStatus } from "@/types";

const STATUS_STRIPE: Record<TaskStatus, string> = {
  "Not Started":      "#9ca3af",
  "In Progress":      "#3b82f6",
  "Review":           "#f97316",
  "Done":             "#22c55e",
  "Help":             "#f59e0b",
  "I am Stuck":       "#ef4444",
  "For Improvements": "#a855f7",
};

interface Props {
  task: Task;
  groupId: string;
}

export default function TaskRow({ task, groupId }: Props) {
  const { updateTask, deleteTask, canEdit } = useBoardContext();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { type: "task", groupId } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  function patch(updates: Partial<Task>) {
    updateTask(task.id, groupId, updates, task);
  }

  return (
    <React.Fragment>
      <tr
        ref={setNodeRef}
        style={style}
        className="border-b border-gray-100 hover:bg-brand-50/30 group/row transition-colors duration-100"
      >
        {/* Controls column — left status stripe */}
        <td
          className="w-8 px-1 border-l-[3px]"
          style={{ borderLeftColor: STATUS_STRIPE[task.status] ?? "#9ca3af" }}
        >
          {canEdit && (
            <div className="flex flex-col items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-opacity duration-150">
              <button
                className="text-gray-300 hover:text-gray-500 cursor-grab transition-colors p-0.5 rounded"
                title="Drag to reorder"
                {...attributes}
                {...listeners}
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M7 4a1 1 0 11-2 0 1 1 0 012 0zM7 8a1 1 0 11-2 0 1 1 0 012 0zM7 12a1 1 0 11-2 0 1 1 0 012 0zM13 4a1 1 0 11-2 0 1 1 0 012 0zM13 8a1 1 0 11-2 0 1 1 0 012 0zM13 12a1 1 0 11-2 0 1 1 0 012 0z" />
                </svg>
              </button>
              <button
                className="text-gray-300 hover:text-red-500 transition-colors p-0.5 rounded"
                title="Delete task"
                onClick={() => setConfirmDelete(true)}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              </button>
            </div>
          )}
        </td>

        <TitleCell
          task={task}
          expanded={expanded}
          onToggleExpand={() => setExpanded((v) => !v)}
          onUpdate={patch}
        />
        <AssigneeCell task={task} onUpdate={patch} />
        <StatusCell task={task} onUpdate={patch} />
        <PriorityCell task={task} onUpdate={patch} />
        <TimelineCell task={task} onUpdate={patch} />
        <DueDateCell task={task} onUpdate={patch} />
        <AttachmentCell task={task} groupId={groupId} />
        <PRLinkCell task={task} onUpdate={patch} />
        <DefinitionOfDoneCell task={task} onUpdate={patch} />
        <CommentsCell task={task} />
      </tr>

      {/* Expanded description row */}
      {expanded && (
        <tr className="border-b border-gray-100 bg-gray-50/40">
          <td />
          <td colSpan={10} className="px-3 py-2.5">
            <textarea
              defaultValue={task.description ?? ""}
              onBlur={(e) => {
                const val = e.target.value;
                if (val !== (task.description ?? "")) patch({ description: val });
              }}
              rows={3}
              placeholder="Add a description…"
              className="w-full text-xs text-gray-600 bg-white border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-300 placeholder-gray-300 transition-shadow"
            />
          </td>
        </tr>
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Delete Task"
          message={`Delete "${task.title}"? This cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={() => {
            deleteTask(task.id, groupId);
            setConfirmDelete(false);
          }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </React.Fragment>
  );
}
