"use client";

import { useMemo, useState } from "react";
import type { Meeting } from "@/types";

interface Props {
  meetings: Meeting[];
  year: number;
  month: number; // 0-indexed
  onDayClick: (date: string) => void;
  onMeetingClick: (meeting: Meeting) => void;
}

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const TYPE_COLORS = {
  Standup: "bg-blue-500",
  Audit:   "bg-amber-500",
  Other:   "bg-gray-400",
};

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function CalendarGrid({ meetings, year, month, onDayClick, onMeetingClick }: Props) {
  const today = new Date().toISOString().split("T")[0];

  const { days, startOffset } = useMemo(() => {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return { days: daysInMonth, startOffset: firstDay };
  }, [year, month]);

  // Group meetings by date
  const meetingsByDate = useMemo(() => {
    const map: Record<string, Meeting[]> = {};
    for (const m of meetings) {
      if (!map[m.meeting_date]) map[m.meeting_date] = [];
      map[m.meeting_date].push(m);
    }
    return map;
  }, [meetings]);

  const cells: (number | null)[] = [
    ...Array<null>(startOffset).fill(null),
    ...Array.from({ length: days }, (_, i) => i + 1),
  ];

  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="select-none">
      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS_OF_WEEK.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-gray-400 py-2">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar cells */}
      <div className="grid grid-cols-7 gap-px bg-gray-100 rounded-xl overflow-hidden border border-gray-100">
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="bg-white min-h-[80px]" />;
          }

          const dateStr = toDateStr(year, month, day);
          const dayMeetings = meetingsByDate[dateStr] ?? [];
          const isToday = dateStr === today;

          return (
            <div
              key={dateStr}
              className="bg-white min-h-[80px] p-1.5 cursor-pointer hover:bg-blue-50/40 transition-colors"
              onClick={() => onDayClick(dateStr)}
            >
              <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium mb-1 ${
                isToday ? "bg-brand-600 text-white" : "text-gray-700"
              }`}>
                {day}
              </div>
              <div className="space-y-0.5">
                {dayMeetings.slice(0, 3).map((m) => (
                  <button
                    key={m.id}
                    onClick={(e) => { e.stopPropagation(); onMeetingClick(m); }}
                    className={`w-full text-left px-1.5 py-0.5 rounded text-[10px] text-white font-medium truncate ${TYPE_COLORS[m.type]}`}
                    title={m.title}
                  >
                    {m.start_time.slice(0, 5)} {m.title}
                  </button>
                ))}
                {dayMeetings.length > 3 && (
                  <p className="text-[10px] text-gray-400 px-1">+{dayMeetings.length - 3} more</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
