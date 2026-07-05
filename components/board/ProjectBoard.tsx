"use client";

import { useState, useEffect } from "react";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useBoardContext } from "./BoardContext";
import GroupSection from "./GroupSection";
import type { Project } from "@/types";

interface Props {
  project: Project;
  loading: boolean;
  loadError?: boolean;
  onRetry?: () => void;
}

export default function ProjectBoard({ project, loading, loadError, onRetry }: Props) {
  const { groups, addGroup, canEdit, updateProject } = useBoardContext();
  const [newGroupName, setNewGroupName] = useState("");
  const [addingGroup, setAddingGroup] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(project.name);

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
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white shrink-0">
        <div className="min-w-0">
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
              className="text-base font-semibold text-gray-900 leading-tight bg-white border border-brand-300 rounded-md px-2 py-0.5 -ml-2 focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-400 transition-shadow"
            />
          ) : (
            <button
              onClick={() => canEdit && setEditingName(true)}
              className="text-base font-semibold text-gray-900 leading-tight truncate text-left hover:opacity-75 transition-opacity"
              title={canEdit ? "Click to rename" : undefined}
            >
              {project.name}
            </button>
          )}
          {project.description && (
            <p className="text-xs text-gray-400 mt-0.5 truncate">{project.description}</p>
          )}
        </div>
        {canEdit && (
          <button
            onClick={() => setAddingGroup(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-brand-600 hover:text-brand-700 hover:bg-brand-50 border border-brand-200 hover:border-brand-300 rounded-lg transition-all duration-150 font-medium shrink-0 ml-4 group/btn"
          >
            <svg className="w-4 h-4 transition-transform duration-150 group-hover/btn:scale-110" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Group
          </button>
        )}
      </div>

      {/* Scrollable board area */}
      <div className="flex-1 overflow-y-auto overflow-x-auto px-6 py-5 space-y-4">
        <SortableContext
          items={groups.map((g) => g.id)}
          strategy={verticalListSortingStrategy}
        >
          {groups.map((group, idx) => (
            <GroupSection key={group.id} group={group} colorIdx={idx} />
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
    </div>
  );
}
