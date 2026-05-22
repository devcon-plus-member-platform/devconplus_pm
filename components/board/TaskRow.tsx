"use client";

import React, { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useBoardContext } from "./BoardContext";
import TitleCell from "./cells/TitleCell";
import AssigneeCell from "./cells/AssigneeCell";
import StatusCell from "./cells/StatusCell";
import TimelineCell from "./cells/TimelineCell";
import DueDateCell from "./cells/DueDateCell";
import AttachmentCell from "./cells/AttachmentCell";
import PRLinkCell from "./cells/PRLinkCell";
import ConfirmModal from "./modals/ConfirmModal";
import type { Task } from "@/types";

interface Props {
  task: Task;
  groupId: string;
}

export default function TaskRow({ task, groupId }: Props) {
  const { updateTask, deleteTask } = useBoardContext();
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
        className="border-b border-gray-100 hover:bg-gray-50/40 group/row"
      >
        {/* Drag handle + delete */}
        <td className="w-8 px-1">
          <div className="flex flex-col items-center gap-0.5 opacity-0 group-hover/row:opacity-100 transition-opacity">
            <button
              className="text-gray-300 hover:text-gray-500 cursor-grab text-xs leading-none px-0.5"
              title="Drag to reorder"
              {...attributes}
              {...listeners}
            >
              ⠿
            </button>
            <button
              className="text-gray-300 hover:text-red-500 text-xs leading-none px-0.5"
              title="Delete task"
              onClick={() => setConfirmDelete(true)}
            >
              🗑
            </button>
          </div>
        </td>

        {/* Title */}
        <TitleCell
          task={task}
          expanded={expanded}
          onToggleExpand={() => setExpanded((v) => !v)}
          onUpdate={patch}
        />

        {/* Assignee */}
        <AssigneeCell task={task} onUpdate={patch} />

        {/* Status */}
        <StatusCell task={task} onUpdate={patch} />

        {/* Timeline */}
        <TimelineCell task={task} onUpdate={patch} />

        {/* Due date */}
        <DueDateCell task={task} onUpdate={patch} />

        {/* Attachment */}
        <AttachmentCell task={task} groupId={groupId} />

        {/* PR link */}
        <PRLinkCell task={task} onUpdate={patch} />
      </tr>

      {/* Expanded description row */}
      {expanded && (
        <tr className="border-b border-gray-100 bg-gray-50/60">
          <td />
          <td colSpan={7} className="px-3 py-2">
            <textarea
              defaultValue={task.description ?? ""}
              onBlur={(e) => {
                const val = e.target.value;
                if (val !== (task.description ?? "")) {
                  patch({ description: val });
                }
              }}
              rows={3}
              placeholder="Add a description…"
              className="w-full text-xs text-gray-600 bg-white border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-brand-300 placeholder-gray-300"
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
