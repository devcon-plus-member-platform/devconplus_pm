"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useAuthStore } from "@/lib/store";
import { isAdmin } from "@/lib/permissions";
import { cn } from "@/lib/utils";

type NotifKind =
  | { kind: "assignment"; taskId: string; taskTitle: string; receivedAt: Date }
  | { kind: "activity"; action: string; entity: string; entityTitle: string; receivedAt: Date };

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const ACTION_COLOR: Record<string, string> = {
  created: "text-green-600",
  deleted: "text-red-500",
  moved: "text-purple-600",
  assigned: "text-blue-600",
};

export default function NotificationCenter() {
  const router = useRouter();
  const contributor = useAuthStore((s) => s.contributor);
  const [notifs, setNotifs] = useState<NotifKind[]>([]);
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabaseRef = useRef(createClient());

  const unseenCount = notifs.length - seen;

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const addActivity = useCallback(
    (action: string, entity: string, entityTitle: string) => {
      setNotifs((prev) => [
        { kind: "activity", action, entity, entityTitle, receivedAt: new Date() },
        ...prev.slice(0, 29),
      ]);
    },
    []
  );

  const addAssignment = useCallback((taskId: string, taskTitle: string) => {
    setNotifs((prev) => [
      { kind: "assignment", taskId, taskTitle, receivedAt: new Date() },
      ...prev.slice(0, 29),
    ]);
  }, []);

  // ── Admin: subscribe to ALL task changes across all projects ──────────────
  useEffect(() => {
    if (!isAdmin(contributor?.email)) return;
    const supabase = supabaseRef.current;

    const channel = supabase
      .channel(`admin-activity:${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "tasks" },
        (payload) => {
          const t = payload.new as { title: string };
          addActivity("created", "task", t.title);
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "tasks" },
        (payload) => {
          const t = payload.old as { title: string };
          addActivity("deleted", "task", t.title ?? "task");
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tasks" },
        (payload) => {
          const n = payload.new as { title: string; status: string; assignee_id: string | null; group_id: string };
          const o = payload.old as { title: string; status: string; assignee_id: string | null; group_id: string };
          if (n.group_id !== o.group_id) {
            addActivity("moved", "task", n.title);
          } else if (n.status !== o.status) {
            addActivity(`updated status of`, "task", n.title);
          } else if (n.assignee_id !== o.assignee_id) {
            addActivity("assigned", "task", n.title);
          } else if (n.title !== o.title) {
            addActivity("renamed", "task", n.title);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "groups" },
        (payload) => {
          const g = payload.new as { name: string };
          addActivity("created", "group", g.name);
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "groups" },
        (payload) => {
          const g = payload.old as { name: string };
          addActivity("deleted", "group", g.name ?? "group");
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [contributor?.email, addActivity]);

  // ── Non-admin contributor: subscribe to self-assignment changes ───────────
  useEffect(() => {
    if (isAdmin(contributor?.email) || !contributor?.id) return;
    const supabase = supabaseRef.current;

    const channel = supabase
      .channel(`assignments:${contributor.id}:${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tasks", filter: `assignee_id=eq.${contributor.id}` },
        (payload) => {
          const t = payload.new as { id: string; title: string };
          addAssignment(t.id, t.title);
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "tasks", filter: `assignee_id=eq.${contributor.id}` },
        (payload) => {
          const t = payload.new as { id: string; title: string };
          addAssignment(t.id, t.title);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [contributor?.id, contributor?.email, addAssignment]);

  function handleOpen() {
    setOpen((v) => !v);
    if (!open) setSeen(notifs.length);
  }

  function handleNotifClick(n: NotifKind) {
    setOpen(false);
    if (n.kind === "assignment") router.push(`/dashboard?task=${n.taskId}`);
    else router.push("/dashboard");
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
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unseenCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unseenCount > 9 ? "9+" : unseenCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              {isAdmin(contributor?.email) ? "Activity Feed" : "Notifications"}
            </p>
            {notifs.length > 0 && (
              <button
                onClick={() => { setNotifs([]); setSeen(0); }}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Clear all
              </button>
            )}
          </div>

          {notifs.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              No activity yet.
            </div>
          ) : (
            <ul className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
              {notifs.map((n, i) => (
                <li key={i}>
                  <button
                    onClick={() => handleNotifClick(n)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    {n.kind === "assignment" ? (
                      <>
                        <p className="text-xs text-gray-700 leading-snug">
                          You were assigned:{" "}
                          <span className="font-medium">{n.taskTitle}</span>
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-xs text-gray-700 leading-snug">
                          <span className={cn("font-semibold capitalize", ACTION_COLOR[n.action] ?? "text-gray-800")}>
                            {n.action}
                          </span>{" "}
                          {n.entity}:{" "}
                          <span className="font-medium">{n.entityTitle}</span>
                        </p>
                      </>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">{timeAgo(n.receivedAt)}</p>
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
