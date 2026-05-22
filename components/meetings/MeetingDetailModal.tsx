"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import type { Contributor, Meeting, MeetingType, MeetingRecurrence, Project } from "@/types";

const TYPE_OPTIONS: MeetingType[] = ["Standup", "Audit", "Other"];
const RECURRENCE_OPTIONS: MeetingRecurrence[] = ["None", "Daily", "Weekly", "Biweekly", "Monthly"];
const TIMEZONE_OPTIONS = ["Asia/Manila", "UTC", "America/New_York", "America/Los_Angeles", "Europe/London", "Asia/Tokyo"];
const REMINDER_OPTIONS = [
  { label: "15 minutes before", value: 15 },
  { label: "30 minutes before", value: 30 },
  { label: "1 hour before",     value: 60 },
  { label: "2 hours before",    value: 120 },
  { label: "1 day before",      value: 1440 },
];

interface Props {
  meeting: Meeting;
  contributors: Contributor[];
  projects: Project[];
  onUpdated: (meeting: Meeting) => void;
  onCancel: (id: string) => void;
  onClose: () => void;
}

export default function MeetingDetailModal({ meeting, contributors, projects, onUpdated, onCancel, onClose }: Props) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const existingAttendees = (meeting.attendees ?? []) as Array<{ contributor_id: string; contributor?: Contributor }>;
  const existingAttendeeIds = existingAttendees.map((a) => a.contributor_id);

  const [form, setForm] = useState({
    title: meeting.title,
    type: meeting.type as MeetingType,
    description: meeting.description ?? "",
    meeting_date: meeting.meeting_date,
    start_time: meeting.start_time.slice(0, 5),
    end_time: meeting.end_time.slice(0, 5),
    timezone: meeting.timezone,
    recurrence: meeting.recurrence as MeetingRecurrence,
    recurrence_end_date: meeting.recurrence_end_date ?? "",
    reminder_minutes_before: meeting.reminder_minutes_before,
    attendee_ids: existingAttendeeIds,
    project_id: meeting.project_id ?? "",
  });

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleAttendee(id: string) {
    setForm((f) => ({
      ...f,
      attendee_ids: f.attendee_ids.includes(id)
        ? f.attendee_ids.filter((a) => a !== id)
        : [...f.attendee_ids, id],
    }));
  }

  async function handleSave() {
    if (!form.title.trim() || saving) return;
    setSaving(true);
    setError(null);

    const attendeeEmails = contributors
      .filter((c) => form.attendee_ids.includes(c.id))
      .map((c) => c.email);

    const res = await fetch(`/api/meetings/${meeting.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        project_id: form.project_id || null,
        description: form.description || null,
        recurrence_end_date: form.recurrence_end_date || null,
        start_time: form.start_time + ":00",
        end_time: form.end_time + ":00",
        attendee_emails: attendeeEmails,
      }),
    });

    const json = await res.json();
    if (!json.ok) {
      setError(json.error ?? "Failed to update meeting.");
      setSaving(false);
      return;
    }

    onUpdated(json.meeting as Meeting);
    setEditing(false);
    setSaving(false);
  }

  const isCancelled = meeting.status === "Cancelled";

  return (
    <Modal open onClose={onClose} title={editing ? "Edit Meeting" : "Meeting Details"} className="max-w-xl">
      <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        {!editing ? (
          /* --- View mode --- */
          <>
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-semibold text-gray-900">{meeting.title}</h2>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    meeting.type === "Standup" ? "bg-blue-100 text-blue-700" :
                    meeting.type === "Audit"   ? "bg-amber-100 text-amber-700" :
                    "bg-gray-100 text-gray-600"
                  }`}>{meeting.type}</span>
                  {isCancelled && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">Cancelled</span>}
                </div>
                {meeting.description && (
                  <p className="text-sm text-gray-500 mt-1">{meeting.description}</p>
                )}
              </div>
            </div>

            {/* Date / Time / TZ */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-0.5">Date</p>
                <p className="font-medium text-gray-700">
                  {new Date(meeting.meeting_date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" })}
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-0.5">Time</p>
                <p className="font-medium text-gray-700">
                  {meeting.start_time.slice(0, 5)} – {meeting.end_time.slice(0, 5)}
                </p>
                <p className="text-xs text-gray-400">{meeting.timezone}</p>
              </div>
            </div>

            {/* Recurrence */}
            {meeting.recurrence !== "None" && (
              <div className="bg-gray-50 rounded-xl p-3 text-sm">
                <p className="text-xs text-gray-400 mb-0.5">Recurrence</p>
                <p className="font-medium text-gray-700 capitalize">
                  {meeting.recurrence}
                  {meeting.recurrence_end_date ? ` until ${meeting.recurrence_end_date}` : ""}
                </p>
              </div>
            )}

            {/* Google Meet link */}
            {meeting.google_meet_link && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl p-3">
                <svg className="w-4 h-4 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.869v6.262a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                <a
                  href={meeting.google_meet_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-green-700 font-medium hover:underline truncate"
                >
                  Join Google Meet
                </a>
              </div>
            )}

            {/* Project */}
            {meeting.project_id && (
              <div className="text-sm">
                <span className="text-xs text-gray-400">Project: </span>
                <span className="text-gray-700">{projects.find((p) => p.id === meeting.project_id)?.name ?? "—"}</span>
              </div>
            )}

            {/* Attendees */}
            {existingAttendees.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">Attendees ({existingAttendees.length})</p>
                <div className="flex flex-wrap gap-2">
                  {existingAttendees.map((a) => {
                    const c = a.contributor ?? contributors.find((x) => x.id === a.contributor_id);
                    const name = c?.full_name ?? c?.email ?? a.contributor_id;
                    const initials = name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
                    return (
                      <div key={a.contributor_id} className="flex items-center gap-1.5 bg-gray-50 rounded-full px-2.5 py-1" title={c?.email}>
                        <div className="w-5 h-5 rounded-full bg-brand-200 text-brand-700 text-[9px] font-bold flex items-center justify-center">
                          {initials}
                        </div>
                        <span className="text-xs text-gray-700">{name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button onClick={onClose} className="px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                Close
              </button>
              {!isCancelled && (
                <>
                  <button
                    onClick={() => onCancel(meeting.id)}
                    className="px-3 py-2 text-sm text-red-500 border border-red-200 rounded-lg hover:bg-red-50"
                  >
                    Cancel Meeting
                  </button>
                  <button
                    onClick={() => setEditing(true)}
                    className="px-3 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-medium"
                  >
                    Edit
                  </button>
                </>
              )}
            </div>
          </>
        ) : (
          /* --- Edit mode --- */
          <>
            {/* Title + Type */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setField("title", e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                <select value={form.type} onChange={(e) => setField("type", e.target.value as MeetingType)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-300">
                  {TYPE_OPTIONS.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                rows={2}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-brand-300"
              />
            </div>

            {/* Date + Times */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                <input type="date" value={form.meeting_date} onChange={(e) => setField("meeting_date", e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Start</label>
                <input type="time" value={form.start_time} onChange={(e) => setField("start_time", e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">End</label>
                <input type="time" value={form.end_time} onChange={(e) => setField("end_time", e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300" />
              </div>
            </div>

            {/* Timezone + Recurrence */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Timezone</label>
                <select value={form.timezone} onChange={(e) => setField("timezone", e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-300">
                  {TIMEZONE_OPTIONS.map((tz) => <option key={tz}>{tz}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Recurrence</label>
                <select value={form.recurrence} onChange={(e) => setField("recurrence", e.target.value as MeetingRecurrence)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-300">
                  {RECURRENCE_OPTIONS.map((r) => <option key={r}>{r}</option>)}
                </select>
              </div>
              {form.recurrence !== "None" && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Repeat Until</label>
                  <input type="date" value={form.recurrence_end_date} onChange={(e) => setField("recurrence_end_date", e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300" />
                </div>
              )}
            </div>

            {/* Reminder */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Send Reminder</label>
              <select value={form.reminder_minutes_before} onChange={(e) => setField("reminder_minutes_before", Number(e.target.value))} className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-300">
                {REMINDER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            {/* Attendees */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-gray-600">Attendees</label>
                <button
                  type="button"
                  onClick={() => setField("attendee_ids", form.attendee_ids.length === contributors.length ? [] : contributors.map((c) => c.id))}
                  className="text-xs text-brand-600 hover:underline"
                >
                  {form.attendee_ids.length === contributors.length ? "Deselect all" : "Select all"}
                </button>
              </div>
              <div className="max-h-36 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-50">
                {contributors.map((c) => (
                  <label key={c.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={form.attendee_ids.includes(c.id)}
                      onChange={() => toggleAttendee(c.id)}
                      className="rounded border-gray-300 text-brand-600 focus:ring-brand-300"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 truncate">{c.full_name ?? c.email}</p>
                      <p className="text-xs text-gray-400 truncate">{c.email}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button type="button" onClick={() => setEditing(false)} className="px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                Back
              </button>
              <button
                onClick={handleSave}
                disabled={!form.title.trim() || saving}
                className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-40 font-medium"
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
