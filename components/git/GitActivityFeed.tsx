"use client";

import type { GitHubEvent } from "@/types";

const ACTION_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  opened:           { label: "opened PR",       color: "text-green-700",  bg: "bg-green-50",  border: "border-l-green-400" },
  merged:           { label: "merged PR",       color: "text-purple-700", bg: "bg-purple-50", border: "border-l-purple-500" },
  closed:           { label: "closed PR",       color: "text-red-700",    bg: "bg-red-50",    border: "border-l-red-400" },
  reopened:         { label: "reopened PR",     color: "text-green-700",  bg: "bg-green-50",  border: "border-l-green-400" },
  review_requested: { label: "requested review", color: "text-yellow-700", bg: "bg-yellow-50", border: "border-l-yellow-400" },
  ready_for_review: { label: "marked ready",   color: "text-blue-700",   bg: "bg-blue-50",   border: "border-l-blue-400" },
  push:             { label: "pushed to",       color: "text-gray-600",   bg: "bg-gray-50",   border: "border-l-gray-300" },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

interface Props {
  events: GitHubEvent[];
}

export default function GitActivityFeed({ events }: Props) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
        <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
          <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.25} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 7.5v9m0-9A2.25 2.25 0 105.25 5.25 2.25 2.25 0 007.5 7.5zm0 9a2.25 2.25 0 102.25 2.25A2.25 2.25 0 007.5 16.5zm9-9A2.25 2.25 0 1018.75 5.25 2.25 2.25 0 0016.5 7.5zm0 0c0 3-2.25 4.5-4.5 5.25C9.75 13.5 7.5 15 7.5 16.5" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-600">No activity yet</p>
          <p className="text-xs text-gray-400 mt-1">Connect a repository and configure the webhook to see events here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {events.map(ev => {
        const key = ev.event_type === "push" ? "push" : (ev.action ?? "opened");
        const cfg = ACTION_CONFIG[key] ?? ACTION_CONFIG.push;

        return (
          <div
            key={ev.id}
            className={`bg-white rounded-xl border border-gray-100 shadow-sm border-l-4 ${cfg.border} p-4 hover:shadow-md transition-shadow`}
          >
            <div className="flex items-start gap-3">
              {/* Avatar */}
              {ev.author_avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={ev.author_avatar_url}
                  alt={ev.author_login ?? ""}
                  className="w-9 h-9 rounded-full ring-2 ring-gray-100 shrink-0 mt-0.5"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-500 shrink-0 mt-0.5">
                  {(ev.author_login ?? "?")[0].toUpperCase()}
                </div>
              )}

              {/* Body */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 text-sm">
                  <span className="font-semibold text-gray-900">{ev.author_login ?? "Unknown"}</span>
                  <span className={`font-medium text-xs ${cfg.color}`}>{cfg.label}</span>
                  {ev.pr_number && (
                    <span className="text-gray-400 font-mono text-xs">#{ev.pr_number}</span>
                  )}
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full font-mono">
                    {ev.repo_full_name}
                  </span>
                </div>

                {ev.pr_title && (
                  <p className="text-sm text-gray-800 mt-1 font-medium leading-snug line-clamp-2">{ev.pr_title}</p>
                )}

                {(ev.branch_from || ev.branch_to) && (
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-400 font-mono">
                    {ev.branch_from && (
                      <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600">{ev.branch_from}</span>
                    )}
                    {ev.branch_from && ev.branch_to && (
                      <svg className="w-3 h-3 text-gray-300" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                    )}
                    {ev.branch_to && (
                      <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600">{ev.branch_to}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Right side */}
              <div className="flex flex-col items-end gap-2 shrink-0">
                <span className="text-xs text-gray-400 whitespace-nowrap">{timeAgo(ev.created_at)}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.color}`}>
                  {key === "push" ? "Push" : cfg.label}
                </span>
                {ev.pr_url && (
                  <a
                    href={ev.pr_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-brand-600 hover:text-brand-700 font-medium hover:underline"
                    onClick={e => e.stopPropagation()}
                  >
                    View ↗
                  </a>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
