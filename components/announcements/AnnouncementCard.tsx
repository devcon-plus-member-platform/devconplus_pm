"use client";

import { formatDate } from "@/lib/utils";
import type { Announcement } from "@/types";

interface Props {
  announcement: Announcement;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function AnnouncementCard({ announcement, onView, onEdit, onDelete }: Props) {
  const isDraft = !announcement.sent_at;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow group/card">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={onView}
              className="text-sm font-semibold text-gray-800 hover:text-brand-600 text-left"
            >
              {announcement.title}
            </button>
            {isDraft ? (
              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
                Draft
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                Sent
              </span>
            )}
          </div>

          {/* Meta */}
          <p className="text-xs text-gray-400 mt-0.5">
            {isDraft
              ? `Created ${formatDate(announcement.created_at)}`
              : `Sent ${formatDate(announcement.sent_at!)}`}
            {announcement.author?.full_name ? ` · by ${announcement.author.full_name}` : ""}
          </p>

          {/* Body preview */}
          <p className="text-xs text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">
            {announcement.body.slice(0, 120)}
            {announcement.body.length > 120 ? "…" : ""}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover/card:opacity-100 transition-opacity">
          {isDraft && (
            <button
              onClick={onEdit}
              className="px-2.5 py-1 text-xs text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
            >
              Edit
            </button>
          )}
          <button
            onClick={onView}
            className="px-2.5 py-1 text-xs text-gray-500 hover:bg-gray-50 rounded-lg transition-colors"
          >
            View
          </button>
          <button
            onClick={onDelete}
            className="px-2 py-1 text-xs text-gray-300 hover:text-red-500 rounded-lg transition-colors"
            title="Delete"
          >
            🗑
          </button>
        </div>
      </div>
    </div>
  );
}
