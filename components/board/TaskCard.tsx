"use client";

import { useBoardContext } from "./BoardContext";
import { taskStatusProgress } from "@/components/milestones/milestone-utils-client";
import { TASK_PRIORITY_THEME } from "@/lib/theme";
import Tag from "@/components/ui/Tag";
import PriorityChip from "@/components/ui/PriorityChip";
import AvatarStack from "@/components/ui/AvatarStack";
import ProgressBar from "@/components/ui/ProgressBar";
import { formatDate, isOverdue, cn } from "@/lib/utils";
import type { Task } from "@/types";

interface TaskCardProps {
  task: Task;
  dragging?: boolean;
}

function prNumber(url: string): string | null {
  const match = url.match(/\/pull\/(\d+)/);
  return match ? match[1] : null;
}

export default function TaskCard({ task, dragging }: TaskCardProps) {
  const { groups, contributors, commentCounts, canEdit } = useBoardContext();

  const group = groups.find((g) => g.id === task.group_id);
  const priority = task.priority ?? "Medium";
  const priorityTheme = TASK_PRIORITY_THEME[priority];
  const progress = taskStatusProgress(task.status);
  const overdue = isOverdue(task.due_date) && task.status !== "Done";
  const commentCount = commentCounts[task.id] ?? 0;

  const assigneeIds = task.assignee_ids?.length ? task.assignee_ids : task.assignee_id ? [task.assignee_id] : [];
  const avatarItems = assigneeIds
    .map((id) => contributors.find((c) => c.id === id))
    .filter(Boolean)
    .map((c) => ({ id: c!.id, label: c!.full_name ?? c!.email, color: c!.role?.color }));

  return (
    <div
      draggable={canEdit}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", task.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      className={cn(
        "bg-white rounded-xl border border-surface-border p-3 shadow-sm transition-shadow duration-150",
        canEdit && "cursor-grab active:cursor-grabbing hover:shadow-md",
        dragging && "opacity-40"
      )}
    >
      {/* Tag + priority chips */}
      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        {group && <Tag label={group.name} />}
        <PriorityChip label={priority} color={priorityTheme} />
      </div>

      {/* Title */}
      <p className="text-sm font-medium text-gray-800 leading-snug mb-2.5 line-clamp-2">
        {task.title}
      </p>

      {/* Progress */}
      <ProgressBar value={progress} color={priorityTheme.dot} className="mb-2.5" />

      {/* Footer */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <AvatarStack items={avatarItems} max={3} />
          {task.due_date && (
            <span
              className={cn(
                "text-[11px] font-medium whitespace-nowrap",
                overdue ? "text-accent-rose" : "text-gray-400"
              )}
            >
              {formatDate(task.due_date)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 text-gray-400">
          {commentCount > 0 && (
            <span className="flex items-center gap-1 text-[11px]">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
              {commentCount}
            </span>
          )}
          {task.pr_link && (
            <a
              href={task.pr_link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              title={task.pr_link}
              className="flex items-center gap-1 text-[11px] font-medium hover:text-brand-600 transition-colors"
            >
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
              </svg>
              {prNumber(task.pr_link) && <span>#{prNumber(task.pr_link)}</span>}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
