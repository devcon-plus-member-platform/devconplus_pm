"use client";

import React, { useState, useRef, useEffect } from "react";
import { QA_STATUS_THEME } from "@/lib/theme";
import StatusPill from "@/components/ui/StatusPill";
import Tag from "@/components/ui/Tag";
import type { Contributor, QATest, QAStatus } from "@/types";

const STATUS_CYCLE: QAStatus[] = ["Not Run", "Pass", "Fail", "Blocked"];

const CATEGORY_PALETTE = ["#3b5ee8", "#8b5cf6", "#f59e0b", "#ef4444", "#10b981", "#ec4899", "#06b6d4", "#f97316"];

function categoryColor(cat: string): string {
  let hash = 0;
  for (let i = 0; i < cat.length; i++) hash = (hash * 31 + cat.charCodeAt(i)) % CATEGORY_PALETTE.length;
  return CATEGORY_PALETTE[hash];
}

interface Props {
  test: QATest;
  contributors: Contributor[];
  onUpdate: (updates: Partial<QATest>) => void;
  onDelete: () => void;
  onEscalate?: () => void;
}

export default function QARow({ test, contributors, onUpdate, onDelete, onEscalate }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [editTitle, setEditTitle] = useState(false);
  const [titleVal, setTitleVal] = useState(test.title);
  const [editCat, setEditCat] = useState(false);
  const [catVal, setCatVal] = useState(test.category ?? "");
  const [showAssignee, setShowAssignee] = useState(false);
  const assigneeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (assigneeRef.current && !assigneeRef.current.contains(e.target as Node))
        setShowAssignee(false);
    }
    if (showAssignee) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showAssignee]);

  function cycleStatus() {
    const idx = STATUS_CYCLE.indexOf(test.status);
    const next = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
    onUpdate({ status: next });
  }

  function saveTitle() {
    setEditTitle(false);
    const t = titleVal.trim();
    if (t && t !== test.title) onUpdate({ title: t });
    else setTitleVal(test.title);
  }

  function saveCat() {
    setEditCat(false);
    const t = catVal.trim();
    if (t !== (test.category ?? "")) onUpdate({ category: t || null });
    else setCatVal(test.category ?? "");
  }

  const assignee = test.assignee ?? contributors.find((c) => c.id === test.assigned_to);

  return (
    <React.Fragment>
      <tr
        className="border-b border-gray-100 hover:bg-gray-50/40 group/row border-l-[3px]"
        style={{ borderLeftColor: QA_STATUS_THEME[test.status].dot }}
      >
        {/* Delete */}
        <td className="py-2.5 pr-2 w-8">
          <button
            onClick={onDelete}
            className="text-gray-300 hover:text-red-500 opacity-0 group-hover/row:opacity-100 transition-opacity text-xs"
          >
            🗑
          </button>
        </td>

        {/* Title */}
        <td className="py-2.5 pr-4">
          <div className="flex items-start gap-1.5">
            <button
              onClick={() => setExpanded((v) => !v)}
              className="mt-0.5 text-gray-300 hover:text-gray-500 text-[10px] shrink-0"
            >
              {expanded ? "▼" : "▶"}
            </button>
            {editTitle ? (
              <input
                autoFocus
                value={titleVal}
                onChange={(e) => setTitleVal(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveTitle();
                  if (e.key === "Escape") { setEditTitle(false); setTitleVal(test.title); }
                }}
                className="flex-1 text-sm border border-brand-300 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-brand-400"
              />
            ) : (
              <button onClick={() => setEditTitle(true)} className="text-left text-sm text-gray-800 hover:text-brand-600 font-medium">
                {test.title}
              </button>
            )}
          </div>
        </td>

        {/* Category */}
        <td className="py-2.5 pr-4">
          {editCat ? (
            <input
              autoFocus
              value={catVal}
              onChange={(e) => setCatVal(e.target.value)}
              onBlur={saveCat}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveCat();
                if (e.key === "Escape") { setEditCat(false); setCatVal(test.category ?? ""); }
              }}
              placeholder="e.g. Auth"
              className="w-full text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-300"
            />
          ) : (
            <button onClick={() => setEditCat(true)}>
              {test.category ? (
                <Tag label={test.category} color={categoryColor(test.category)} />
              ) : (
                <span className="text-xs text-gray-300 italic">Add category</span>
              )}
            </button>
          )}
        </td>

        {/* Assigned To */}
        <td className="py-2.5 pr-4 relative">
          <div ref={assigneeRef}>
            <button
              onClick={() => setShowAssignee((v) => !v)}
              className="flex items-center gap-1.5 text-xs hover:bg-gray-100 px-2 py-1 rounded-md transition-colors"
            >
              {assignee ? (
                <>
                  <span className="w-5 h-5 rounded-full bg-brand-200 text-brand-800 flex items-center justify-center text-[10px] font-semibold uppercase shrink-0">
                    {(assignee.full_name ?? assignee.email)[0]}
                  </span>
                  <span className="text-gray-700 truncate max-w-[110px]">
                    {assignee.full_name ?? assignee.email}
                  </span>
                </>
              ) : (
                <span className="text-gray-300 italic">Unassigned</span>
              )}
            </button>

            {showAssignee && (
              <div className="absolute z-20 top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-xl shadow-lg py-1 max-h-52 overflow-y-auto">
                <button
                  onClick={() => { setShowAssignee(false); onUpdate({ assigned_to: null }); }}
                  className="w-full text-left px-3 py-2 text-xs text-gray-400 hover:bg-gray-50 italic"
                >
                  Unassigned
                </button>
                <div className="border-t border-gray-100 my-1" />
                {contributors.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { setShowAssignee(false); if (c.id !== test.assigned_to) onUpdate({ assigned_to: c.id }); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-brand-50 text-gray-700"
                  >
                    <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-[10px] font-semibold uppercase shrink-0">
                      {(c.full_name ?? c.email)[0]}
                    </span>
                    <span className="flex-1 truncate">{c.full_name ?? c.email}</span>
                    {c.id === test.assigned_to && <span className="text-brand-500 text-xs">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </td>

        {/* Status — click to cycle */}
        <td className="py-2.5 pr-4">
          <button onClick={cycleStatus} className="hover:opacity-80 transition-opacity" title="Click to cycle status">
            <StatusPill label={test.status} color={QA_STATUS_THEME[test.status]} />
          </button>
        </td>

        {/* Bug report — visible when Fail */}
        <td className="py-2.5">
          {test.status === "Fail" ? (
            <div className="space-y-1.5">
              {test.bug_id ? (
                <a
                  href={`/bugs#${test.bug_id}`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-50 text-accent-rose border border-rose-100 rounded-full text-xs font-medium hover:bg-rose-100 transition-colors"
                >
                  🐛 Bug filed #{test.bug_id.slice(0, 6)}
                </a>
              ) : (
                <button
                  onClick={onEscalate}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-accent-rose text-white rounded-full text-xs font-medium hover:opacity-90 transition-opacity"
                >
                  Escalate to Bug
                </button>
              )}
              <textarea
                defaultValue={test.bug_report ?? ""}
                onBlur={(e) => {
                  const v = e.target.value;
                  if (v !== (test.bug_report ?? "")) onUpdate({ bug_report: v || null });
                }}
                rows={2}
                placeholder="Describe the bug…"
                className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-brand-300 placeholder-gray-300"
              />
            </div>
          ) : (
            <span className="text-xs text-gray-300">—</span>
          )}
        </td>
      </tr>

      {/* Expanded description */}
      {expanded && (
        <tr className="border-b border-gray-100 bg-gray-50/60">
          <td />
          <td colSpan={5} className="px-3 py-2">
            <textarea
              defaultValue={test.description ?? ""}
              onBlur={(e) => {
                const v = e.target.value;
                if (v !== (test.description ?? "")) onUpdate({ description: v || null });
              }}
              rows={2}
              placeholder="Add a description or acceptance criteria…"
              className="w-full text-xs text-gray-600 bg-white border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-brand-300 placeholder-gray-300"
            />
          </td>
        </tr>
      )}
    </React.Fragment>
  );
}
