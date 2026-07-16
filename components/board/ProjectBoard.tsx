"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { SortableContext, verticalListSortingStrategy, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { useBoardContext } from "./BoardContext";
import GroupSection from "./GroupSection";
import GroupOrderChip from "./GroupOrderChip";
import KanbanBoard from "./KanbanBoard";
import { ProjectStatusBadge } from "@/components/ui/Badge";
import StatCard from "@/components/ui/StatCard";
import ProgressBar from "@/components/ui/ProgressBar";
import AvatarStack from "@/components/ui/AvatarStack";
import { taskStatusProgress } from "@/components/milestones/milestone-utils-client";
import { TASK_PRIORITY_THEME } from "@/lib/theme";
import { isOverdue, cn } from "@/lib/utils";
import type { Project, Task, TaskPriority } from "@/types";

type BoardView = "board" | "table";

const PRIORITY_OPTIONS: TaskPriority[] = ["Low", "Medium", "High", "Critical"];

interface Props {
  project: Project;
  loading: boolean;
  loadError?: boolean;
  onRetry?: () => void;
}

export default function ProjectBoard({ project, loading, loadError, onRetry }: Props) {
  const { groups, tasksByGroup, contributors, addGroup, addTask, canEdit, updateProject, updateProjectStatus } = useBoardContext();
  const [newGroupName, setNewGroupName] = useState("");
  const [addingGroup, setAddingGroup] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(project.name);
  const [view, setView] = useState<BoardView>("board");
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<Set<TaskPriority>>(new Set());
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!filterOpen) return;
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [filterOpen]);

  const allTasks = useMemo(
    () => groups.flatMap((g) => tasksByGroup[g.id] ?? []),
    [groups, tasksByGroup]
  );

  const taskFilter = useMemo(() => {
    return (t: Task) => {
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (priorityFilter.size > 0 && !priorityFilter.has(t.priority ?? "Medium")) return false;
      return true;
    };
  }, [search, priorityFilter]);

  const stats = useMemo(() => {
    const total = allTasks.length;
    const inProgress = allTasks.filter((t) => t.status === "In Progress").length;
    const done = allTasks.filter((t) => t.status === "Done").length;
    const overdue = allTasks.filter((t) => t.status !== "Done" && isOverdue(t.due_date)).length;
    const sprintProgress = total === 0
      ? 0
      : Math.round(allTasks.reduce((sum, t) => sum + taskStatusProgress(t.status), 0) / total);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDays = new Date(today);
    sevenDays.setDate(today.getDate() + 7);
    const dueThisWeek = allTasks.filter((t) => {
      if (!t.due_date || t.status === "Done") return false;
      const d = new Date(t.due_date);
      d.setHours(0, 0, 0, 0);
      return d >= today && d <= sevenDays;
    }).length;
    return { total, inProgress, done, overdue, sprintProgress, dueThisWeek };
  }, [allTasks]);

  const assigneeAvatars = useMemo(() => {
    const seen = new Map<string, { id: string; label: string; color?: string }>();
    for (const t of allTasks) {
      const ids = t.assignee_ids?.length ? t.assignee_ids : t.assignee_id ? [t.assignee_id] : [];
      for (const id of ids) {
        if (seen.has(id)) continue;
        const c = contributors.find((c) => c.id === id);
        if (c) seen.set(id, { id: c.id, label: c.full_name ?? c.email, color: c.role?.color });
      }
    }
    return Array.from(seen.values());
  }, [allTasks, contributors]);

  useEffect(() => {
    setNameVal(project.name);
  }, [project.name]);

  function handleNameBlur() {
    setEditingName(false);
    if (nameVal.trim() && nameVal.trim() !== project.name) {
      updateProject(project.id, nameVal.trim());
    } else {
      setNameVal(project.name);
    }
  }

  async function handleAddGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    await addGroup(newGroupName.trim());
    setNewGroupName("");
    setAddingGroup(false);
  }

  function handleNewTask() {
    if (!canEdit || groups.length === 0) return;
    addTask(groups[0].id);
  }

  function togglePriorityFilter(p: TaskPriority) {
    setPriorityFilter((prev) => {
      const next = new Set(prev);
      if (next.has(p)) next.delete(p);
      else next.add(p);
      return next;
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-2.5 text-gray-400 text-sm">
          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading board…
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
        <svg className="w-8 h-8 text-red-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
        <p className="text-sm font-medium text-gray-500">Failed to load board data</p>
        <p className="text-xs text-gray-400">Check your connection or Supabase project status.</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-1 px-4 py-2 text-sm font-medium text-brand-600 border border-brand-200 hover:bg-brand-50 rounded-lg transition-colors"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Board header */}
      <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-gray-200 bg-white shrink-0 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {editingName ? (
              <input
                autoFocus
                value={nameVal}
                onChange={(e) => setNameVal(e.target.value)}
                onBlur={handleNameBlur}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleNameBlur();
                  if (e.key === "Escape") {
                    setNameVal(project.name);
                    setEditingName(false);
                  }
                }}
                className="text-xl font-bold text-gray-900 leading-tight bg-white border border-brand-300 rounded-md px-2 py-0.5 -ml-2 focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400 transition-shadow"
              />
            ) : (
              <button
                onClick={() => canEdit && setEditingName(true)}
                className="text-xl font-bold text-gray-900 leading-tight truncate text-left hover:opacity-75 transition-opacity"
                title={canEdit ? "Click to rename" : undefined}
              >
                {project.name}
              </button>
            )}
            <button
              onClick={() =>
                canEdit &&
                updateProjectStatus(project.id, project.status === "Active" ? "Inactive" : "Active")
              }
              disabled={!canEdit}
              title={canEdit ? "Click to toggle Active/Inactive" : undefined}
              className={canEdit ? "hover:opacity-75 transition-opacity shrink-0" : "shrink-0"}
            >
              <ProjectStatusBadge status={project.status} />
            </button>
          </div>
          {project.description && (
            <p className="text-sm text-gray-400 mt-0.5 truncate">{project.description}</p>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks…"
              className="text-sm pl-9 pr-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-300 focus:bg-white transition-all w-52 placeholder-gray-400"
            />
          </div>
          <AvatarStack items={assigneeAvatars} max={3} />
          <button
            onClick={handleNewTask}
            disabled={!canEdit || groups.length === 0}
            title={groups.length === 0 ? "Create a group first" : undefined}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-40 shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Task
          </button>
        </div>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 px-6 py-4 bg-surface border-b border-surface-border shrink-0">
        <StatCard label="Total Tasks" value={stats.total} accent="#3b5ee8" />
        <StatCard label="In Progress" value={stats.inProgress} accent="#3b5ee8" />
        <StatCard label="Done" value={stats.done} accent="#10b981" />
        <StatCard label="Overdue" value={stats.overdue} accent={stats.overdue > 0 ? "#ef4444" : "#1f2937"} />
        <div className="bg-white border border-surface-border rounded-xl px-5 py-4 shadow-sm col-span-2 sm:col-span-1 flex flex-col justify-center">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs text-gray-400">Sprint Progress</p>
            <p className="text-xs font-semibold text-gray-700">{stats.sprintProgress}%</p>
          </div>
          <ProgressBar value={stats.sprintProgress} color="#3b5ee8" />
          <p className="text-[11px] text-gray-400 mt-1.5">
            {stats.done} of {stats.total} tasks complete · {stats.dueThisWeek} due this week
          </p>
        </div>
      </div>

      {/* Toggle row */}
      <div className="flex items-center justify-between gap-2 px-6 py-3 border-b border-gray-100 bg-white shrink-0 flex-wrap">
        {/* Board / Table toggle */}
        <div className="flex items-center rounded-lg border border-surface-border p-0.5 bg-gray-50">
          <button
            onClick={() => setView("board")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150",
              view === "board" ? "bg-white text-brand-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            </svg>
            Board
          </button>
          <button
            onClick={() => setView("table")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150",
              view === "table" ? "bg-white text-brand-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
            </svg>
            Table
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* Priority filter */}
          <div className="relative" ref={filterRef}>
            <button
              onClick={() => setFilterOpen((v) => !v)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors",
                priorityFilter.size > 0
                  ? "border-brand-300 bg-brand-50 text-brand-700"
                  : "border-surface-border text-gray-600 hover:bg-gray-50"
              )}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
              </svg>
              Filter{priorityFilter.size > 0 ? ` (${priorityFilter.size})` : ""}
            </button>
            {filterOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-44 bg-white border border-gray-200 rounded-xl shadow-xl py-1.5 z-20">
                <p className="px-3 pt-1 pb-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Priority</p>
                {PRIORITY_OPTIONS.map((p) => (
                  <button
                    key={p}
                    onClick={() => togglePriorityFilter(p)}
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-gray-50 text-sm text-gray-700"
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: TASK_PRIORITY_THEME[p].dot }} />
                    <span className="flex-1 text-left">{p}</span>
                    {priorityFilter.has(p) && (
                      <svg className="w-3.5 h-3.5 text-brand-500 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    )}
                  </button>
                ))}
                {priorityFilter.size > 0 && (
                  <button
                    onClick={() => setPriorityFilter(new Set())}
                    className="w-full text-left px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-50 border-t border-gray-100 mt-1"
                  >
                    Clear filter
                  </button>
                )}
              </div>
            )}
          </div>

          {view === "board" ? (
            <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-surface-border text-gray-500">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h14.25M3 9h9.75M3 13.5h9.75m-9.75 4.5h5.25m8.25-9v10.5m0 0l-3.75-3.75M18 19.5l3.75-3.75" />
              </svg>
              Group: Status
            </span>
          ) : (
            canEdit && (
              <button
                onClick={() => setAddingGroup(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-brand-600 hover:text-brand-700 hover:bg-brand-50 border border-brand-200 hover:border-brand-300 rounded-lg transition-all duration-150 font-medium group/btn"
              >
                <svg className="w-3.5 h-3.5 transition-transform duration-150 group-hover/btn:scale-110" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add Group
              </button>
            )
          )}
        </div>
      </div>

      {/* Scrollable board area */}
      {view === "board" ? (
        <div className="flex-1 overflow-hidden flex flex-col px-6 py-5 gap-3">
          {groups.length > 1 && (
            <div className="flex items-center gap-2 shrink-0 overflow-x-auto pb-1 scrollbar-thin">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide shrink-0 mr-0.5">
                Groups
              </span>
              <SortableContext items={groups.map((g) => g.id)} strategy={horizontalListSortingStrategy}>
                {groups.map((g, idx) => (
                  <GroupOrderChip
                    key={g.id}
                    group={g}
                    colorIdx={idx}
                    count={(tasksByGroup[g.id] ?? []).length}
                    canEdit={canEdit}
                  />
                ))}
              </SortableContext>
            </div>
          )}
          <div className="flex-1 overflow-hidden">
            <KanbanBoard taskFilter={taskFilter} />
          </div>
        </div>
      ) : (
      <div className="flex-1 overflow-y-auto overflow-x-auto px-6 py-5 space-y-4">
        <SortableContext
          items={groups.map((g) => g.id)}
          strategy={verticalListSortingStrategy}
        >
          {groups.map((group, idx) => (
            <GroupSection key={group.id} group={group} colorIdx={idx} taskFilter={taskFilter} />
          ))}
        </SortableContext>

        {groups.length === 0 && !addingGroup && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-600 mb-1">No groups yet</p>
            <p className="text-xs text-gray-400 mb-4">Groups organize tasks by sprint, feature, or phase.</p>
            {canEdit && (
              <button
                onClick={() => setAddingGroup(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm text-brand-600 hover:text-brand-700 border border-brand-200 hover:border-brand-300 hover:bg-brand-50 rounded-lg font-medium transition-all duration-150"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add your first group
              </button>
            )}
          </div>
        )}

        {/* Inline new-group form */}
        {addingGroup && (
          <form
            onSubmit={handleAddGroup}
            className="flex items-center gap-2 bg-white border border-brand-200 rounded-xl px-4 py-3 shadow-sm"
          >
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
            </svg>
            <input
              autoFocus
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Group name (e.g. Batch 1, Sprint 2)…"
              className="flex-1 text-sm bg-transparent focus:outline-none placeholder-gray-400 text-gray-800"
            />
            <button
              type="submit"
              disabled={!newGroupName.trim()}
              className="px-3 py-1.5 text-sm bg-brand-600 hover:bg-brand-700 text-white rounded-lg disabled:opacity-40 transition-colors font-medium"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setAddingGroup(false);
                setNewGroupName("");
              }}
              className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </form>
        )}
      </div>
      )}
    </div>
  );
}
