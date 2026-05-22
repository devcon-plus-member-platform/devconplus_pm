"use client";

import { useState } from "react";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useBoardContext } from "./BoardContext";
import GroupSection from "./GroupSection";
import type { Project } from "@/types";

interface Props {
  project: Project;
  loading: boolean;
}

export default function ProjectBoard({ project, loading }: Props) {
  const { groups, addGroup } = useBoardContext();
  const [newGroupName, setNewGroupName] = useState("");
  const [addingGroup, setAddingGroup] = useState(false);

  async function handleAddGroup(e: React.FormEvent) {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    await addGroup(newGroupName.trim());
    setNewGroupName("");
    setAddingGroup(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        Loading board…
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Board header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
        <div>
          <h2 className="text-lg font-semibold text-gray-800 leading-tight">
            {project.name}
          </h2>
          {project.description && (
            <p className="text-xs text-gray-400 mt-0.5">{project.description}</p>
          )}
        </div>
        <button
          onClick={() => setAddingGroup(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-brand-600 hover:bg-brand-50 border border-brand-200 rounded-lg transition-colors font-medium"
        >
          <span className="text-base leading-none">+</span>
          Add Group
        </button>
      </div>

      {/* Scrollable board area */}
      <div className="flex-1 overflow-y-auto overflow-x-auto px-6 py-4 space-y-4">
        <SortableContext
          items={groups.map((g) => g.id)}
          strategy={verticalListSortingStrategy}
        >
          {groups.map((group) => (
            <GroupSection key={group.id} group={group} />
          ))}
        </SortableContext>

        {groups.length === 0 && !addingGroup && (
          <div className="text-center py-16 text-gray-400 text-sm">
            <p className="mb-3">No groups yet. Groups are like sprints or feature areas.</p>
            <button
              onClick={() => setAddingGroup(true)}
              className="text-brand-600 hover:underline font-medium"
            >
              + Add your first group
            </button>
          </div>
        )}

        {/* Inline new-group form */}
        {addingGroup && (
          <form
            onSubmit={handleAddGroup}
            className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3"
          >
            <input
              autoFocus
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Group name (e.g. Batch 1, Sprint 2)…"
              className="flex-1 text-sm bg-transparent focus:outline-none placeholder-gray-400"
            />
            <button
              type="submit"
              disabled={!newGroupName.trim()}
              className="px-3 py-1 text-sm bg-brand-600 text-white rounded-lg disabled:opacity-50"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setAddingGroup(false);
                setNewGroupName("");
              }}
              className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
