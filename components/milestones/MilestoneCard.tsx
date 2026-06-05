"use client";

import type { Milestone, Project, Contributor } from "@/types";
import { ProgressRing, StatusBadge, CountdownText, latestProgress, latestProgressEntry, timeAgo } from "./milestone-utils";

interface Props {
  milestone: Milestone;
  onLogProgress: (m: Milestone) => void;
  onViewHistory: (m: Milestone) => void;
  onEdit: (m: Milestone) => void;
  onDelete: (id: string) => void;
}

export default function MilestoneCard({ milestone: m, onLogProgress, onViewHistory, onEdit, onDelete }: Props) {
  const pct = latestProgress(m);
  const latest = latestProgressEntry(m);
  const isAchieved = m.status === "Achieved";

  return (
    <div className={`bg-white rounded-2xl border shadow-sm p-4 flex flex-col gap-3 transition-all ${
      isAchieved ? "border-green-200 bg-green-50/30" :
      m.status === "At Risk" ? "border-orange-200" :
      m.status === "Missed" ? "border-red-200 bg-red-50/20" :
      "border-gray-100 hover:border-brand-200"
    }`}>
      {/* Header row */}
      <div className="flex items-start gap-3">
        <ProgressRing percent={pct} size={52} strokeWidth={5} achieved={isAchieved} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <StatusBadge status={m.status} />
            <CountdownText targetDate={m.target_date} />
          </div>
          <h3 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-1">{m.title}</h3>
          {m.description && (
            <p className="text-xs text-gray-400 line-clamp-2 mt-0.5">{m.description}</p>
          )}
        </div>
        {/* Edit / Delete controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => onEdit(m)}
            className="text-xs text-gray-500 hover:bg-gray-100 px-2 py-1 rounded-lg"
          >
            Edit
          </button>
          <button
            onClick={() => { if (confirm(`Delete milestone "${m.title}"?`)) onDelete(m.id); }}
            className="text-xs text-red-500 hover:bg-red-50 px-2 py-1 rounded-lg"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Target date */}
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Target: {new Date(m.target_date + "T00:00:00").toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
        {m.achieved_at && (
          <span className="ml-2 text-green-600 font-medium">
            · Achieved {new Date(m.achieved_at).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}
          </span>
        )}
      </div>

      {/* Latest progress note */}
      {latest && (
        <div className="bg-gray-50 rounded-lg px-3 py-2 text-xs text-gray-600 line-clamp-1">
          <span className="text-gray-400 mr-1">{timeAgo(latest.created_at)}:</span>
          {latest.progress_note}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 mt-auto pt-1 border-t border-gray-50">
        {!isAchieved && m.status !== "Missed" && (
          <button
            onClick={() => onLogProgress(m)}
            className="flex-1 px-3 py-1.5 text-xs font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
          >
            Log Progress
          </button>
        )}
        <button
          onClick={() => onViewHistory(m)}
          className="flex-1 px-3 py-1.5 text-xs font-medium text-brand-600 border border-brand-200 rounded-lg hover:bg-brand-50 transition-colors"
        >
          View History
        </button>
      </div>
    </div>
  );
}

export type { Project, Contributor };
