"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import CalendarGrid from "./CalendarGrid";
import ScheduleMeetingModal from "./ScheduleMeetingModal";
import MeetingDetailModal from "./MeetingDetailModal";
import type { Meeting, Contributor, Project } from "@/types";

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const TYPE_BADGE: Record<string, string> = {
  Standup: "bg-blue-100 text-blue-700",
  Audit:   "bg-amber-100 text-amber-700",
  Other:   "bg-gray-100 text-gray-600",
};

const STATUS_BADGE: Record<string, string> = {
  Scheduled:  "bg-green-100 text-green-700",
  Cancelled:  "bg-red-100 text-red-600",
  Completed:  "bg-gray-100 text-gray-500",
};

interface Props {
  initialMeetings: Meeting[];
  contributors: Contributor[];
  projects: Project[];
}

export default function MeetingsClient({ initialMeetings, contributors, projects }: Props) {
  const [meetings, setMeetings] = useState<Meeting[]>(initialMeetings);
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [typeFilter, setTypeFilter] = useState<string>("All");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [viewingMeeting, setViewingMeeting] = useState<Meeting | null>(null);
  const [showSchedule, setShowSchedule] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("meetings-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "meetings" }, async (payload) => {
        if (payload.eventType === "DELETE") {
          setMeetings((prev) => prev.filter((m) => m.id !== (payload.old as Meeting).id));
          return;
        }
        const id = (payload.new as Meeting).id;
        const { data } = await supabase
          .from("meetings")
          .select("*, attendees:meeting_attendees(id,meeting_id,contributor_id,rsvp_status,contributor:contributors(id,full_name,email,role_id,telegram_username,deleted_at,created_at))")
          .eq("id", id)
          .single();
        if (!data) return;
        const updated = data as unknown as Meeting;
        setMeetings((prev) => {
          const exists = prev.find((m) => m.id === updated.id);
          return exists
            ? prev.map((m) => (m.id === updated.id ? updated : m))
            : [...prev, updated];
        });
        setViewingMeeting((v) => (v?.id === updated.id ? updated : v));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleScheduled = useCallback((meeting: unknown) => {
    const m = meeting as Meeting;
    setMeetings((prev) => [...prev, m]);
    setShowSchedule(false);
  }, []);

  const handleUpdated = useCallback((meeting: Meeting) => {
    setMeetings((prev) => prev.map((m) => (m.id === meeting.id ? meeting : m)));
    setViewingMeeting(meeting);
  }, []);

  const handleCancel = useCallback(async (id: string) => {
    if (!confirm("Cancel this meeting? Attendees will be notified by email.")) return;
    setCancelling(id);
    const res = await fetch(`/api/meetings/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (json.ok) {
      setMeetings((prev) => prev.map((m) => m.id === id ? { ...m, status: "Cancelled" } : m));
      if (viewingMeeting?.id === id) setViewingMeeting((v) => v ? { ...v, status: "Cancelled" } : v);
    }
    setCancelling(null);
  }, [viewingMeeting]);

  const filtered = meetings.filter((m) => {
    if (typeFilter !== "All" && m.type !== typeFilter) return false;
    if (projectFilter !== "all" && m.project_id !== projectFilter) return false;
    return true;
  });

  const calendarMeetings = filtered.filter((m) => m.status !== "Cancelled");

  // Meetings for selected day panel
  const dayMeetings = selectedDay
    ? filtered.filter((m) => m.meeting_date === selectedDay)
    : [];

  // Upcoming list (today onwards, sorted)
  const today = new Date().toISOString().split("T")[0];
  const upcomingMeetings = filtered
    .filter((m) => m.meeting_date >= today)
    .sort((a, b) => a.meeting_date.localeCompare(b.meeting_date) || a.start_time.localeCompare(b.start_time));

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
    setSelectedDay(null);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
    setSelectedDay(null);
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meetings</h1>
          <p className="text-sm text-gray-500 mt-0.5">Schedule and manage team meetings</p>
        </div>
        <button
          onClick={() => setShowSchedule(true)}
          className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 flex items-center gap-2 self-start sm:self-auto"
        >
          <span>+</span> Schedule Meeting
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {/* View toggle */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          <button
            onClick={() => setView("calendar")}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${view === "calendar" ? "bg-brand-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
          >
            Calendar
          </button>
          <button
            onClick={() => setView("list")}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${view === "list" ? "bg-brand-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
          >
            List
          </button>
        </div>

        {/* Type filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-300"
        >
          <option value="All">All Types</option>
          <option value="Standup">Standup</option>
          <option value="Audit">Audit</option>
          <option value="Other">Other</option>
        </select>

        {/* Project filter */}
        {projects.length > 0 && (
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-300"
          >
            <option value="all">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Calendar view */}
      {view === "calendar" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            {/* Month nav */}
            <div className="flex items-center justify-between mb-4">
              <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
              </button>
              <h2 className="text-base font-semibold text-gray-800">
                {MONTH_NAMES[month]} {year}
              </h2>
              <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
              </button>
            </div>
            <CalendarGrid
              meetings={calendarMeetings}
              year={year}
              month={month}
              onDayClick={(date) => setSelectedDay(date === selectedDay ? null : date)}
              onMeetingClick={(m) => setViewingMeeting(m)}
            />
          </div>

          {/* Day panel */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            {selectedDay ? (
              <>
                <h3 className="text-sm font-semibold text-gray-800 mb-3">
                  {new Date(selectedDay + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                </h3>
                {dayMeetings.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-400">No meetings</p>
                    <button
                      onClick={() => setShowSchedule(true)}
                      className="mt-2 text-xs text-brand-600 hover:underline"
                    >
                      Schedule one
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {dayMeetings.map((m) => (
                      <MeetingCard
                        key={m.id}
                        meeting={m}
                        onView={() => setViewingMeeting(m)}
                        onCancel={handleCancel}
                        cancelling={cancelling === m.id}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center">
                <div className="w-10 h-10 bg-brand-50 rounded-full flex items-center justify-center mb-2">
                  <svg className="w-5 h-5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                </div>
                <p className="text-sm text-gray-500">Click a day to see meetings</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* List view */}
      {view === "list" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {upcomingMeetings.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-400 text-sm">No upcoming meetings</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Meeting</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Date & Time</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 hidden md:table-cell">Attendees</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 hidden lg:table-cell">Recurrence</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {upcomingMeetings.map((m) => {
                  const attendees = (m.attendees ?? []) as Array<{ contributor: Contributor }>;
                  return (
                    <tr key={m.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${TYPE_BADGE[m.type] ?? TYPE_BADGE.Other}`}>
                            {m.type}
                          </span>
                          <span className="font-medium text-gray-800 truncate max-w-[200px]">{m.title}</span>
                        </div>
                        {m.google_meet_link && (
                          <a
                            href={m.google_meet_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-brand-600 hover:underline ml-1 mt-0.5 inline-block"
                          >
                            Join Meet
                          </a>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        <div>{new Date(m.meeting_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                        <div className="text-xs text-gray-400">{m.start_time.slice(0, 5)} – {m.end_time.slice(0, 5)}</div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="flex -space-x-1.5">
                          {attendees.slice(0, 4).map((a, i) => {
                            const name = a.contributor?.full_name ?? a.contributor?.email ?? "?";
                            const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
                            return (
                              <div
                                key={i}
                                title={name}
                                className="w-6 h-6 rounded-full bg-brand-200 text-brand-700 text-[9px] font-bold flex items-center justify-center ring-2 ring-white"
                              >
                                {initials}
                              </div>
                            );
                          })}
                          {attendees.length > 4 && (
                            <div className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 text-[9px] font-bold flex items-center justify-center ring-2 ring-white">
                              +{attendees.length - 4}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs hidden lg:table-cell capitalize">
                        {m.recurrence}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${STATUS_BADGE[m.status] ?? STATUS_BADGE.Scheduled}`}>
                          {m.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => setViewingMeeting(m)}
                            className="px-2 py-1 text-xs text-brand-600 hover:bg-brand-50 rounded-lg"
                          >
                            View
                          </button>
                          {m.status !== "Cancelled" && (
                            <button
                              onClick={() => handleCancel(m.id)}
                              disabled={cancelling === m.id}
                              className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-40"
                            >
                              {cancelling === m.id ? "…" : "Cancel"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Modals */}
      {showSchedule && (
        <ScheduleMeetingModal
          contributors={contributors}
          projectId={projectFilter !== "all" ? projectFilter : undefined}
          onScheduled={handleScheduled}
          onClose={() => setShowSchedule(false)}
        />
      )}
      {viewingMeeting && (
        <MeetingDetailModal
          meeting={viewingMeeting}
          contributors={contributors}
          projects={projects}
          onUpdated={handleUpdated}
          onCancel={handleCancel}
          onClose={() => setViewingMeeting(null)}
        />
      )}
    </div>
  );
}

function MeetingCard({
  meeting: m,
  onView,
  onCancel,
  cancelling,
}: {
  meeting: Meeting;
  onView: () => void;
  onCancel: (id: string) => void;
  cancelling: boolean;
}) {
  return (
    <div className={`rounded-xl border p-3 ${m.status === "Cancelled" ? "opacity-50 bg-gray-50 border-gray-100" : "bg-white border-gray-100 hover:border-brand-200 cursor-pointer"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0" onClick={onView}>
          <div className="flex items-center gap-1.5 mb-1">
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${TYPE_BADGE[m.type] ?? TYPE_BADGE.Other}`}>
              {m.type}
            </span>
            {m.status === "Cancelled" && (
              <span className="text-[10px] text-red-500 font-medium">Cancelled</span>
            )}
          </div>
          <p className="text-sm font-medium text-gray-800 truncate">{m.title}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {m.start_time.slice(0, 5)} – {m.end_time.slice(0, 5)}
            {m.timezone !== "Asia/Manila" && ` (${m.timezone})`}
          </p>
          {m.google_meet_link && (
            <a
              href={m.google_meet_link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-brand-600 hover:underline"
            >
              Join Google Meet
            </a>
          )}
        </div>
        {m.status !== "Cancelled" && (
          <button
            onClick={() => onCancel(m.id)}
            disabled={cancelling}
            className="text-xs text-red-400 hover:text-red-600 disabled:opacity-40 shrink-0"
          >
            {cancelling ? "…" : "Cancel"}
          </button>
        )}
      </div>
    </div>
  );
}
