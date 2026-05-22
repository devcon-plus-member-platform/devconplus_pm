"use client";

import Link from "next/link";
import { useMemo } from "react";
import { isOverdue, formatDate } from "@/lib/utils";
import type { Task, Contributor } from "@/types";

interface Props {
  tasks: Task[];
  currentContributor: Contributor | null;
}

interface StatCardProps {
  label: string;
  value: number;
  accent?: string;
}

function StatCard({ label, value, accent = "text-gray-800" }: StatCardProps) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl px-5 py-4 shadow-sm">
      <p className={`text-2xl font-bold ${accent}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
    </div>
  );
}

export default function DashboardOverview({ tasks, currentContributor }: Props) {
  const stats = useMemo(() => {
    const total = tasks.length;
    const inProgress = tasks.filter((t) => t.status === "In Progress").length;
    const done = tasks.filter((t) => t.status === "Done").length;
    const overdue = tasks.filter(
      (t) => t.status !== "Done" && isOverdue(t.due_date)
    ).length;
    return { total, inProgress, done, overdue };
  }, [tasks]);

  const myTasksThisWeek = useMemo(() => {
    if (!currentContributor) return [];
    const now = new Date();
    const sevenDays = new Date();
    sevenDays.setDate(now.getDate() + 7);

    return tasks
      .filter((t) => {
        if (t.assignee_id !== currentContributor.id) return false;
        if (t.status === "Done") return false;
        if (!t.due_date) return false;
        const d = new Date(t.due_date);
        return d >= now && d <= sevenDays;
      })
      .sort((a, b) => {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      })
      .slice(0, 5);
  }, [tasks, currentContributor]);

  return (
    <div className="px-6 pt-5 pb-4 border-b border-gray-100 bg-gray-50/60">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <StatCard label="Total Tasks" value={stats.total} />
        <StatCard label="In Progress" value={stats.inProgress} accent="text-blue-600" />
        <StatCard label="Done" value={stats.done} accent="text-green-600" />
        <StatCard
          label="Overdue"
          value={stats.overdue}
          accent={stats.overdue > 0 ? "text-red-500" : "text-gray-800"}
        />
      </div>

      {/* My tasks this week */}
      {currentContributor && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            My tasks due this week
          </p>
          {myTasksThisWeek.length === 0 ? (
            <p className="text-xs text-gray-400">No tasks due in the next 7 days. 🎉</p>
          ) : (
            <ul className="space-y-1.5">
              {myTasksThisWeek.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center gap-2 text-xs"
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      isOverdue(t.due_date) ? "bg-red-400" : "bg-brand-400"
                    }`}
                  />
                  <span className="text-gray-700 font-medium truncate flex-1">
                    {t.title}
                  </span>
                  <span
                    className={`shrink-0 ${
                      isOverdue(t.due_date) ? "text-red-500 font-medium" : "text-gray-400"
                    }`}
                  >
                    Due {formatDate(t.due_date)}
                  </span>
                  <span className="text-gray-300 shrink-0">·</span>
                  <span className="text-gray-400 shrink-0">{t.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
