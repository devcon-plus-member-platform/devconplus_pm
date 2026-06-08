"use client";

import { useState } from "react";
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
  const [gcSending, setGcSending] = useState(false);
  const [gcStatus, setGcStatus] = useState<"idle" | "sent" | "error">("idle");
  const [gcError, setGcError] = useState<string | null>(null);

  async function handleSendToGC() {
    setGcSending(true);
    setGcStatus("idle");
    setGcError(null);
    try {
      const res = await fetch("/api/announce-gc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ announcement_id: announcement.id }),
      });
      const json = await res.json();
      if (!json.ok) {
        setGcStatus("error");
        setGcError(json.error ?? "Failed to send to GC");
      } else {
        setGcStatus("sent");
      }
    } catch {
      setGcStatus("error");
      setGcError("Network error — check your connection.");
    } finally {
      setGcSending(false);
    }
  }

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

      {/* Actions */}
      <div className="flex items-center gap-2 mt-6 pt-4 border-t border-gray-100 flex-wrap">
        {isDraft && (
          <>
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
              📣 Send to Everyone
            </button>
          </>
        )}

        <button
          onClick={handleSendToGC}
          disabled={gcSending || gcStatus === "sent"}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700 disabled:opacity-40 ml-auto"
        >
          {gcSending ? "Sending…" : gcStatus === "sent" ? "✓ Sent to GC" : "Send to GC"}
        </button>

        {gcStatus === "error" && gcError && (
          <p className="w-full text-xs text-red-500 mt-1">{gcError}</p>
        )}
      </div>
    </Modal>
  );
}
