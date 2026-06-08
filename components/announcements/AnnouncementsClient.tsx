"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import AnnouncementCard from "./AnnouncementCard";
import AnnouncementForm from "./AnnouncementForm";
import AnnouncementDetailModal from "./AnnouncementDetailModal";
import Toast from "@/components/ui/Toast";
import type { Announcement, Contributor } from "@/types";

interface Props {
  initialAnnouncements: Announcement[];
  contributors: Contributor[];
}

interface ToastState {
  message: string;
  type: "success" | "error";
}

export default function AnnouncementsClient({ initialAnnouncements, contributors }: Props) {
  const supabase = createClient();
  const [announcements, setAnnouncements] = useState<Announcement[]>(initialAnnouncements);
  const [showForm, setShowForm] = useState(false);
  const [editingDraft, setEditingDraft] = useState<Announcement | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ message, type });
  }

  // ─── Create / update ────────────────────────────────────────────────────────
  async function handleSaveDraft(title: string, body: string) {
    if (editingDraft) {
      const { data } = await supabase
        .from("announcements")
        .update({ title, body })
        .eq("id", editingDraft.id)
        .select("*, author:contributors(id,full_name,email)")
        .single();
      if (data) {
        setAnnouncements((prev) =>
          prev.map((a) => (a.id === editingDraft.id ? (data as Announcement) : a))
        );
      }
    } else {
      const { data } = await supabase
        .from("announcements")
        .insert({ title, body })
        .select("*, author:contributors(id,full_name,email)")
        .single();
      if (data) setAnnouncements((prev) => [data as Announcement, ...prev]);
    }
    setShowForm(false);
    setEditingDraft(null);
  }

  async function handleSendToAll(
    title: string,
    body: string,
    existingId?: string
  ) {
    let announcementId = existingId;

    // Upsert the announcement record first
    if (existingId) {
      const { error: updateError } = await supabase
        .from("announcements")
        .update({ title, body })
        .eq("id", existingId);
      if (updateError) { showToast(`Failed to update: ${updateError.message}`, "error"); return; }
    } else {
      const { data, error: insertError } = await supabase
        .from("announcements")
        .insert({ title, body })
        .select("id")
        .single();
      if (insertError || !data) {
        showToast(`Failed to save: ${insertError?.message ?? "unknown error"}`, "error");
        return;
      }
      announcementId = data.id as string;
    }

    // Call the announce API — it sets sent_at and sends emails
    const res = await fetch("/api/announce", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ announcement_id: announcementId }),
    });
    const json = await res.json();

    if (!json.ok) {
      showToast(`Failed: ${json.error ?? "unknown error"}`, "error");
      return;
    }

    showToast(`Announcement sent to ${json.sent} contributor${json.sent !== 1 ? "s" : ""}.`);

    // Refresh the list
    const { data: refreshed } = await supabase
      .from("announcements")
      .select("*, author:contributors(id,full_name,email)")
      .order("created_at", { ascending: false });
    if (refreshed) setAnnouncements(refreshed as Announcement[]);

    setShowForm(false);
    setEditingDraft(null);
  }

  async function handleDelete(id: string) {
    await supabase.from("announcements").delete().eq("id", id);
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
  }

  const viewing = announcements.find((a) => a.id === viewingId);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-gray-800">Announcements</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {contributors.length} active contributor{contributors.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => { setEditingDraft(null); setShowForm(true); }}
          className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
        >
          + New Announcement
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {showForm || editingDraft ? (
          <AnnouncementForm
            draft={editingDraft}
            onSaveDraft={handleSaveDraft}
            onSendToAll={handleSendToAll}
            onCancel={() => { setShowForm(false); setEditingDraft(null); }}
          />
        ) : announcements.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 text-gray-400 gap-3">
            <span className="text-4xl">📣</span>
            <p className="text-sm">No announcements yet.</p>
            <button
              onClick={() => setShowForm(true)}
              className="text-brand-600 text-sm hover:underline font-medium"
            >
              Create your first announcement
            </button>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto px-6 py-4 space-y-3">
            {announcements.map((a) => (
              <AnnouncementCard
                key={a.id}
                announcement={a}
                onView={() => setViewingId(a.id)}
                onEdit={() => { setEditingDraft(a); setShowForm(false); }}
                onDelete={() => handleDelete(a.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail modal */}
      {viewing && (
        <AnnouncementDetailModal
          announcement={viewing}
          onClose={() => setViewingId(null)}
          onEdit={() => { setViewingId(null); setEditingDraft(viewing); }}
          onSend={(id) => handleSendToAll(viewing.title, viewing.body, id)}
        />
      )}

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}
