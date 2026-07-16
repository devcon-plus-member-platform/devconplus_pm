"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase";
import QARow from "./QARow";
import NewBugModal from "@/components/bugs/NewBugModal";
import StatCard from "@/components/ui/StatCard";
import ProgressBar from "@/components/ui/ProgressBar";
import { QA_STATUS_THEME } from "@/lib/theme";
import type { Project, Contributor, QATest, QAStatus, Bug } from "@/types";

const ALL = "All";
const STATUS_OPTIONS: (QAStatus | typeof ALL)[] = [ALL, "Not Run", "Pass", "Fail", "Blocked"];

interface Props {
  initialProjects: Project[];
  contributors: Contributor[];
}

function exportToCsv(tests: QATest[], contributors: Contributor[], projectName: string) {
  const headers = ["Title", "Category", "Assigned To", "Status", "Bug Report"];
  const rows = tests.map((t) => [
    t.title,
    t.category ?? "",
    contributors.find((c) => c.id === t.assigned_to)?.full_name ?? "",
    t.status,
    t.bug_report ?? "",
  ]);

  const csv = [headers, ...rows]
    .map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    )
    .join("\n");

  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `qa-${projectName.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function QAClient({ initialProjects, contributors }: Props) {
  const supabase = useRef(createClient()).current;

  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    initialProjects[0]?.id ?? ""
  );
  const [tests, setTests] = useState<QATest[]>([]);
  const [loading, setLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>(ALL);
  const [statusFilter, setStatusFilter] = useState<QAStatus | typeof ALL>(ALL);
  const [escalatingFrom, setEscalatingFrom] = useState<QATest | null>(null);

  const stats = useMemo(() => {
    const pass = tests.filter((t) => t.status === "Pass").length;
    const fail = tests.filter((t) => t.status === "Fail").length;
    const blocked = tests.filter((t) => t.status === "Blocked").length;
    const notRun = tests.filter((t) => t.status === "Not Run").length;
    const total = tests.length;
    const passRate = total === 0 ? 0 : Math.round((pass / total) * 100);
    return { pass, fail, blocked, notRun, passRate };
  }, [tests]);

  // Derive categories from current tests
  const categories = useMemo(() => {
    const cats = Array.from(
      new Set(tests.map((t) => t.category).filter(Boolean) as string[])
    ).sort();
    return [ALL, ...cats];
  }, [tests]);

  const loadTests = useCallback(
    async (projectId: string) => {
      if (!projectId) return;
      setLoading(true);
      const { data } = await supabase
        .from("qa_tests")
        .select("*, assignee:contributors(id,email,full_name,role_id,telegram_username,deleted_at,created_at)")
        .eq("project_id", projectId)
        .order("created_at");
      setTests((data as QATest[]) ?? []);
      setLoading(false);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    if (selectedProjectId) loadTests(selectedProjectId);
    else setTests([]);
  }, [selectedProjectId, loadTests]);

  // ─── Mutations ─────────────────────────────────────────────────────────────
  async function addTest() {
    if (!selectedProjectId) return;
    const { data, error } = await supabase
      .from("qa_tests")
      .insert({
        project_id: selectedProjectId,
        title: "New Test Case",
        status: "Not Run",
      })
      .select("*, assignee:contributors(id,email,full_name,role_id,telegram_username,deleted_at,created_at)")
      .single();
    if (error || !data) return;
    setTests((prev) => [...prev, data as QATest]);
  }

  async function updateTest(id: string, updates: Partial<QATest>, prev?: QATest) {
    setTests((all) =>
      all.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
    const { assignee: _a, ...dbUpdates } = updates as QATest & { assignee?: unknown };
    const { error } = await supabase.from("qa_tests").update(dbUpdates).eq("id", id);
    if (error && prev) {
      setTests((all) => all.map((t) => (t.id === id ? prev : t)));
    }
  }

  async function deleteTest(id: string) {
    const saved = tests;
    setTests((prev) => prev.filter((t) => t.id !== id));
    const { error } = await supabase.from("qa_tests").delete().eq("id", id);
    if (error) setTests(saved);
  }

  async function handleBugCreated(bug: Bug, qaTestId: string) {
    setEscalatingFrom(null);
    // Link the bug back to the qa_test
    await supabase.from("qa_tests").update({ bug_id: bug.id }).eq("id", qaTestId);
    setTests((prev) =>
      prev.map((t) => (t.id === qaTestId ? { ...t, bug_id: bug.id } : t))
    );
  }

  // ─── Filtered view ─────────────────────────────────────────────────────────
  const visible = tests.filter((t) => {
    const matchCat = categoryFilter === ALL || t.category === categoryFilter;
    const matchStatus = statusFilter === ALL || t.status === statusFilter;
    return matchCat && matchStatus;
  });

  const selectedProject = initialProjects.find((p) => p.id === selectedProjectId);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0 gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-lg font-semibold text-gray-800">QA Testing</h1>

          {/* Project selector */}
          <select
            value={selectedProjectId}
            onChange={(e) => {
              setSelectedProjectId(e.target.value);
              setCategoryFilter(ALL);
              setStatusFilter(ALL);
            }}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400"
          >
            {initialProjects.length === 0 && (
              <option value="">No projects yet</option>
            )}
            {initialProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as QAStatus | typeof ALL)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-400"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s === ALL ? "All Statuses" : s}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => selectedProject && exportToCsv(visible, contributors, selectedProject.name)}
            disabled={visible.length === 0}
            className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors text-gray-600"
          >
            ↓ Export CSV
          </button>
          <button
            onClick={addTest}
            disabled={!selectedProjectId}
            className="text-sm px-3 py-1.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-40 transition-colors font-medium"
          >
            + Add Test Case
          </button>
        </div>
      </div>

      {/* Stat strip */}
      {tests.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 px-6 py-4 bg-surface border-b border-surface-border shrink-0">
          <StatCard label="Pass" value={stats.pass} accent={QA_STATUS_THEME.Pass.dot} />
          <StatCard label="Fail" value={stats.fail} accent={QA_STATUS_THEME.Fail.dot} />
          <StatCard label="Blocked" value={stats.blocked} accent={QA_STATUS_THEME.Blocked.dot} />
          <StatCard label="Not Run" value={stats.notRun} accent={QA_STATUS_THEME["Not Run"].dot} />
          <div className="bg-white border border-surface-border rounded-xl px-5 py-4 shadow-sm col-span-2 sm:col-span-1 flex flex-col justify-center">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs text-gray-400">Pass Rate</p>
              <p className="text-xs font-semibold text-gray-700">{stats.passRate}%</p>
            </div>
            <ProgressBar value={stats.passRate} color={QA_STATUS_THEME.Pass.dot} />
          </div>
        </div>
      )}

      {/* Category tabs */}
      {tests.length > 0 && (
        <div className="flex items-center gap-1 px-6 pt-3 pb-0 overflow-x-auto shrink-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors whitespace-nowrap ${
                categoryFilter === cat
                  ? "bg-brand-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cat}
              {cat !== ALL && (
                <span className="ml-1 opacity-60">
                  ({tests.filter((t) => t.category === cat).length})
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-y-auto overflow-x-auto px-6 py-4">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
            Loading tests…
          </div>
        ) : !selectedProjectId ? (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
            Select a project to view QA tests
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400 text-sm gap-2">
            <p>No test cases found.</p>
            {tests.length > 0 && categoryFilter !== ALL && (
              <button
                onClick={() => setCategoryFilter(ALL)}
                className="text-brand-600 hover:underline"
              >
                Clear filters
              </button>
            )}
            {tests.length === 0 && (
              <button onClick={addTest} className="text-brand-600 hover:underline font-medium">
                + Add your first test case
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-left">
                <th className="pb-2 pr-4 text-xs font-semibold text-gray-500 uppercase tracking-wide w-8" />
                <th className="pb-2 pr-4 text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[260px]">Test Case</th>
                <th className="pb-2 pr-4 text-xs font-semibold text-gray-500 uppercase tracking-wide w-[120px]">Category</th>
                <th className="pb-2 pr-4 text-xs font-semibold text-gray-500 uppercase tracking-wide w-[160px]">Assigned To</th>
                <th className="pb-2 pr-4 text-xs font-semibold text-gray-500 uppercase tracking-wide w-[120px]">Status</th>
                <th className="pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Bug Report</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((test) => (
                <QARow
                  key={test.id}
                  test={test}
                  contributors={contributors}
                  onUpdate={(updates) => updateTest(test.id, updates, test)}
                  onDelete={() => deleteTest(test.id)}
                  onEscalate={() => setEscalatingFrom(test)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {escalatingFrom && selectedProjectId && (
        <NewBugModal
          projectId={selectedProjectId}
          contributors={contributors}
          prefilledFromQA={{
            qaTestId: escalatingFrom.id,
            title: escalatingFrom.title,
            description: escalatingFrom.description,
          }}
          onCreated={(bug) => handleBugCreated(bug, escalatingFrom.id)}
          onClose={() => setEscalatingFrom(null)}
        />
      )}
    </div>
  );
}
