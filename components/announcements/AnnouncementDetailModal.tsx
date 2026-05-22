"use client";

import Modal from "@/components/ui/Modal";
import { formatDate } from "@/lib/utils";
import type { Announcement } from "@/types";

function renderMarkdown(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^# (.+)$/gm, "<h3 style='font-size:1rem;font-weight:700;margin-bottom:4px'>$1</h3>")
    .replace(/^## (.+)$/gm, "<h4 style='font-size:0.875rem;font-weight:600;margin-bottom:4px'>$1</h4>")
    .replace(/^- (.+)$/gm, "<li style='margin-left:1rem;list-style:disc'>$1</li>")
    .replace(/\n/g, "<br/>");
}

interface Props {
  announcement: Announcement;
  onClose: () => void;
  onEdit: () => void;
  onSend: (id: string) => Promise<void>;
}

export default function AnnouncementDetailModal({ announcement, onClose, onEdit, onSend }: Props) {
  const isDraft = !announcement.sent_at;

  return (
    <Modal open onClose={onClose} title={announcement.title} className="max-w-xl">
      {/* Meta */}
      <div className="flex items-center gap-2 mb-4">
        {isDraft ? (
          <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
            Draft
          </span>
        ) : (
          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
            Sent {formatDate(announcement.sent_at!)}
          </span>
        )}
        {announcement.author?.full_name && (
          <span className="text-xs text-gray-400">by {announcement.author.full_name}</span>
        )}
      </div>

      {/* Body */}
      <div
        className="text-sm text-gray-700 leading-relaxed max-h-[50vh] overflow-y-auto pr-1"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(announcement.body) }}
      />

      {/* Actions for drafts */}
      {isDraft && (
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-gray-100">
          <button
            onClick={onEdit}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700"
          >
            Edit
          </button>
          <button
            onClick={() => onSend(announcement.id)}
            className="px-3 py-1.5 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-medium"
          >
            📣 Send to All Contributors
          </button>
        </div>
      )}
    </Modal>
  );
}
