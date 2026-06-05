"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import type { Milestone, MilestoneStatus } from "@/types";

const STATUS_OPTIONS: MilestoneStatus[] = ["Not Started", "In Progress", "At Risk", "Achieved", "Missed"];

interface Props {
  milestone?: Milestone | null;
  projectId?: string;
  contributorId?: string;
  onSaved: (milestone: Milestone) => void;
  onClose: () => void;
}

export default function NewMilestoneModal({ milestone, projectId, contributorId, onSaved, onClose }: Props) {
  const isEdit = Boolean(milestone);
  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    title: milestone?.title ?? "",
    description: milestone?.description ?? "",
    target_date: milestone?.target_date ?? "",
    status: (milestone?.status ?? "Not Started") as MilestoneStatus,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = form.title.trim() && form.target_date && (isEdit || form.target_date > today);

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
          ? { title: form.title.trim(), description: form.description || null, target_date: form.target_date, status: form.status }
          : { title: form.title.trim(), description: form.description || null, target_date: form.target_date, status: form.status, project_id: projectId ?? null, created_by: contributorId ?? null }
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
