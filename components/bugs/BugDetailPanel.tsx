"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase";
import { useAuthStore } from "@/lib/store";
import { formatDate } from "@/lib/utils";
import type { Bug, BugActivity, BugSeverity, BugStatus, Contributor } from "@/types";

const SEVERITY_OPTIONS: BugSeverity[] = ["Critical", "High", "Medium", "Low"];
const STATUS_OPTIONS: BugStatus[] = ["Open", "In Progress", "Resolved", "Closed", "Cannot Reproduce"];

const SEVERITY_STYLES: Record<BugSeverity, string> = {
  Critical: "bg-red-100 text-red-700",
  High:     "bg-orange-100 text-orange-700",
  Medium:   "bg-yellow-100 text-yellow-700",
  Low:      "bg-gray-100 text-gray-600",
};

const STATUS_STYLES: Record<BugStatus, string> = {
  "Open":               "bg-blue-100 text-blue-700",
  "In Progress":        "bg-purple-100 text-purple-700",
  "Resolved":           "bg-green-100 text-green-700",
  "Closed":             "bg-gray-100 text-gray-500",
  "Cannot Reproduce":   "bg-slate-100 text-slate-600",
};

interface Props {
  bug: Bug;
  contributors: Contributor[];
  onUpdate: (updates: Partial<Bug>) => void;
  onClose: () => void;
}

export default function BugDetailPanel({ bug, contributors, onUpdate, onClose }: Props) {
  const supabase = useRef(createClient()).current;
  const currentContributor = useAuthStore((s) => s.contributor);
  const [activity, setActivity] = useState<BugActivity[]>([]);
  const [prLink, setPrLink] = useState(bug.pr_link ?? "");
  const [editingPr, setEditingPr] = useState(false);
  const [screenshots, setScreenshots] = useState<string[]>(bug.screenshot_urls ?? []);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  // Load activity log
  useEffect(() => {
    supabase
      .from("bug_activity")
      .select("*, changer:contributors(full_name,email)")
      .eq("bug_id", bug.id)
      .order("changed_at", { ascending: false })
      .then(({ data }) => setActivity((data as BugActivity[]) ?? []));
  }, [bug.id]);

  // Generate signed URLs for screenshots
  useEffect(() => {
    screenshots.forEach(async (path) => {
      if (signedUrls[path]) return;
      const { data } = await supabase.storage
        .from("bug-screenshots")
        .createSignedUrl(path, 3600);
      if (data?.signedUrl) {
        setSignedUrls((prev) => ({ ...prev, [path]: data.signedUrl }));
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenshots]);

  async function handleFieldChange(field: "status" | "severity" | "assigned_to", newValue: string) {
    const oldValue = String(bug[field] ?? "");
    onUpdate({ [field]: newValue || null });

    if ((field === "status" || field === "severity") && currentContributor) {
      await supabase.from("bug_activity").insert({
        bug_id: bug.id,
        changed_by: currentContributor.id,
        field_changed: field,
        old_value: oldValue,
        new_value: newValue,
      });
      // Refresh activity
      const { data } = await supabase
        .from("bug_activity")
        .select("*, changer:contributors(full_name,email)")
        .eq("bug_id", bug.id)
        .order("changed_at", { ascending: false });
      setActivity((data as BugActivity[]) ?? []);
    }
  }

  async function savePrLink() {
    setEditingPr(false);
    if (prLink !== (bug.pr_link ?? "")) onUpdate({ pr_link: prLink || null });
  }

  async function uploadScreenshot(file: File) {
    const path = `${bug.id}/${Date.now()}_${file.name}`;
    const { error } = await supabase.storage.from("bug-screenshots").upload(path, file);
    if (error) return;
    const newUrls = [...screenshots, path];
    setScreenshots(newUrls);
    onUpdate({ screenshot_urls: newUrls });
  }

  async function deleteScreenshot(path: string) {
    await supabase.storage.from("bug-screenshots").remove([path]);
    const newUrls = screenshots.filter((s) => s !== path);
    setScreenshots(newUrls);
    onUpdate({ screenshot_urls: newUrls });
  }

  const reporter = bug.reporter ?? contributors.find((c) => c.id === bug.reported_by);

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-white shadow-2xl z-40 flex flex-col overflow-hidden border-l border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <select
              value={bug.severity}
              onChange={(e) => handleFieldChange("severity", e.target.value)}
              className={`text-xs font-semibold rounded-full px-2 py-0.5 border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-300 ${SEVERITY_STYLES[bug.severity]}`}
            >
              {SEVERITY_OPTIONS.map((s) => <option key={s}>{s}</option>)}
            </select>
            <select
              value={bug.status}
              onChange={(e) => handleFieldChange("status", e.target.value)}
              className={`text-xs font-medium rounded-full px-2 py-0.5 border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-300 ${STATUS_STYLES[bug.status]}`}
            >
              {STATUS_OPTIONS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <h2 className="text-base font-semibold text-gray-800">{bug.title}</h2>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 shrink-0"
        >
          ✕
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
        {/* Meta row */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-gray-400 mb-0.5">Reported by</p>
            <p className="text-gray-700 font-medium">{reporter?.full_name ?? reporter?.email ?? "—"}</p>
            <p className="text-gray-400">{formatDate(bug.created_at)}</p>
          </div>
          <div>
            <p className="text-gray-400 mb-0.5">Assigned to</p>
            <select
              value={bug.assigned_to ?? ""}
              onChange={(e) => handleFieldChange("assigned_to", e.target.value)}
              className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-brand-300"
            >
              <option value="">Unassigned</option>
              {contributors.map((c) => (
                <option key={c.id} value={c.id}>{c.full_name ?? c.email}</option>
              ))}
            </select>
          </div>
          {bug.environment && (
            <div>
              <p className="text-gray-400 mb-0.5">Environment</p>
              <p className="text-gray-700">{bug.environment}</p>
            </div>
          )}
          {bug.browser_device && (
            <div>
              <p className="text-gray-400 mb-0.5">Browser / Device</p>
              <p className="text-gray-700">{bug.browser_device}</p>
            </div>
          )}
        </div>

        {/* Description */}
        <Section label="Description">
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{bug.description}</p>
        </Section>

        {bug.steps_to_reproduce && (
          <Section label="Steps to Reproduce">
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{bug.steps_to_reproduce}</p>
          </Section>
        )}

        {(bug.expected_behavior || bug.actual_behavior) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {bug.expected_behavior && (
              <Section label="Expected Behavior">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{bug.expected_behavior}</p>
              </Section>
            )}
            {bug.actual_behavior && (
              <Section label="Actual Behavior">
                <p className="text-sm text-gray-700 whitespace-pre-wrap text-red-600">{bug.actual_behavior}</p>
              </Section>
            )}
          </div>
        )}

        {/* PR Link */}
        <Section label="PR Link">
          {editingPr ? (
            <input
              autoFocus
              value={prLink}
              onChange={(e) => setPrLink(e.target.value)}
              onBlur={savePrLink}
              onKeyDown={(e) => { if (e.key === "Enter") savePrLink(); }}
              placeholder="https://github.com/..."
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-300"
            />
          ) : bug.pr_link ? (
            <div className="flex items-center gap-2">
              <a
                href={bug.pr_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-brand-600 hover:underline truncate"
              >
                {bug.pr_link}
              </a>
              <button
                onClick={() => setEditingPr(true)}
                className="text-xs text-gray-400 hover:text-gray-600 shrink-0"
              >
                Edit
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditingPr(true)}
              className="text-sm text-gray-400 italic hover:text-brand-600"
            >
              Add PR link…
            </button>
          )}
        </Section>

        {/* QA Source */}
        {bug.qa_test_id && (
          <Section label="Source">
            <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
              Escalated from QA test{bug.qa_test?.title ? `: ${bug.qa_test.title}` : ""}
            </span>
          </Section>
        )}

        {/* Screenshots */}
        <Section label="Screenshots">
          <div className="flex flex-wrap gap-2">
            {screenshots.map((path) => (
              <div key={path} className="relative group/img">
                {signedUrls[path] ? (
                  <a href={signedUrls[path]} target="_blank" rel="noopener noreferrer">
                    <Image
                      src={signedUrls[path]}
                      alt="screenshot"
                      width={80}
                      height={80}
                      className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                      unoptimized
                    />
                  </a>
                ) : (
                  <div className="w-20 h-20 bg-gray-100 rounded-lg animate-pulse" />
                )}
                <button
                  onClick={() => deleteScreenshot(path)}
                  className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] items-center justify-center hidden group-hover/img:flex"
                >
                  ✕
                </button>
              </div>
            ))}
            <label className="w-20 h-20 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center cursor-pointer hover:border-brand-400 hover:bg-brand-50 transition-colors">
              <input
                type="file"
                accept="image/*,video/mp4"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadScreenshot(file);
                  e.target.value = "";
                }}
              />
              <span className="text-gray-400 text-xl">+</span>
            </label>
          </div>
        </Section>

        {/* Activity log */}
        <Section label="Activity">
          {activity.length === 0 ? (
            <p className="text-xs text-gray-400">No changes recorded yet.</p>
          ) : (
            <ul className="space-y-2">
              {activity.map((a) => {
                const who = (a.changer as { full_name?: string; email?: string } | undefined)?.full_name
                  ?? (a.changer as { full_name?: string; email?: string } | undefined)?.email
                  ?? "Someone";
                return (
                  <li key={a.id} className="flex items-start gap-2 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-1.5 shrink-0" />
                    <div>
                      <span className="text-gray-700 font-medium">{who}</span>
                      {" changed "}
                      <span className="text-gray-600">{a.field_changed}</span>
                      {" from "}
                      <span className="text-gray-500">{a.old_value || "—"}</span>
                      {" to "}
                      <span className="text-gray-800 font-medium">{a.new_value || "—"}</span>
                      <span className="text-gray-400 ml-2">{formatDate(a.changed_at)}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{label}</p>
      {children}
    </div>
  );
}
