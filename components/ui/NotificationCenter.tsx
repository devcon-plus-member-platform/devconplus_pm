"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useAuthStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface Notification {
  taskId: string;
  taskTitle: string;
  assignerName: string;
  receivedAt: Date;
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function NotificationCenter() {
  const router = useRouter();
  const contributor = useAuthStore((s) => s.contributor);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabaseRef = useRef(createClient());

  const unseenCount = notifications.length - seen;

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleNewAssignment = useCallback(
    (taskId: string, taskTitle: string) => {
      setNotifications((prev) => [
        {
          taskId,
          taskTitle,
          assignerName: "Someone",
          receivedAt: new Date(),
        },
        ...prev.slice(0, 19), // keep last 20
      ]);
    },
    []
  );

  // Subscribe to realtime task assignments for the logged-in contributor
  useEffect(() => {
    if (!contributor?.id) return;
    const supabase = supabaseRef.current;

    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tasks",
          filter: `assignee_id=eq.${contributor.id}`,
        },
        (payload) => {
          const newRow = payload.new as { id: string; title: string };
          handleNewAssignment(newRow.id, newRow.title);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "tasks",
          filter: `assignee_id=eq.${contributor.id}`,
        },
        (payload) => {
          const newRow = payload.new as { id: string; title: string };
          handleNewAssignment(newRow.id, newRow.title);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [contributor?.id, handleNewAssignment]);

  function handleOpen() {
    setOpen((v) => !v);
    if (!open) setSeen(notifications.length);
  }

  function handleNotificationClick(taskId: string) {
    setOpen(false);
    router.push(`/dashboard?task=${taskId}`);
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleOpen}
        className={cn(
          "relative p-2 rounded-lg transition-colors",
          open ? "bg-brand-800 text-white" : "text-brand-300 hover:bg-brand-800 hover:text-white"
        )}
        title="Notifications"
        aria-label="Notifications"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unseenCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unseenCount > 9 ? "9+" : unseenCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Notifications
            </p>
          </div>

          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              No notifications yet.
            </div>
          ) : (
            <ul className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
              {notifications.map((n, i) => (
                <li key={`${n.taskId}-${i}`}>
                  <button
                    onClick={() => handleNotificationClick(n.taskId)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <p className="text-xs text-gray-700 leading-snug">
                      You were assigned:{" "}
                      <span className="font-medium">{n.taskTitle}</span>
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {timeAgo(n.receivedAt)}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
