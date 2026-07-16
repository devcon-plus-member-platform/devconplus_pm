"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { createClient } from "@/lib/supabase";
import BugCard from "./BugCard";
import BugDetailPanel from "./BugDetailPanel";
import NewBugModal from "./NewBugModal";
import Toast from "@/components/ui/Toast";
import StatCard from "@/components/ui/StatCard";
import ProgressBar from "@/components/ui/ProgressBar";
import { BUG_STATUS_THEME, BUG_SEVERITY_THEME } from "@/lib/theme";
import type { Bug, BugStatus, BugSeverity, Contributor, Project } from "@/types";

const ALL = "All";

const STATUS_OPTIONS: (BugStatus | typeof ALL)[] = [
  ALL, "Open", "In Progress", "Resolved", "Closed", "Cannot Reproduce",
];
const SEVERITY_OPTIONS: (BugSeverity | typeof ALL)[] = [
  ALL, "Critical", "High", "Medium", "Low",
];

interface ToastState { message: string; type: "success" | "error" }

interface Props {
  initialBugs: Bug[];
  projects: Project[];
  contributors: Contributor[];
}

export default function BugsClient({ initialBugs, projects, contributors }: Props) {
  const supabase = useRef(createClient()).current;
  const [bugs, setBugs] = useState<Bug[]>(initialBugs);
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id ?? "");
  const [statusFilter, setStatusFilter] = useState<BugStatus | typeof ALL>(ALL);
  const [severityFilter, setSeverityFilter] = useState<BugSeverity | typeof ALL>(ALL);
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"All" | "From QA" | "Standalone">("All");
  const [search, setSearch] = useState("");
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("bugs-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "bugs" }, async (payload) => {
        if (payload.eventType === "DELETE") {
          setBugs((prev) => prev.filter((b) => b.id !== (payload.old as { id: string }).id));
          return;
        }
        // Re-fetch full row with joins on INSERT / UPDATE
        const { data } = await supabase
          .from("bugs")
          .select("*, reporter:contributors!reported_by(id,full_name,email,role_id,telegram_username,deleted_at,created_at), assignee:contributors!assigned_to(id,full_name,email,role_id,telegram_username,deleted_at,created_at)")
          .eq("id", (payload.new as { id: string }).id)
          .single();
        if (!data) return;
        const bug = data as Bug;
        if (payload.eventType === "INSERT") {
          // Deduplicate — handleCreated may have already added it optimistically
          setBugs((prev) => prev.some((b) => b.id === bug.id) ? prev.map((b) => b.id === bug.id ? bug : b) : [bug, ...prev]);
        } else {
          setBugs((prev) => prev.map((b) => (b.id === bug.id ? bug : b)));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleUpdate(id: string, updates: Partial<Bug>) {
    const { assignee: _a, reporter: _r, ...dbUpdates } = updates as Bug & { assignee?: unknown; reporter?: unknown };
    await supabase.from("bugs").update(dbUpdates).eq("id", id);
    setBugs((prev) => prev.map((b) => (b.id === id ? { ...b, ...updates } : b)));
  }

  function handleCreated(bug: Bug) {
    setBugs((prev) => [bug, ...prev]);
    setShowNew(false);
    setToast({ message: `Bug "${bug.title}" filed.`, type: "success" });
  }

  // Filtered view
  const projectBugs = selectedProjectId
    ? bugs.filter((b) => b.project_id === selectedProjectId)
    : bugs;

  const visible = projectBugs.filter((b) => {
    if (statusFilter !== ALL && b.status !== statusFilter) return false;
    if (severityFilter !== ALL && b.severity !== severityFilter) return false;
    if (assigneeFilter && b.assigned_to !== assigneeFilter) return false;
    if (sourceFilter === "From QA" && !b.qa_test_id) return false;
    if (sourceFilter === "Standalone" && b.qa_test_id) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!b.title.toLowerCase().includes(q) && !b.description.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const viewing = bugs.find((b) => b.id === viewingId);

  const stats = useMemo(() => {
    const open = projectBugs.filter((b) => b.status === "Open").length;
    const inProgress = projectBugs.filter((b) => b.status === "In Progress").length;
    const resolved = projectBugs.filter((b) => b.status === "Resolved").length;
    const critical = projectBugs.filter(
      (b) => b.severity === "Critical" && b.status !== "Resolved" && b.status !== "Closed"
    ).length;
    const total = projectBugs.length;
    const resolutionRate = total === 0 ? 0 : Math.round((resolved / total) * 100);
    return { open, inProgress, resolved, critical, resolutionRate };
  }, [projectBugs]);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0 gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-lg font-semibold text-gray-800">Bug Reports</h1>
          {projects.length > 1 && (
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400"
            >
              <option value="">All Projects</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
        </div>
        <button
          onClick={() => setShowNew(true)}
          disabled={!selectedProjectId}
          className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors disabled:opacity-40"
        >
          + Report a Bug
        </button>
      </div>

      {/* Stat strip */}
      {projectBugs.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 px-6 py-4 bg-surface border-b border-surface-border shrink-0">
          <StatCard label="Open" value={stats.open} accent={BUG_STATUS_THEME.Open.dot} />
          <StatCard label="In Progress" value={stats.inProgress} accent={BUG_STATUS_THEME["In Progress"].dot} />
          <StatCard label="Resolved" value={stats.resolved} accent={BUG_STATUS_THEME.Resolved.dot} />
          <StatCard label="Critical" value={stats.critical} accent={BUG_SEVERITY_THEME.Critical.dot} />
          <div className="bg-white border border-surface-border rounded-xl px-5 py-4 shadow-sm col-span-2 sm:col-span-1 flex flex-col justify-center">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs text-gray-400">Resolution Rate</p>
              <p className="text-xs font-semibold text-gray-700">{stats.resolutionRate}%</p>
            </div>
            <ProgressBar value={stats.resolutionRate} color={BUG_STATUS_THEME.Resolved.dot} />
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 px-6 py-3 border-b border-gray-100 flex-wrap shrink-0">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search bugs…"
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-300 w-44"
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as BugStatus | typeof ALL)} className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400">
          {STATUS_OPTIONS.map((s) => <option key={s}>{s === ALL ? "All Statuses" : s}</option>)}
        </select>
        <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value as BugSeverity | typeof ALL)} className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400">
          {SEVERITY_OPTIONS.map((s) => <option key={s}>{s === ALL ? "All Severities" : s}</option>)}
        </select>
        <select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400">
          <option value="">All Assignees</option>
          {contributors.map((c) => <option key={c.id} value={c.id}>{c.full_name ?? c.email}</option>)}
        </select>
        <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value as "All" | "From QA" | "Standalone")} className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400">
          <option>All</option>
          <option>From QA</option>
          <option>Standalone</option>
        </select>
        {(search || statusFilter !== ALL || severityFilter !== ALL || assigneeFilter || sourceFilter !== "All") && (
          <button
            onClick={() => { setSearch(""); setStatusFilter(ALL); setSeverityFilter(ALL); setAssigneeFilter(""); setSourceFilter("All"); }}
            className="text-xs text-brand-600 hover:underline"
          >
            Clear filters
          </button>
        )}
        <span className="ml-auto text-xs text-gray-400">{visible.length} bug{visible.length !== 1 ? "s" : ""}</span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 text-gray-400 gap-3">
            <span className="text-4xl">🐛</span>
            <p className="text-sm">{bugs.length === 0 ? "No bugs reported yet." : "No bugs match your filters."}</p>
            {selectedProjectId && bugs.length === 0 && (
              <button onClick={() => setShowNew(true)} className="text-brand-600 text-sm font-medium hover:underline">
                Report the first bug
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-5xl mx-auto">
            {visible.map((bug) => (
              <BugCard key={bug.id} bug={bug} onClick={() => setViewingId(bug.id)} />
            ))}
          </div>
        )}
      </div>

      {/* Detail panel */}
      {viewing && (
        <>
          <div className="fixed inset-0 bg-black/20 z-30" onClick={() => setViewingId(null)} />
          <BugDetailPanel
            bug={viewing}
            contributors={contributors}
            onUpdate={(updates) => handleUpdate(viewing.id, updates)}
            onClose={() => setViewingId(null)}
          />
        </>
      )}

      {/* New bug modal */}
      {showNew && selectedProjectId && (
        <NewBugModal
          projectId={selectedProjectId}
          contributors={contributors}
          onCreated={handleCreated}
          onClose={() => setShowNew(false)}
        />
      )}

      {toast && (
        <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
      )}
    </div>
  );
}
