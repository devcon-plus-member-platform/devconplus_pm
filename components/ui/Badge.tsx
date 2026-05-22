import { cn } from "@/lib/utils";
import type { TaskStatus, QAStatus } from "@/types";

// Role badge
export function RoleBadge({
  name,
  color,
}: {
  name: string;
  color: string;
}) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white"
      style={{ backgroundColor: color }}
    >
      {name}
    </span>
  );
}

// Task status badge
const STATUS_STYLES: Record<TaskStatus, string> = {
  "Not Started":      "bg-gray-100 text-gray-600",
  "In Progress":      "bg-blue-100 text-blue-700",
  "Done":             "bg-green-100 text-green-700",
  "Help":             "bg-yellow-100 text-yellow-700",
  "I am Stuck":       "bg-red-100 text-red-700",
  "For Improvements": "bg-purple-100 text-purple-700",
};

export function StatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
        STATUS_STYLES[status]
      )}
    >
      {status}
    </span>
  );
}

// QA status badge
const QA_STATUS_STYLES: Record<QAStatus, string> = {
  "Pass":    "bg-green-100 text-green-700",
  "Fail":    "bg-red-100 text-red-700",
  "Blocked": "bg-yellow-100 text-yellow-700",
  "Not Run": "bg-gray-100 text-gray-600",
};

export function QAStatusBadge({ status }: { status: QAStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
        QA_STATUS_STYLES[status]
      )}
    >
      {status}
    </span>
  );
}
