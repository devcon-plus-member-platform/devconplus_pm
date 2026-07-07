"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import type { Milestone, MilestoneStatus, Project, Group } from "@/types";

const STATUS_OPTIONS: MilestoneStatus[] = ["Not Started", "In Progress", "At Risk", "Achieved", "Missed"];

interface Props {
  milestone?: Milestone | null;
  projectId?: string;
  contributorId?: string;
  projects: Project[];
  activeGroups: Group[];
  onSaved: (milestone: Milestone) => void;
  onClose: () => void;
}

export default function NewMilestoneModal({ milestone, projectId, contributorId, projects, activeGroups, onSaved, onClose }: Props) {
  const isEdit = Boolean(milestone);
  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    title: milestone?.title ?? "",
    description: milestone?.description ?? "",
    target_date: milestone?.target_date ?? "",
    status: (milestone?.status ?? "Not Started") as MilestoneStatus,
    project_id: milestone?.project_id ?? projectId ?? "",
    group_ids: (milestone?.groups ?? []).map((g) => g.id),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = form.title.trim() && form.target_date && (isEdit || form.target_date > today);

  const isActiveProject = form.project_id && projects.some((p) => p.id === form.project_id && p.status === "Active");
  const groupsForProject = activeGroups.filter((g) => g.project_id === form.project_id);

  function toggleGroup(groupId: string) {
    setForm((f) => ({
      ...f,
      group_ids: f.group_ids.includes(groupId)
        ? f.group_ids.filter((id) => id !== groupId)
        : [...f.group_ids, groupId],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || saving) return;
    setSaving(true);
    setError(null);

    const url = isEdit ? `/api/milestones/${milestone!.id}` : "/api/milestones";
    const method = isEdit ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        isEdit
          ? { title: form.title.trim(), description: form.description || null, target_date: form.target_date, status: form.status, project_id: form.project_id || null, group_ids: form.group_ids }
          : { title: form.title.trim(), description: form.description || null, target_date: form.target_date, status: form.status, project_id: form.project_id || null, group_ids: form.group_ids, created_by: contributorId ?? null }
      ),
    });

    const json = await res.json();
    if (!json.ok) {
      setError(json.error ?? "Failed to save milestone.");
      setSaving(false);
      return;
    }

    onSaved(json.milestone as Milestone);
  }

  return (
    <Modal open onClose={onClose} title={isEdit ? "Edit Milestone" : "New Milestone"} className="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Title <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="e.g. MVP Launch, QA Full Pass"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            rows={2}
            placeholder="Optional context or success criteria..."
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-brand-300 placeholder-gray-300"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Target Date <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              min={isEdit ? undefined : today}
              value={form.target_date}
              onChange={(e) => setForm((f) => ({ ...f, target_date: e.target.value }))}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as MilestoneStatus }))}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-300"
            >
              {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Project</label>
          <select
            value={form.project_id}
            onChange={(e) => setForm((f) => ({ ...f, project_id: e.target.value, group_ids: [] }))}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-300"
          >
            <option value="">No project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}{p.status !== "Active" ? " (Inactive)" : ""}</option>
            ))}
          </select>
        </div>

        {form.project_id && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Linked Groups</label>
            {!isActiveProject && (
              <p className="text-[11px] text-gray-400">Groups can only be linked while the project is Active.</p>
            )}
            {isActiveProject && groupsForProject.length === 0 && (
              <p className="text-[11px] text-gray-400">This project has no groups yet.</p>
            )}
            {isActiveProject && groupsForProject.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {groupsForProject.map((g) => {
                  const checked = form.group_ids.includes(g.id);
                  return (
                    <button
                      type="button"
                      key={g.id}
                      onClick={() => toggleGroup(g.id)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        checked
                          ? "bg-brand-600 text-white border-brand-600"
                          : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      {g.name}
                    </button>
                  );
                })}
              </div>
            )}
            <p className="text-[11px] text-gray-400 mt-1">Progress auto-calculates from the status of tasks in linked groups.</p>
          </div>
        )}

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit || saving}
            className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-40 font-medium"
          >
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Milestone"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
