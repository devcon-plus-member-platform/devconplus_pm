// Pure client-safe utility — no React imports, no "use client" needed

import type { TaskStatus } from "@/types";

// Maps a task's status to the progress percentage it contributes to a
// group-linked milestone's auto-calculated progress.
export function taskStatusProgress(status: TaskStatus): number {
  switch (status) {
    case "Done":
      return 100;
    case "For Improvements":
      return 80;
    case "Review":
      return 60;
    case "In Progress":
      return 50;
    default:
      return 0;
  }
}

export function progressColor(pct: number): string {
  if (pct >= 100) return "#22c55e";
  if (pct >= 67) return "#3b82f6";
  if (pct >= 34) return "#f59e0b";
  return "#ef4444";
}

export function progressLabel(pct: number): string {
  if (pct >= 100) return "Complete";
  if (pct >= 67) return "Good progress";
  if (pct >= 34) return "Underway";
  return "Early stage";
}
