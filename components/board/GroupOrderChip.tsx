"use client";

import { useState, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { defaultGroupAccent, groupColorStorageKey } from "@/lib/group-color";
import { cn } from "@/lib/utils";
import type { Group } from "@/types";

interface Props {
  group: Group;
  colorIdx: number;
  count: number;
  canEdit: boolean;
}

export default function GroupOrderChip({ group, colorIdx, count, canEdit }: Props) {
  const [accent, setAccent] = useState(defaultGroupAccent(colorIdx));

  useEffect(() => {
    const saved = localStorage.getItem(groupColorStorageKey(group.id));
    if (saved) setAccent(saved);
  }, [group.id]);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: group.id,
    data: { type: "group" },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(canEdit ? attributes : {})}
      {...(canEdit ? listeners : {})}
      title={canEdit ? "Drag to reorder group" : undefined}
      className={cn(
        "flex items-center gap-1.5 pl-2 pr-2.5 py-1.5 rounded-full border border-surface-border bg-white shadow-sm shrink-0 text-xs font-medium text-gray-600 transition-shadow",
        canEdit && "cursor-grab active:cursor-grabbing hover:shadow"
      )}
    >
      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: accent }} />
      {canEdit && (
        <svg className="w-3 h-3 text-gray-300 shrink-0" fill="currentColor" viewBox="0 0 20 20">
          <path d="M7 4a1 1 0 11-2 0 1 1 0 012 0zM7 8a1 1 0 11-2 0 1 1 0 012 0zM7 12a1 1 0 11-2 0 1 1 0 012 0zM13 4a1 1 0 11-2 0 1 1 0 012 0zM13 8a1 1 0 11-2 0 1 1 0 012 0zM13 12a1 1 0 11-2 0 1 1 0 012 0z" />
        </svg>
      )}
      <span className="truncate max-w-[140px]">{group.name}</span>
      <span className="text-gray-400">{count}</span>
    </div>
  );
}
