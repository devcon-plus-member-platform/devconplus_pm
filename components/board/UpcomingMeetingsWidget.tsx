"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { useAuthStore } from "@/lib/store";
import type { Meeting } from "@/types";

function formatMeetingTime(meeting: Meeting): string {
  const date = new Date(`${meeting.meeting_date}T${meeting.start_time}`);
  return date.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
  }) + " · " + meeting.start_time.slice(0, 5);
}

export default function UpcomingMeetingsWidget() {
  const supabase = createClient();
  const contributor = useAuthStore((s) => s.contributor);
  const [meetings, setMeetings] = useState<Meeting[]>([]);

  useEffect(() => {
    if (!contributor?.id) return;
    async function fetchMeetings() {
      const today = new Date().toISOString().split("T")[0];
      const sevenDays = new Date();
      sevenDays.setDate(sevenDays.getDate() + 7);
      const sevenDaysStr = sevenDays.toISOString().split("T")[0];

      // Get meeting IDs where this contributor is an attendee
      const { data: attendeeRows } = await supabase
        .from("meeting_attendees")
        .select("meeting_id")
        .eq("contributor_id", contributor!.id);

      if (!attendeeRows || attendeeRows.length === 0) return;

      const meetingIds = attendeeRows.map((a) => (a as { meeting_id: string }).meeting_id);

      const { data } = await supabase
        .from("meetings")
        .select("*")
        .in("id", meetingIds)
        .eq("status", "Scheduled")
        .gte("meeting_date", today)
        .lte("meeting_date", sevenDaysStr)
        .order("meeting_date", { ascending: true })
        .order("start_time", { ascending: true })
        .limit(3);

      setMeetings((data as Meeting[]) ?? []);
    }
    fetchMeetings();
  }, [contributor?.id, supabase]);

  if (meetings.length === 0) return null;

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Upcoming Meetings
        </p>
        <Link href="/meetings" className="text-xs text-brand-600 hover:underline">
          View all
        </Link>
      </div>
      <ul className="space-y-2">
        {meetings.map((m) => (
          <li key={m.id} className="flex items-center gap-3 text-xs">
            <span className={`px-2 py-0.5 rounded-full font-medium shrink-0 ${
              m.type === "Standup" ? "bg-blue-100 text-blue-700" :
              m.type === "Audit"   ? "bg-amber-100 text-amber-700" :
                                    "bg-gray-100 text-gray-600"
            }`}>
              {m.type}
            </span>
            <span className="text-gray-700 font-medium truncate flex-1">{m.title}</span>
            <span className="text-gray-400 shrink-0">{formatMeetingTime(m)}</span>
            {m.google_meet_link && (
              <a
                href={m.google_meet_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-600 hover:text-brand-700 shrink-0"
                title="Join Google Meet"
                onClick={(e) => e.stopPropagation()}
              >
                🎥
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
