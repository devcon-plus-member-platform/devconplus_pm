"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { MyTask } from "@/app/(authenticated)/my-tasks/page";

const STATUS_COLORS: Record<string, string> = {
  "Not Started":      "bg-gray-100 text-gray-600",
  "In Progress":      "bg-blue-100 text-blue-700",
  "Review":           "bg-orange-100 text-orange-700",
  "Done":             "bg-green-100 text-green-700",
  "Help":             "bg-yellow-100 text-yellow-700",
  "I am Stuck":       "bg-red-100 text-red-700",
  "For Improvements": "bg-purple-100 text-purple-700",
};

interface Props {
  tasks: MyTask[];
  contributorName: string | null;
}

function today() {
  return new Date().toISOString().split("T")[0];
}

function offsetDate(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function formatDate(date: string) {
  return new Date(date + "T00:00:00").toLocaleDateString("en-PH", {
    month: "short", day: "numeric", year: "numeric",
  });
}

export default function MyTasksClient({ tasks, contributorName }: Props) {
  if (!contributorName) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center gap-4 p-6">
        <div className="w-14 h-14 rounded-full bg-brand-50 flex items-center justify-center">
          <svg className="w-7 h-7 text-brand-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
        </div>
        <div>
          <p className="text-base font-semibold text-gray-800">Sign in to see your tasks</p>
          <p className="text-sm text-gray-400 mt-1">Your assigned tasks appear here once you&apos;re signed in.</p>
        </div>
        <Link
          href="/login"
          className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
        >
          Sign in
        </Link>
      </div>
    );
  }

  const todayStr = today();
  const _tomorrowStr = offsetDate(1);
  const in3DaysStr = offsetDate(3);

  const overdue: MyTask[] = [];
  const dueToday: MyTask[] = [];
  const dueSoon: MyTask[] = []; // 1–3 days
  const upcoming: MyTask[] = []; // 4+ days
  const noDueDate: MyTask[] = [];

  for (const task of tasks) {
    if (task.status === "Done") continue; // exclude completed
    if (!task.due_date) { noDueDate.push(task); continue; }
    if (task.due_date < todayStr)   { overdue.push(task); continue; }
    if (task.due_date === todayStr) { dueToday.push(task); continue; }
    if (task.due_date <= in3DaysStr){ dueSoon.push(task); continue; }
    upcoming.push(task);
  }

  const doneTasks = tasks.filter((t) => t.status === "Done");

  const sections = [
    { label: "Overdue", tasks: overdue,   color: "text-red-600",    dot: "bg-red-500",    empty: false },
    { label: "Due Today", tasks: dueToday, color: "text-orange-600", dot: "bg-orange-400", empty: false },
    { label: "Due in 1–3 Days", tasks: dueSoon, color: "text-yellow-700", dot: "bg-yellow-400", empty: false },
    { label: "Upcoming", tasks: upcoming,  color: "text-blue-700",   dot: "bg-blue-400",   empty: false },
    { label: "No Due Date", tasks: noDueDate, color: "text-gray-500", dot: "bg-gray-300",  empty: false },
    { label: "Done", tasks: doneTasks,    color: "text-green-700",  dot: "bg-green-400",  empty: false },
  ].filter((s) => s.tasks.length > 0);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-gray-800">{contributorName}&apos;s Tasks</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {tasks.filter((t) => t.status !== "Done").length} active · {doneTasks.length} done
          </p>
        </div>
        <Link
          href="/dashboard"
          className="text-sm text-brand-600 hover:underline font-medium"
        >
          Go to Board
        </Link>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
        {sections.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-medium">No tasks assigned to you yet.</p>
          </div>
        ) : (
          sections.map((section) => (
            <div key={section.label}>
              <div className="flex items-center gap-2 mb-2">
                <span className={cn("w-2 h-2 rounded-full shrink-0", section.dot)} />
                <h2 className={cn("text-xs font-semibold uppercase tracking-wide", section.color)}>
                  {section.label}
                </h2>
                <span className="text-xs text-gray-400">({section.tasks.length})</span>
              </div>

              <div className="space-y-2">
                {section.tasks.map((task) => {
                  const isOverdue = task.due_date && task.due_date < todayStr && task.status !== "Done";
                  const isDueToday = task.due_date === todayStr;
                  const isDueSoon = task.due_date && task.due_date > todayStr && task.due_date <= in3DaysStr;

                  return (
                    <div
                      key={task.id}
                      className="flex items-start gap-3 bg-white border border-gray-100 rounded-xl px-4 py-3 hover:border-brand-200 hover:shadow-sm transition-all"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{task.title}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {task.project && (
                            <span className="text-xs text-gray-400 truncate max-w-[160px]">
                              📁 {task.project.name}
                            </span>
                          )}
                          {task.group && (
                            <span className="text-xs text-gray-400 truncate max-w-[120px]">
                              · {task.group.name}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                        <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full", STATUS_COLORS[task.status] ?? "bg-gray-100 text-gray-600")}>
                          {task.status}
                        </span>
                        {task.due_date && (
                          <span className={cn(
                            "text-[11px] font-medium px-2 py-0.5 rounded-full",
                            isOverdue  ? "bg-red-50 text-red-600" :
                            isDueToday ? "bg-orange-50 text-orange-600" :
                            isDueSoon  ? "bg-yellow-50 text-yellow-700" :
                            "bg-gray-50 text-gray-500"
                          )}>
                            {isOverdue ? "Overdue · " : isDueToday ? "Today · " : ""}{formatDate(task.due_date)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
