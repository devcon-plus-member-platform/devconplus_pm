import type { TaskStatus } from "@/types";

export type KanbanColumnKey = "Backlog" | "In Progress" | "Needs Help" | "In Review" | "Done";

export const KANBAN_COLUMNS: { key: KanbanColumnKey; statuses: TaskStatus[] }[] = [
  { key: "Backlog", statuses: ["Not Started"] },
  { key: "In Progress", statuses: ["In Progress"] },
  { key: "Needs Help", statuses: ["Help", "I am Stuck"] },
  { key: "In Review", statuses: ["Review", "For Improvements"] },
  { key: "Done", statuses: ["Done"] },
];

export function statusToColumn(status: TaskStatus): KanbanColumnKey {
  return KANBAN_COLUMNS.find((c) => c.statuses.includes(status))?.key ?? "Backlog";
}

// Status a card takes on when dropped into a column that maps to more than
// one underlying TaskStatus — picks the "primary" one of the group.
export const COLUMN_DEFAULT_STATUS: Record<KanbanColumnKey, TaskStatus> = {
  "Backlog": "Not Started",
  "In Progress": "In Progress",
  "Needs Help": "Help",
  "In Review": "Review",
  "Done": "Done",
};
