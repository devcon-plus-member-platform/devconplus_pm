"use client";

import { formatDate } from "@/lib/utils";
import type { Bug, BugSeverity, BugStatus, Contributor } from "@/types";

const SEVERITY_STYLES: Record<BugSeverity, string> = {
  Critical: "bg-red-100 text-red-700",
  High:     "bg-orange-100 text-orange-700",
  Medium:   "bg-yellow-100 text-yellow-700",
  Low:      "bg-gray-100 text-gray-600",
};

const STATUS_STYLES: Record<BugStatus, string> = {
  "Open":               "bg-blue-100 text-blue-700",
  "In Progress":        "bg-purple-100 text-purple-700",
  "Resolved":           "bg-green-100 text-green-700",
  "Closed":             "bg-gray-100 text-gray-500",
  "Cannot Reproduce":   "bg-slate-100 text-slate-600",
};

function timeAgo(dateStr: string): string {
  const secs = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return formatDate(dateStr);
}

interface Props {
  bug: Bug;
  onClick: () => void;
}

export default function BugCard({ bug, onClick }: Props) {
  const screenshotCount = bug.screenshot_urls?.length ?? 0;

  return (
    <div
      className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow cursor-pointer group/card"
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          {/* Badges row */}
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${SEVERITY_STYLES[bug.severity]}`}>
              {bug.severity}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[bug.status]}`}>
              {bug.status}
            </span>
            {bug.qa_test_id && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-indigo-50 text-indigo-600 border border-indigo-100">
                From QA{bug.qa_test?.title ? `: ${bug.qa_test.title.slice(0, 30)}` : ""}
              </span>
            )}
            {bug.linked_task?.title && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-gray-50 text-gray-500 border border-gray-100">
                Task: {bug.linked_task.title.slice(0, 30)}
              </span>
            )}
            {screenshotCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-teal-50 text-teal-600 border border-teal-100">
                {screenshotCount} screenshot{screenshotCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {/* Title */}
          <p className="text-sm font-semibold text-gray-800 group-hover/card:text-brand-600 transition-colors">
            {bug.title}
          </p>

          {/* Meta */}
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className="text-xs text-gray-400">
              Reported {timeAgo(bug.created_at)}
              {bug.reporter?.full_name ? ` by ${bug.reporter.full_name}` : ""}
            </span>

            <span className="text-xs text-gray-300">·</span>

            {bug.assignee ? (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <span
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                  style={{ backgroundColor: "#6366f1" }}
                >
                  {(bug.assignee.full_name ?? bug.assignee.email)[0].toUpperCase()}
                </span>
                {bug.assignee.full_name ?? bug.assignee.email}
              </span>
            ) : (
              <span className="text-xs text-gray-300 italic">Unassigned</span>
            )}

            {bug.environment && (
              <>
                <span className="text-xs text-gray-300">·</span>
                <span className="text-xs text-gray-400">{bug.environment}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
