"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import { useAuthStore } from "@/lib/store";
import { createClient } from "@/lib/supabase";
import type { Bug, BugSeverity, Contributor, Task } from "@/types";

const SEVERITY_OPTIONS: BugSeverity[] = ["Critical", "High", "Medium", "Low"];
const ENVIRONMENT_OPTIONS = ["Production", "Staging", "Local", "Other"];

interface PrefilledFromQA {
  qaTestId: string;
  title: string;
  description: string | null;
}

interface Props {
  projectId: string;
  contributors: Contributor[];
  tasks?: Task[];
  prefilledFromQA?: PrefilledFromQA;
  onCreated: (bug: Bug) => void;
  onClose: () => void;
}

export default function NewBugModal({
  projectId,
  contributors,
  tasks = [],
  prefilledFromQA,
  onCreated,
  onClose,
}: Props) {
  const supabase = createClient();
  const currentContributor = useAuthStore((s) => s.contributor);

  const [title, setTitle] = useState(prefilledFromQA?.title ?? "");
  const [severity, setSeverity] = useState<BugSeverity>("High");
  const [environment, setEnvironment] = useState("Staging");
  const [browserDevice, setBrowserDevice] = useState("");
  const [description, setDescription] = useState(prefilledFromQA?.description ?? "");
  const [steps, setSteps] = useState("");
  const [expected, setExpected] = useState("");
  const [actual, setActual] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [taskId, setTaskId] = useState("");
  const [prLink, setPrLink] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = title.trim().length > 0 && description.trim().length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || saving) return;
    setSaving(true);
    setError(null);

    // Upload screenshots first
    const uploadedPaths: string[] = [];
    for (const file of files) {
      const path = `${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage
        .from("bug-screenshots")
        .upload(path, file);
      if (!upErr) uploadedPaths.push(path);
    }

    const { data, error: insertError } = await supabase
      .from("bugs")
      .insert({
        project_id: projectId,
        title: title.trim(),
        description: description.trim(),
        steps_to_reproduce: steps.trim() || null,
        expected_behavior: expected.trim() || null,
        actual_behavior: actual.trim() || null,
        severity,
        environment: environment || null,
        browser_device: browserDevice.trim() || null,
        assigned_to: assignedTo || null,
        task_id: taskId || null,
        pr_link: prLink.trim() || null,
        screenshot_urls: uploadedPaths,
        reported_by: currentContributor?.id ?? null,
        qa_test_id: prefilledFromQA?.qaTestId ?? null,
      })
      .select(
        "*, reporter:contributors!reported_by(id,full_name,email,role_id,telegram_username,deleted_at,created_at), assignee:contributors!assigned_to(id,full_name,email,role_id,telegram_username,deleted_at,created_at)"
      )
      .single();

    if (insertError || !data) {
      setError(insertError?.message ?? "Failed to create bug.");
      setSaving(false);
      return;
    }

    const newBug = data as Bug;

    // Send email notification to assignee
    if (assignedTo) {
      const assignee = contributors.find((c) => c.id === assignedTo);
      if (assignee) {
        fetch("/api/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "bug_assigned",
            bug_id: newBug.id,
            assignee_email: assignee.email,
          }),
        }).catch(console.error);
      }
    }

    onCreated(newBug);
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={prefilledFromQA ? "Escalate to Bug" : "Report a Bug"}
      className="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        {prefilledFromQA && (
          <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-100 rounded-lg text-xs text-indigo-700">
            <span>📋</span>
            <span>Pre-filled from QA test: <strong>{prefilledFromQA.title}</strong></span>
          </div>
        )}

        {/* Row 1: Title + Severity */}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief description of the bug"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Severity</label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value as BugSeverity)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-300"
            >
              {SEVERITY_OPTIONS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Row 2: Environment + Browser */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Environment</label>
            <select
              value={environment}
              onChange={(e) => setEnvironment(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-300"
            >
              {ENVIRONMENT_OPTIONS.map((e) => <option key={e}>{e}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Browser / Device</label>
            <input
              type="text"
              value={browserDevice}
              onChange={(e) => setBrowserDevice(e.target.value)}
              placeholder="e.g. iPhone 14 Safari"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Description <span className="text-red-400">*</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Describe the bug clearly…"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
        </div>

        {/* Steps to reproduce */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Steps to Reproduce</label>
          <textarea
            value={steps}
            onChange={(e) => setSteps(e.target.value)}
            rows={3}
            placeholder={"1. Go to...\n2. Click on...\n3. Observe that..."}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-brand-300 placeholder-gray-300"
          />
        </div>

        {/* Expected vs Actual */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Expected Behavior</label>
            <textarea
              value={expected}
              onChange={(e) => setExpected(e.target.value)}
              rows={2}
              placeholder="What should happen?"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-brand-300 placeholder-gray-300"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Actual Behavior</label>
            <textarea
              value={actual}
              onChange={(e) => setActual(e.target.value)}
              rows={2}
              placeholder="What actually happens?"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-brand-300 placeholder-gray-300"
            />
          </div>
        </div>

        {/* Assign to + Task link + PR Link */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Assign to</label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-300"
            >
              <option value="">Unassigned</option>
              {contributors.map((c) => (
                <option key={c.id} value={c.id}>{c.full_name ?? c.email}</option>
              ))}
            </select>
          </div>
          {tasks.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Link to Task</label>
              <select
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-300"
              >
                <option value="">None</option>
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>{t.title.slice(0, 40)}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">PR Link</label>
            <input
              type="url"
              value={prLink}
              onChange={(e) => setPrLink(e.target.value)}
              placeholder="https://github.com/..."
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </div>
        </div>

        {/* Screenshots */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Screenshots</label>
          <div className="flex flex-wrap gap-2">
            {files.map((f, i) => (
              <div key={i} className="flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-lg text-xs text-gray-600">
                <span>{f.name.slice(0, 20)}</span>
                <button type="button" onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500">✕</button>
              </div>
            ))}
            <label className="flex items-center gap-1 px-3 py-1.5 border border-dashed border-gray-300 rounded-lg text-xs text-gray-400 hover:border-brand-400 hover:text-brand-600 cursor-pointer transition-colors">
              <input
                type="file"
                accept="image/*,video/mp4"
                multiple
                className="hidden"
                onChange={(e) => setFiles((prev) => [...prev, ...Array.from(e.target.files ?? [])])}
              />
              + Add files
            </label>
          </div>
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit || saving}
            className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-40 font-medium"
          >
            {saving ? "Filing bug…" : prefilledFromQA ? "Escalate to Bug" : "Report Bug"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
