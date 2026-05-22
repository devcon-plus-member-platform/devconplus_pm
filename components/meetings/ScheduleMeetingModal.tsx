"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import type { Contributor, MeetingType, MeetingRecurrence } from "@/types";

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

interface MeetingFormState {
  title: string;
  type: MeetingType;
  description: string;
  meeting_date: string;
  start_time: string;
  end_time: string;
  timezone: string;
  recurrence: MeetingRecurrence;
  recurrence_end_date: string;
  reminder_minutes_before: number;
  attendee_ids: string[];
  project_id: string;
}

interface Props {
  contributors: Contributor[];
  projectId?: string;
  onScheduled: (meeting: unknown) => void;
  onClose: () => void;
}

export default function ScheduleMeetingModal({ contributors, projectId, onScheduled, onClose }: Props) {
  const [form, setForm] = useState<MeetingFormState>({
    title: "",
    type: "Standup",
    description: "",
    meeting_date: "",
    start_time: "20:00",
    end_time: "21:00",
    timezone: "Asia/Manila",
    recurrence: "None",
    recurrence_end_date: "",
    reminder_minutes_before: 30,
    attendee_ids: contributors.map((c) => c.id), // select all by default
    project_id: projectId ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof MeetingFormState>(key: K, value: MeetingFormState[K]) {
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

  const canSubmit = form.title.trim() && form.meeting_date && form.start_time && form.end_time;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || saving) return;
    setSaving(true);
    setError(null);

    const res = await fetch("/api/meetings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        project_id: form.project_id || null,
        description: form.description || null,
        recurrence_end_date: form.recurrence_end_date || null,
        start_time: form.start_time + ":00",
        end_time:   form.end_time   + ":00",
      }),
    });

    const json = await res.json();
    if (!json.ok) {
      setError(json.error ?? "Failed to schedule meeting.");
      setSaving(false);
      return;
    }

    onScheduled(json.meeting);
  }

  return (
    <Modal open onClose={onClose} title="Schedule Meeting" className="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        {/* Title + Type */}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. Daily Standup"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
            <select value={form.type} onChange={(e) => set("type", e.target.value as MeetingType)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-300">
              {TYPE_OPTIONS.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            rows={2}
            placeholder="Optional agenda or notes (appears in Google Calendar event)"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-brand-300 placeholder-gray-300"
          />
        </div>

        {/* Date + Times */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date <span className="text-red-400">*</span></label>
            <input type="date" value={form.meeting_date} onChange={(e) => set("meeting_date", e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Start Time <span className="text-red-400">*</span></label>
            <input type="time" value={form.start_time} onChange={(e) => set("start_time", e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">End Time <span className="text-red-400">*</span></label>
            <input type="time" value={form.end_time} onChange={(e) => set("end_time", e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300" />
          </div>
        </div>

        {/* Timezone + Recurrence */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Timezone</label>
            <select value={form.timezone} onChange={(e) => set("timezone", e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-300">
              {TIMEZONE_OPTIONS.map((tz) => <option key={tz}>{tz}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Recurrence</label>
            <select value={form.recurrence} onChange={(e) => set("recurrence", e.target.value as MeetingRecurrence)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-300">
              {RECURRENCE_OPTIONS.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
          {form.recurrence !== "None" && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Repeat Until</label>
              <input type="date" value={form.recurrence_end_date} onChange={(e) => set("recurrence_end_date", e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300" />
            </div>
          )}
        </div>

        {/* Reminder */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Send Reminder</label>
          <select value={form.reminder_minutes_before} onChange={(e) => set("reminder_minutes_before", Number(e.target.value))} className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-300">
            {REMINDER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* Attendees */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-gray-600">Attendees</label>
            <button
              type="button"
              onClick={() => set("attendee_ids", form.attendee_ids.length === contributors.length ? [] : contributors.map((c) => c.id))}
              className="text-xs text-brand-600 hover:underline"
            >
              {form.attendee_ids.length === contributors.length ? "Deselect all" : "Select all"}
            </button>
          </div>
          <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-xl divide-y divide-gray-50">
            {contributors.map((c) => (
              <label key={c.id} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 transition-colors">
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
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" disabled={!canSubmit || saving} className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-40 font-medium flex items-center gap-2">
            {saving ? "Scheduling…" : "📅 Schedule & Send Invites"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
