// Kanban board — implemented in Batch 2
"use client";

import type { BoardData } from "@/types";

interface KanbanBoardProps {
  data: BoardData;
}

export default function KanbanBoard({ data }: KanbanBoardProps) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
      {data.columns.map((col) => (
        <div
          key={col.group.id}
          className="min-w-72 w-72 bg-gray-100 rounded-xl p-3"
        >
          <h3 className="font-semibold text-sm text-gray-700 mb-3">
            {col.group.name}
          </h3>
          <div className="space-y-2">
            {col.tasks.map((task) => (
              <div
                key={task.id}
                className="bg-white rounded-lg p-3 shadow-sm text-sm"
              >
                {task.title}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
