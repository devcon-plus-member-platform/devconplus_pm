"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import { useAuthStore } from "@/lib/store";
import MilestoneCard from "./MilestoneCard";
import NewMilestoneModal from "./NewMilestoneModal";
import LogProgressModal from "./LogProgressModal";
import ProgressHistoryModal from "./ProgressHistoryModal";
import { displayProgress } from "./milestone-utils";
import { MILESTONE_SELECT, mapMilestoneRow } from "@/lib/milestones";
import type { Milestone, MilestoneStatus, MilestoneProgress, Contributor, Project, Group } from "@/types";

const STATUS_FILTERS: Array<MilestoneStatus | "All"> = ["All", "Not Started", "In Progress", "At Risk", "Achieved", "Missed"];
type SortKey = "date" | "status" | "progress";

interface Props {
  initialMilestones: Milestone[];
  contributors: Contributor[];
  projects: Project[];
  activeGroups: Group[];
}

export default function MilestonesClient({ initialMilestones, contributors: _contributors, projects, activeGroups }: Props) {
  const [milestones, setMilestones] = useState<Milestone[]>(initialMilestones);
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<MilestoneStatus | "All">("All");
  const [sortBy, setSortBy] = useState<SortKey>("date");
  const [showNew, setShowNew] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [loggingProgress, setLoggingProgress] = useState<Milestone | null>(null);
  const [viewingHistory, setViewingHistory] = useState<Milestone | null>(null);

  const contributor = useAuthStore((s) => s.contributor);

  // Realtime
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("milestones-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "milestones" }, async (payload) => {
        const id = ((payload.new ?? payload.old) as Milestone).id;
        if (payload.eventType === "DELETE") {
          setMilestones((prev) => prev.filter((m) => m.id !== id));
          return;
        }
        const { data } = await supabase
          .from("milestones")
          .select(MILESTONE_SELECT)
          .eq("id", id)
          .single();
        if (!data) return;
        const updated = mapMilestoneRow(data as Record<string, unknown>);
        setMilestones((prev) => {
          const exists = prev.find((m) => m.id === updated.id);
          return exists ? prev.map((m) => m.id === updated.id ? updated : m) : [...prev, updated];
        });
        setLoggingProgress((v) => v?.id === updated.id ? updated : v);
        setViewingHistory((v) => v?.id === updated.id ? updated : v);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "milestone_progress" }, async (payload) => {
        const milestoneId = (payload.new as MilestoneProgress).milestone_id;
        const { data } = await supabase
          .from("milestones")
          .select(MILESTONE_SELECT)
          .eq("id", milestoneId)
          .single();
        if (!data) return;
        const updated = mapMilestoneRow(data as Record<string, unknown>);
        setMilestones((prev) => prev.map((m) => m.id === updated.id ? updated : m));
        setViewingHistory((v) => v?.id === updated.id ? updated : v);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleCreated = useCallback((milestone: Milestone) => {
    setMilestones((prev) => [...prev, { ...milestone, progress: [] }]);
    setShowNew(false);
  }, []);

  const handleEdited = useCallback((updated: Milestone) => {
    setMilestones((prev) => prev.map((m) => m.id === updated.id ? { ...updated, progress: m.progress } : m));
    setEditingMilestone(null);
  }, []);

  const handleDeleted = useCallback((id: string) => {
    fetch(`/api/milestones/${id}`, { method: "DELETE" });
    setMilestones((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const handleLogged = useCallback((progress: MilestoneProgress, updatedMilestone: Milestone | null) => {
    setMilestones((prev) =>
      prev.map((m) => {
        if (m.id !== progress.milestone_id) return m;
        const base = updatedMilestone ?? m;
        return { ...base, progress: [...(m.progress ?? []), progress] };
      })
    );
    setLoggingProgress(null);
  }, []);

  // Filter + sort
  const filtered = milestones
    .filter((m) => {
      if (projectFilter !== "all" && m.project_id !== projectFilter) return false;
      if (statusFilter !== "All" && m.status !== statusFilter) return false;
      return true;
    })
    .sort((a, b) => {
      // At Risk and Missed always first when sorting by date
      const urgency = (m: Milestone) => (m.status === "At Risk" ? 0 : m.status === "Missed" ? 1 : 2);
      if (sortBy === "date") {
        const ua = urgency(a), ub = urgency(b);
        if (ua !== ub) return ua - ub;
        return a.target_date.localeCompare(b.target_date);
      }
      if (sortBy === "status") {
        const order: Record<MilestoneStatus, number> = { "At Risk": 0, "Missed": 1, "In Progress": 2, "Not Started": 3, "Achieved": 4 };
        return (order[a.status as MilestoneStatus] ?? 5) - (order[b.status as MilestoneStatus] ?? 5);
      }
      // sortBy === "progress"
      return displayProgress(b) - displayProgress(a);
    });

  const activeMilestones = filtered.filter((m) => m.status !== "Achieved" && m.status !== "Missed");
  const completedMilestones = filtered.filter((m) => m.status === "Achieved" || m.status === "Missed");

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Milestones</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track project milestones and daily progress</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 flex items-center gap-2 self-start sm:self-auto"
        >
          <span>+</span> New Milestone
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {projects.length > 0 && (
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-300"
          >
            <option value="all">All Projects</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}

        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === s ? "bg-brand-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortKey)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-300"
        >
          <option value="date">Sort by Target Date</option>
          <option value="status">Sort by Status</option>
          <option value="progress">Sort by Progress</option>
        </select>
      </div>

      {/* Active milestones grid */}
      {activeMilestones.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeMilestones.map((m) => (
            <MilestoneCard
              key={m.id}
              milestone={m}
              onLogProgress={(m) => setLoggingProgress(m)}
              onViewHistory={(m) => setViewingHistory(m)}
              onEdit={(m) => setEditingMilestone(m)}
              onDelete={handleDeleted}
            />
          ))}
        </div>
      )}

      {/* Completed/Missed */}
      {completedMilestones.length > 0 && (
        <>
          <h2 className="text-sm font-semibold text-gray-500 mt-2">Completed & Missed</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {completedMilestones.map((m) => (
              <MilestoneCard
                key={m.id}
                milestone={m}
                onLogProgress={(m) => setLoggingProgress(m)}
                onViewHistory={(m) => setViewingHistory(m)}
                onEdit={(m) => setEditingMilestone(m)}
                onDelete={handleDeleted}
              />
            ))}
          </div>
        </>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400 text-sm">
          No milestones found.
          <button onClick={() => setShowNew(true)} className="ml-2 text-brand-600 hover:underline">Create one</button>
        </div>
      )}

      {/* Modals */}
      {showNew && (
        <NewMilestoneModal
          projectId={projectFilter !== "all" ? projectFilter : undefined}
          contributorId={contributor?.id}
          projects={projects}
          activeGroups={activeGroups}
          onSaved={handleCreated}
          onClose={() => setShowNew(false)}
        />
      )}
      {editingMilestone && (
        <NewMilestoneModal
          milestone={editingMilestone}
          projects={projects}
          activeGroups={activeGroups}
          onSaved={handleEdited}
          onClose={() => setEditingMilestone(null)}
        />
      )}
      {loggingProgress && (
        <LogProgressModal
          milestone={loggingProgress}
          contributorId={contributor?.id}
          onLogged={handleLogged}
          onClose={() => setLoggingProgress(null)}
        />
      )}
      {viewingHistory && (
        <ProgressHistoryModal
          milestone={viewingHistory}
          onClose={() => setViewingHistory(null)}
        />
      )}
    </div>
  );
}
