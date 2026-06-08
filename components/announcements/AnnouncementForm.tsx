"use client";

import { useState, useCallback } from "react";
import type { Announcement } from "@/types";

interface Props {
  draft: Announcement | null;
  onSaveDraft: (title: string, body: string) => Promise<void>;
  onSendToAll: (title: string, body: string, existingId?: string) => Promise<void>;
  onCancel: () => void;
}

// Very lightweight markdown → HTML for preview
function renderMarkdown(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^# (.+)$/gm, "<h3 class='text-base font-bold mb-1'>$1</h3>")
    .replace(/^## (.+)$/gm, "<h4 class='text-sm font-semibold mb-1'>$1</h4>")
    .replace(/^- (.+)$/gm, "<li class='ml-4 list-disc'>$1</li>")
    .replace(/\n/g, "<br/>");
}

export default function AnnouncementForm({ draft, onSaveDraft, onSendToAll, onCancel }: Props) {
  const [title, setTitle] = useState(draft?.title ?? "");
  const [body, setBody] = useState(draft?.body ?? "");
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  const canSubmit = title.trim().length > 0 && body.trim().length > 0;

  const handleSaveDraft = useCallback(async () => {
    setSaving(true);
    await onSaveDraft(title.trim(), body.trim());
    setSaving(false);
  }, [title, body, onSaveDraft]);

  const handleSendToAll = useCallback(async () => {
    setSending(true);
    try {
      await onSendToAll(title.trim(), body.trim(), draft?.id);
    } finally {
      setSending(false);
    }
  }, [title, body, draft?.id, onSendToAll]);

  return (
    <div className="max-w-2xl mx-auto px-6 py-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-800">
          {draft ? "Edit Draft" : "New Announcement"}
        </h2>
        <button
          onClick={onCancel}
          className="text-sm text-gray-400 hover:text-gray-600"
        >
          ✕ Cancel
        </button>
      </div>

      {/* Title */}
      <div className="mb-4">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Announcement title…"
          className="w-full text-base font-medium border-0 border-b border-gray-200 pb-2 focus:outline-none focus:border-brand-400 placeholder-gray-300"
        />
      </div>

      {/* Preview toggle */}
      <div className="flex items-center gap-2 mb-2">
        <button
          onClick={() => setPreview(false)}
          className={`text-xs px-2.5 py-1 rounded-md transition-colors ${!preview ? "bg-gray-200 text-gray-700 font-medium" : "text-gray-400 hover:bg-gray-100"}`}
        >
          Write
        </button>
        <button
          onClick={() => setPreview(true)}
          className={`text-xs px-2.5 py-1 rounded-md transition-colors ${preview ? "bg-gray-200 text-gray-700 font-medium" : "text-gray-400 hover:bg-gray-100"}`}
        >
          Preview
        </button>
        <span className="text-xs text-gray-300 ml-1">Markdown supported</span>
      </div>

      {/* Editor / Preview */}
      {preview ? (
        <div
          className="min-h-[200px] p-4 border border-gray-200 rounded-xl bg-gray-50/50 text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: body ? renderMarkdown(body) : '<span class="text-gray-300 italic">Nothing to preview yet</span>' }}
        />
      ) : (
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={10}
          placeholder={"Write your announcement here.\n\nSupports **bold**, *italic*, # headings, and - lists."}
          className="w-full text-sm border border-gray-200 rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-brand-300 placeholder-gray-300 leading-relaxed"
        />
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100">
        <button
          onClick={handleSaveDraft}
          disabled={!canSubmit || saving || sending}
          className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors text-gray-700 font-medium"
        >
          {saving ? "Saving…" : "Save as Draft"}
        </button>
        <button
          onClick={handleSendToAll}
          disabled={!canSubmit || saving || sending}
          className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-40 transition-colors font-medium flex items-center gap-2"
        >
          {sending ? "Sending…" : "📣 Send to All Contributors"}
        </button>
      </div>
    </div>
  );
}
