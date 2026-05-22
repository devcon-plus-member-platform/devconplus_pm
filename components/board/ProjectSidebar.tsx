"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Project } from "@/types";

interface Props {
  projects: Project[];
  selectedProjectId: string | null;
  onSelect: (id: string) => void;
  onNewProject: () => void;
}

export default function ProjectSidebar({
  projects,
  selectedProjectId,
  onSelect,
  onNewProject,
}: Props) {
  const [search, setSearch] = useState("");

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <aside className="w-52 shrink-0 border-r border-gray-200 bg-gray-50 flex flex-col h-screen">
      <div className="px-3 py-3 border-b border-gray-200">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          Projects
        </p>
        <input
          type="text"
          placeholder="Search…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-brand-400"
        />
      </div>

      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {filtered.map((project) => (
          <button
            key={project.id}
            onClick={() => onSelect(project.id)}
            className={cn(
              "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors group",
              selectedProjectId === project.id
                ? "bg-brand-100 text-brand-700 font-medium"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            )}
          >
            <span className="block truncate">{project.name}</span>
          </button>
        ))}

        {filtered.length === 0 && (
          <p className="text-xs text-gray-400 px-3 py-4 text-center">
            No projects found
          </p>
        )}
      </nav>

      <div className="px-3 py-3 border-t border-gray-200">
        <button
          onClick={onNewProject}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-brand-600 hover:bg-brand-50 rounded-lg transition-colors font-medium"
        >
          <span className="text-base leading-none">+</span>
          New Project
        </button>
      </div>
    </aside>
  );
}
