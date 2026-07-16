"use client";

import { useState } from "react";
import { useBoardContext } from "./BoardContext";
import TaskCard from "./TaskCard";
import { KANBAN_COLUMNS, COLUMN_DEFAULT_STATUS, statusToColumn, type KanbanColumnKey } from "@/lib/board-columns";
import { cn } from "@/lib/utils";
import type { Task } from "@/types";

const COLUMN_DOT: Record<KanbanColumnKey, string> = {
  "Backlog": "#9ca3af",
  "In Progress": "#3b5ee8",
  "Needs Help": "#ef4444",
  "In Review": "#f97316",
  "Done": "#10b981",
};

interface Props {
  taskFilter?: (task: Task) => boolean;
}

export default function KanbanBoard({ taskFilter }: Props) {
  const { groups, tasksByGroup, updateTask, addTask, canEdit } = useBoardContext();
  const [dragOverColumn, setDragOverColumn] = useState<KanbanColumnKey | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const allTasks: Task[] = groups.flatMap((g) => tasksByGroup[g.id] ?? []).filter((t) => taskFilter?.(t) ?? true);

  const columns = KANBAN_COLUMNS.map((col) => ({
    ...col,
    tasks: allTasks.filter((t) => statusToColumn(t.status) === col.key),
  }));

  function handleAddCard(columnKey: KanbanColumnKey) {
    if (!canEdit || groups.length === 0) return;
    addTask(groups[0].id, { status: COLUMN_DEFAULT_STATUS[columnKey] });
  }

  function handleDrop(e: React.DragEvent, columnKey: KanbanColumnKey) {
    e.preventDefault();
    setDragOverColumn(null);
    setDraggingId(null);
    if (!canEdit) return;
    const taskId = e.dataTransfer.getData("text/plain");
    const task = allTasks.find((t) => t.id === taskId);
    if (!task) return;
    if (statusToColumn(task.status) === columnKey) return;
    updateTask(task.id, task.group_id, { status: COLUMN_DEFAULT_STATUS[columnKey] }, task);
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin h-full items-start">
      {columns.map((col) => {
        const isNeedsHelp = col.key === "Needs Help";
        const isOver = dragOverColumn === col.key;
        return (
          <div
            key={col.key}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverColumn(col.key);
            }}
            onDragLeave={() => setDragOverColumn((v) => (v === col.key ? null : v))}
            onDrop={(e) => handleDrop(e, col.key)}
            className={cn(
              "min-w-[280px] w-[280px] shrink-0 rounded-2xl p-3 flex flex-col transition-colors duration-150",
              isNeedsHelp ? "bg-rose-50/70" : "bg-gray-100/70",
              isOver && "ring-2 ring-brand/40"
            )}
          >
            <div className="flex items-center justify-between px-1 mb-3 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: isNeedsHelp ? "#ef4444" : COLUMN_DOT[col.key] }}
                />
                <h3
                  className={cn(
                    "font-semibold text-sm truncate",
                    isNeedsHelp ? "text-accent-rose" : "text-gray-700"
                  )}
                >
                  {col.key}
                </h3>
                <span
                  className={cn(
                    "text-xs font-medium px-1.5 py-0.5 rounded-md shrink-0",
                    isNeedsHelp ? "bg-rose-100 text-accent-rose" : "bg-white text-gray-500"
                  )}
                >
                  {col.tasks.length}
                </span>
              </div>
              {canEdit && (
                <button
                  onClick={() => handleAddCard(col.key)}
                  disabled={groups.length === 0}
                  title="Add task"
                  className={cn(
                    "shrink-0 p-1 rounded-md transition-colors disabled:opacity-30",
                    isNeedsHelp ? "text-accent-rose hover:bg-rose-100" : "text-gray-400 hover:bg-white hover:text-gray-600"
                  )}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </button>
              )}
            </div>

            <div className="space-y-2 min-h-[40px]">
              {col.tasks.map((task) => (
                <div
                  key={task.id}
                  onDragStart={() => setDraggingId(task.id)}
                  onDragEnd={() => setDraggingId(null)}
                >
                  <TaskCard task={task} dragging={draggingId === task.id} />
                </div>
              ))}
              {col.tasks.length === 0 && (
                <div className="text-center py-6 text-xs text-gray-300">No tasks</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
