"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { createClient } from "@/lib/supabase";
import type {
  Project,
  Group,
  Task,
  Contributor,
  TaskAttachment,
} from "@/types";
import { BoardContext } from "./BoardContext";
import ProjectSidebar from "./ProjectSidebar";
import ProjectBoard from "./ProjectBoard";
import DashboardOverview from "./DashboardOverview";
import NewProjectModal from "./modals/NewProjectModal";
import { useAuthStore } from "@/lib/store";

interface Props {
  initialProjects: Project[];
  contributors: Contributor[];
}

export default function DashboardClient({ initialProjects, contributors }: Props) {
  const supabase = useRef(createClient()).current;

  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    initialProjects[0]?.id ?? null
  );
  const [groups, setGroups] = useState<Group[]>([]);
  const [tasksByGroup, setTasksByGroup] = useState<Record<string, Task[]>>({});
  const [loading, setLoading] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [showNewProject, setShowNewProject] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const currentContributor = useAuthStore((s) => s.contributor);

  function logActivity(action: string, entity: string, entityTitle: string) {
    const actorName =
      currentContributor?.full_name ?? currentContributor?.email ?? "Guest";
    const actorEmail = currentContributor?.email ?? null;
    fetch("/api/activity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, entity, entityTitle, actorName, actorEmail, page: "PM Board" }),
    }).catch(console.error);
  }

  // ─── Load board data ────────────────────────────────────────────────────────
  const loadBoardData = useCallback(
    async (projectId: string) => {
      setLoading(true);
      const [{ data: grps }, { data: tasks }] = await Promise.all([
        supabase
          .from("groups")
          .select("*")
          .eq("project_id", projectId)
          .order("position"),
        supabase
          .from("tasks")
          .select(
            "*, assignee:contributors(id,email,full_name,role_id,telegram_username,created_at), attachments:task_attachments(*)"
          )
          .eq("project_id", projectId)
          .order("position"),
      ]);

      const byGroup: Record<string, Task[]> = {};
      for (const g of grps ?? []) {
        byGroup[g.id] = (tasks ?? []).filter(
          (t: Task) => t.group_id === g.id
        );
      }

      setGroups((grps as Group[]) ?? []);
      setTasksByGroup(byGroup);
      setLoading(false);
    },
    [supabase]
  );

  useEffect(() => {
    if (!selectedProjectId) {
      setGroups([]);
      setTasksByGroup({});
      return;
    }
    loadBoardData(selectedProjectId);
  }, [selectedProjectId, loadBoardData]);

  // ─── Realtime subscription ──────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedProjectId) return;

    const channel = supabase
      .channel(`board:${selectedProjectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `project_id=eq.${selectedProjectId}`,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          const { eventType, new: rec, old: oldRec } = payload;

          if (eventType === "INSERT") {
            setTasksByGroup((prev) => ({
              ...prev,
              [rec.group_id]: [...(prev[rec.group_id] ?? []), rec as Task],
            }));
          } else if (eventType === "UPDATE") {
            setTasksByGroup((prev) => {
              const gid = rec.group_id as string;
              return {
                ...prev,
                [gid]: (prev[gid] ?? []).map((t) =>
                  t.id === rec.id ? { ...t, ...rec } : t
                ),
              };
            });
          } else if (eventType === "DELETE") {
            setTasksByGroup((prev) => {
              const gid = oldRec.group_id as string;
              return {
                ...prev,
                [gid]: (prev[gid] ?? []).filter((t) => t.id !== oldRec.id),
              };
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedProjectId, supabase]);

  // ─── DnD ───────────────────────────────────────────────────────────────────
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    const type = active.data.current?.type as string;

    if (type === "group") {
      reorderGroups(activeId, overId);
    } else if (type === "task") {
      const sourceGroupId = active.data.current?.groupId as string;

      // Determine destination group from the over target
      let destGroupId: string;
      if (over.data.current?.type === "task") {
        destGroupId = over.data.current?.groupId as string;
      } else if (over.data.current?.type === "group") {
        destGroupId = overId;
      } else {
        destGroupId = sourceGroupId;
      }

      if (sourceGroupId === destGroupId) {
        reorderTasks(sourceGroupId, activeId, overId);
      } else {
        moveTaskToGroup(activeId, sourceGroupId, destGroupId, overId);
      }
    }
  }

  // ─── Group mutations ────────────────────────────────────────────────────────
  function toggleGroupCollapse(groupId: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }

  async function addGroup(name: string) {
    if (!selectedProjectId) return;
    const position = groups.length;
    const { data, error } = await supabase
      .from("groups")
      .insert({ project_id: selectedProjectId, name, position })
      .select()
      .single();

    if (error || !data) return;
    setGroups((prev) => [...prev, data as Group]);
    setTasksByGroup((prev) => ({ ...prev, [data.id]: [] }));
    logActivity("created", "group", name);
  }

  async function updateGroup(id: string, name: string) {
    const prev = groups.find((g) => g.id === id);
    setGroups((p) => p.map((g) => (g.id === id ? { ...g, name } : g)));
    await supabase.from("groups").update({ name }).eq("id", id);
    if (prev && prev.name !== name) logActivity("renamed", "group", name);
  }

  async function deleteGroup(id: string) {
    const prevGroups = groups;
    const prevTasks = tasksByGroup;
    const target = groups.find((g) => g.id === id);
    setGroups((prev) => prev.filter((g) => g.id !== id));
    setTasksByGroup((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    const { error } = await supabase.from("groups").delete().eq("id", id);
    if (error) {
      setGroups(prevGroups);
      setTasksByGroup(prevTasks);
    } else if (target) {
      logActivity("deleted", "group", target.name);
    }
  }

  async function reorderGroups(activeId: string, overId: string) {
    const oldIdx = groups.findIndex((g) => g.id === activeId);
    const newIdx = groups.findIndex((g) => g.id === overId);
    if (oldIdx === -1 || newIdx === -1) return;

    const next = arrayMove(groups, oldIdx, newIdx);
    setGroups(next);
    await Promise.all(
      next.map((g, i) =>
        supabase.from("groups").update({ position: i }).eq("id", g.id)
      )
    );
  }

  // ─── Task mutations ─────────────────────────────────────────────────────────
  async function addTask(groupId: string) {
    if (!selectedProjectId) return;
    const position = (tasksByGroup[groupId] ?? []).length;
    const { data, error } = await supabase
      .from("tasks")
      .insert({
        group_id: groupId,
        project_id: selectedProjectId,
        title: "New Task",
        status: "Not Started",
        position,
      })
      .select(
        "*, assignee:contributors(id,email,full_name,role_id,telegram_username,created_at), attachments:task_attachments(*)"
      )
      .single();

    if (error || !data) return;
    setTasksByGroup((prev) => ({
      ...prev,
      [groupId]: [...(prev[groupId] ?? []), data as Task],
    }));
    logActivity("created", "task", "New Task");
  }

  const SIGNIFICANT_TASK_FIELDS = new Set([
    "title", "status", "assignee_id", "assignee_ids", "group_id", "due_date", "description", "pr_link",
    "timeline_start", "timeline_end",
  ]);

  async function updateTask(
    id: string,
    groupId: string,
    updates: Partial<Task>,
    prevTask?: Task
  ) {
    // Optimistic update
    setTasksByGroup((prev) => ({
      ...prev,
      [groupId]: (prev[groupId] ?? []).map((t) =>
        t.id === id ? { ...t, ...updates } : t
      ),
    }));

    // Strip joined fields before sending to DB
    const { assignee: _a, attachments: _at, ...dbUpdates } = updates as Task & {
      assignee?: unknown;
      attachments?: unknown;
    };

    const { error } = await supabase
      .from("tasks")
      .update(dbUpdates)
      .eq("id", id);

    if (error && prevTask) {
      setTasksByGroup((prev) => ({
        ...prev,
        [groupId]: (prev[groupId] ?? []).map((t) =>
          t.id === id ? prevTask : t
        ),
      }));
      return;
    }

    // Determine action label for meaningful field changes
    const changedKeys = Object.keys(updates).filter((k) =>
      SIGNIFICANT_TASK_FIELDS.has(k)
    );
    if (changedKeys.length > 0) {
      const taskTitle = (updates.title ?? prevTask?.title ?? "task");
      const action =
        updates.group_id !== undefined && prevTask && updates.group_id !== prevTask.group_id
          ? "moved"
          : updates.status !== undefined && prevTask && updates.status !== prevTask.status
          ? "updated status of"
          : updates.assignee_id !== undefined && prevTask && updates.assignee_id !== prevTask.assignee_id
          ? "assigned"
          : "updated";
      logActivity(action, "task", taskTitle as string);
    }

    // Email notify newly added assignees
    if (updates.assignee_ids !== undefined && prevTask) {
      const prevIds = prevTask.assignee_ids ?? (prevTask.assignee_id ? [prevTask.assignee_id] : []);
      const newIds = updates.assignee_ids.filter((id) => !prevIds.includes(id));
      for (const newId of newIds) {
        const assignee = contributors.find((c) => c.id === newId);
        if (assignee) {
          fetch("/api/notify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "task_assigned",
              task_id: id,
              assignee_email: assignee.email,
            }),
          }).catch(console.error);
        }
      }
    }
  }

  async function deleteTask(id: string, groupId: string) {
    const prev = tasksByGroup[groupId] ?? [];
    const target = prev.find((t) => t.id === id);
    setTasksByGroup((prevState) => ({
      ...prevState,
      [groupId]: prevState[groupId].filter((t) => t.id !== id),
    }));
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) {
      setTasksByGroup((prevState) => ({ ...prevState, [groupId]: prev }));
    } else if (target) {
      logActivity("deleted", "task", target.title);
    }
  }

  async function reorderTasks(
    groupId: string,
    activeId: string,
    overId: string
  ) {
    const ts = tasksByGroup[groupId] ?? [];
    const oldIdx = ts.findIndex((t) => t.id === activeId);
    const newIdx = ts.findIndex((t) => t.id === overId);
    if (oldIdx === -1 || newIdx === -1) return;

    const next = arrayMove(ts, oldIdx, newIdx);
    setTasksByGroup((prev) => ({ ...prev, [groupId]: next }));
    await Promise.all(
      next.map((t, i) =>
        supabase.from("tasks").update({ position: i }).eq("id", t.id)
      )
    );
  }

  async function moveTaskToGroup(
    taskId: string,
    fromGroupId: string,
    toGroupId: string,
    overId: string
  ) {
    const task = (tasksByGroup[fromGroupId] ?? []).find((t) => t.id === taskId);
    if (!task) return;

    const sourceTasks = (tasksByGroup[fromGroupId] ?? []).filter((t) => t.id !== taskId);
    const destTasks = tasksByGroup[toGroupId] ?? [];
    const overIdx = destTasks.findIndex((t) => t.id === overId);
    const insertAt = overIdx === -1 ? destTasks.length : overIdx;

    const newDestTasks = [
      ...destTasks.slice(0, insertAt),
      { ...task, group_id: toGroupId },
      ...destTasks.slice(insertAt),
    ];

    setTasksByGroup((prev) => ({
      ...prev,
      [fromGroupId]: sourceTasks,
      [toGroupId]: newDestTasks,
    }));

    await supabase.from("tasks").update({ group_id: toGroupId }).eq("id", taskId);
    await Promise.all([
      ...sourceTasks.map((t, i) => supabase.from("tasks").update({ position: i }).eq("id", t.id)),
      ...newDestTasks.map((t, i) => supabase.from("tasks").update({ position: i }).eq("id", t.id)),
    ]);

    logActivity("moved", "task", task.title);
  }

  // ─── Attachment mutations ───────────────────────────────────────────────────
  async function uploadAttachment(
    taskId: string,
    groupId: string,
    file: File
  ) {
    const path = `${taskId}/${Date.now()}_${file.name}`;
    const { error: upErr } = await supabase.storage
      .from("task-attachments")
      .upload(path, file);
    if (upErr) throw upErr;

    const { data: row, error: dbErr } = await supabase
      .from("task_attachments")
      .insert({ task_id: taskId, file_name: file.name, file_url: path })
      .select()
      .single();
    if (dbErr) throw dbErr;

    setTasksByGroup((prev) => ({
      ...prev,
      [groupId]: (prev[groupId] ?? []).map((t) =>
        t.id === taskId
          ? { ...t, attachments: [...(t.attachments ?? []), row as TaskAttachment] }
          : t
      ),
    }));
  }

  async function deleteAttachment(
    attachment: TaskAttachment,
    taskId: string,
    groupId: string
  ) {
    await supabase.storage
      .from("task-attachments")
      .remove([attachment.file_url]);
    await supabase
      .from("task_attachments")
      .delete()
      .eq("id", attachment.id);

    setTasksByGroup((prev) => ({
      ...prev,
      [groupId]: (prev[groupId] ?? []).map((t) =>
        t.id === taskId
          ? {
              ...t,
              attachments: (t.attachments ?? []).filter(
                (a) => a.id !== attachment.id
              ),
            }
          : t
      ),
    }));
  }

  async function getSignedUrl(filePath: string): Promise<string> {
    const { data } = await supabase.storage
      .from("task-attachments")
      .createSignedUrl(filePath, 3600);
    return data?.signedUrl ?? "";
  }

  // ─── Project mutations ──────────────────────────────────────────────────────
  async function createProject(name: string, description: string) {
    const { data, error } = await supabase
      .from("projects")
      .insert({ name, description })
      .select()
      .single();
    if (error || !data) return;
    setProjects((prev) => [...prev, data as Project]);
    setSelectedProjectId(data.id);
    logActivity("created", "project", name);
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const allTasks = Object.values(tasksByGroup).flat();

  return (
    <BoardContext.Provider
      value={{
        groups,
        tasksByGroup,
        contributors,
        selectedProjectId: selectedProjectId ?? "",
        collapsedGroups,
        toggleGroupCollapse,
        addGroup,
        updateGroup,
        deleteGroup,
        reorderGroups,
        addTask,
        updateTask,
        deleteTask,
        reorderTasks,
        uploadAttachment,
        deleteAttachment,
        getSignedUrl,
      }}
    >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="flex h-screen overflow-hidden">
          {/* Project list sidebar */}
          <ProjectSidebar
            projects={projects}
            selectedProjectId={selectedProjectId}
            onSelect={setSelectedProjectId}
            onNewProject={() => setShowNewProject(true)}
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed((v) => !v)}
          />

          {/* Main board */}
          <div className="flex-1 overflow-hidden bg-white flex flex-col">
            <DashboardOverview tasks={allTasks} currentContributor={currentContributor} selectedProjectId={selectedProjectId ?? ""} />
            {selectedProject ? (
              <div className="flex-1 overflow-hidden">
                <ProjectBoard project={selectedProject} loading={loading} />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 text-gray-400 gap-3">
                <span className="text-5xl">📋</span>
                <p className="text-sm">Select or create a project to get started</p>
                <button
                  onClick={() => setShowNewProject(true)}
                  className="text-brand-600 text-sm font-medium hover:underline"
                >
                  + New Project
                </button>
              </div>
            )}
          </div>
        </div>
      </DndContext>

      {showNewProject && (
        <NewProjectModal
          onClose={() => setShowNewProject(false)}
          onCreate={createProject}
        />
      )}
    </BoardContext.Provider>
  );
}
