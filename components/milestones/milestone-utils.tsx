"use client";

import { useState, useCallback } from "react";
import type { Milestone, MilestoneProgress, MilestoneStatus } from "@/types";
import { progressColor, taskStatusProgress } from "./milestone-utils-client";
import { MILESTONE_STATUS_THEME } from "@/lib/theme";

interface ProgressRingProps {
  percent: number;
  size?: number;
  strokeWidth?: number;
  achieved?: boolean;
}

export function ProgressRing({ percent, size = 48, strokeWidth = 4, achieved = false }: ProgressRingProps) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  const color = progressColor(percent);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={achieved ? "animate-pulse" : ""}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={strokeWidth} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.4s ease" }}
      />
      <text x={size / 2} y={size / 2 + 1} textAnchor="middle" dominantBaseline="middle" fontSize={size * 0.22} fontWeight="700" fill={color}>
        {percent}%
      </text>
    </svg>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

export function StatusBadge({ status }: { status: MilestoneStatus }) {
  const theme = MILESTONE_STATUS_THEME[status];
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${theme.bg} ${theme.fg}`}>
      {status === "Achieved" && <span>✓</span>}
      {status}
    </span>
  );
}

// ─── Countdown text ───────────────────────────────────────────────────────────
// Colored primarily by the milestone's status; falls back to day-based
// urgency for statuses that don't carry their own color (Not Started / In Progress).

export function CountdownText({ targetDate, status }: { targetDate: string; status: MilestoneStatus }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(targetDate + "T00:00:00");
  const diffMs = target.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (status === "Missed") {
    return (
      <span className="text-accent-rose text-xs font-medium">
        Missed by {Math.abs(diffDays)} day{Math.abs(diffDays) !== 1 ? "s" : ""}
      </span>
    );
  }
  if (status === "Achieved") {
    return <span className="text-emerald-600 text-xs font-medium">Achieved</span>;
  }
  if (status === "At Risk") {
    return <span className="text-accent-amber text-xs font-medium">At risk · due in {Math.max(diffDays, 0)} day{diffDays !== 1 ? "s" : ""}</span>;
  }
  if (diffDays === 0) {
    return <span className="text-accent-rose font-bold text-xs">Due today</span>;
  }
  if (diffDays < 0) {
    return (
      <span className="text-accent-rose text-xs">
        Overdue by {Math.abs(diffDays)} day{Math.abs(diffDays) !== 1 ? "s" : ""}
      </span>
    );
  }
  if (diffDays <= 3) {
    return <span className="text-accent-amber text-xs">Due in {diffDays} day{diffDays !== 1 ? "s" : ""}</span>;
  }
  return <span className="text-gray-400 text-xs">Due in {diffDays} days</span>;
}

// ─── Latest progress percent helper ──────────────────────────────────────────

export function latestProgress(milestone: Milestone): number {
  const entries = milestone.progress ?? [];
  if (entries.length === 0) return 0;
  const sorted = [...entries].sort((a, b) => b.logged_date.localeCompare(a.logged_date) || b.created_at.localeCompare(a.created_at));
  return sorted[0].progress_percent;
}

export function latestProgressEntry(milestone: Milestone): MilestoneProgress | null {
  const entries = milestone.progress ?? [];
  if (entries.length === 0) return null;
  return [...entries].sort((a, b) => b.logged_date.localeCompare(a.logged_date) || b.created_at.localeCompare(a.created_at))[0];
}

// ─── Group-linked auto progress ──────────────────────────────────────────────
// When a milestone is linked to one or more groups, its progress is derived
// from the status of every task in those groups instead of manual logging.

export function isGroupLinked(milestone: Milestone): boolean {
  return (milestone.groups ?? []).length > 0;
}

export function autoProgress(milestone: Milestone): number | null {
  const tasks = (milestone.groups ?? []).flatMap((g) => g.tasks ?? []);
  if (tasks.length === 0) return null;
  const total = tasks.reduce((sum, t) => sum + taskStatusProgress(t.status), 0);
  return Math.round(total / tasks.length);
}

export function displayProgress(milestone: Milestone): number {
  const auto = autoProgress(milestone);
  return auto !== null ? auto : latestProgress(milestone);
}

// ─── Time ago helper ──────────────────────────────────────────────────────────

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ─── Re-exports for use in other milestone components ─────────────────────────
export type { Milestone, MilestoneProgress };
export { useCallback, useState };
