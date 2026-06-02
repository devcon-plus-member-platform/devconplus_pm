"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase";
import GitActivityFeed from "./GitActivityFeed";
import GitConnectionPanel from "./GitConnectionPanel";
import type { GitHubConnection, GitHubEvent, Project } from "@/types";

interface Props {
  initialEvents: GitHubEvent[];
  initialConnections: GitHubConnection[];
  projects: Project[];
}

type Tab = "activity" | "connections";

export default function GitClient({ initialEvents, initialConnections, projects }: Props) {
  const supabase = createClient();
  const [events, setEvents] = useState<GitHubEvent[]>(initialEvents);
  const [connections, setConnections] = useState<GitHubConnection[]>(initialConnections);
  const [tab, setTab] = useState<Tab>("activity");
  const [showPanel, setShowPanel] = useState(false);
  const [search, setSearch] = useState("");
  const [filterRepo, setFilterRepo] = useState("");

  // Realtime: new events pushed via webhook
  useEffect(() => {
    const channel = supabase
      .channel("git_events_realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "github_events" },
        payload => {
          setEvents(prev => [payload.new as GitHubEvent, ...prev]);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredEvents = events.filter(ev => {
    if (filterRepo && ev.repo_full_name !== filterRepo) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (ev.pr_title ?? "").toLowerCase().includes(q) ||
        (ev.author_login ?? "").toLowerCase().includes(q) ||
        ev.repo_full_name.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const uniqueRepos = Array.from(new Set(events.map(e => e.repo_full_name)));

  async function handleAddConnection(repoFullName: string, projectId: string | null, secret: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = supabase as any;
    const { data } = await sb
      .from("github_connections")
      .insert({ repo_full_name: repoFullName, project_id: projectId, webhook_secret: secret })
      .select("*, project:projects!project_id(id,name)")
      .single();
    if (data) setConnections(prev => [...prev, data as GitHubConnection]);
  }

  async function handleDeleteConnection(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("github_connections").delete().eq("id", id);
    setConnections(prev => prev.filter(c => c.id !== id));
  }

  return (
    <div className="flex flex-col h-full bg-gray-50/50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 shrink-0">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-700" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
              </svg>
              Git Activity
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Pull request and push events from connected repositories
            </p>
          </div>
          <button
            onClick={() => setShowPanel(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 transition-colors shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
            </svg>
            Manage Repos
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-100">
          {(["activity", "connections"] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize -mb-px ${
                tab === t
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t}
              {t === "activity" && events.length > 0 && (
                <span className="ml-2 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                  {events.length}
                </span>
              )}
              {t === "connections" && connections.length > 0 && (
                <span className="ml-2 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                  {connections.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5">

        {/* Activity tab */}
        {tab === "activity" && (
          <>
            {events.length > 0 && (
              <div className="flex flex-wrap gap-3 mb-5">
                <div className="relative flex-1 min-w-[200px]">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search by title, author, or repo..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-300"
                  />
                </div>
                {uniqueRepos.length > 1 && (
                  <select
                    value={filterRepo}
                    onChange={e => setFilterRepo(e.target.value)}
                    className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-300"
                  >
                    <option value="">All repos</option>
                    {uniqueRepos.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                )}
              </div>
            )}
            <GitActivityFeed events={filteredEvents} />
          </>
        )}

        {/* Connections tab */}
        {tab === "connections" && (
          <div className="space-y-4">
            {connections.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.25} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700">No repositories connected</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Click &ldquo;Manage Repos&rdquo; to connect your first GitHub repository
                  </p>
                </div>
                <button
                  onClick={() => setShowPanel(true)}
                  className="px-5 py-2.5 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 transition-colors"
                >
                  Connect Repository
                </button>
              </div>
            ) : (
              connections.map(conn => (
                <div key={conn.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center shrink-0">
                        <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 font-mono">{conn.repo_full_name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {conn.project ? `Linked to ${conn.project.name}` : "No project linked"}
                          {" · "}Connected {new Date(conn.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs bg-green-50 text-green-700 px-2.5 py-1 rounded-full font-medium shrink-0">
                      Active
                    </span>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-50 flex items-center gap-4 text-xs text-gray-400">
                    <span>
                      {events.filter(e => e.repo_full_name === conn.repo_full_name).length} events tracked
                    </span>
                    <button
                      onClick={() => setShowPanel(true)}
                      className="text-brand-600 hover:text-brand-700 font-medium"
                    >
                      View credentials
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Connection slide panel */}
      {showPanel && (
        <GitConnectionPanel
          connections={connections}
          projects={projects}
          onAdd={handleAddConnection}
          onDelete={handleDeleteConnection}
          onClose={() => setShowPanel(false)}
        />
      )}
    </div>
  );
}
