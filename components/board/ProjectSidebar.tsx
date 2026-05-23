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
    <aside className="w-52 shrink-0 border-r border-gray-200 bg-gray-50/60 flex flex-col h-screen">
      <div className="px-3 pt-4 pb-3 border-b border-gray-200">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2.5 px-1">
          Projects
        </p>
        <div className="relative">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs pl-7 pr-2.5 py-1.5 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-300 transition-shadow placeholder-gray-400"
          />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {filtered.map((project) => (
          <button
            key={project.id}
            onClick={() => onSelect(project.id)}
            className={cn(
              "w-full flex items-center gap-2 text-left px-3 py-2 rounded-lg text-sm transition-all duration-150 group/project",
              selectedProjectId === project.id
                ? "bg-brand-100 text-brand-700 font-medium shadow-sm"
                : "text-gray-600 hover:bg-white hover:text-gray-900 hover:shadow-sm"
            )}
          >
            <svg
              className={cn(
                "w-3.5 h-3.5 shrink-0 transition-colors",
                selectedProjectId === project.id
                  ? "text-brand-500"
                  : "text-gray-300 group-hover/project:text-gray-400"
              )}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
            </svg>
            <span className="block truncate">{project.name}</span>
          </button>
        ))}

        {filtered.length === 0 && (
          <div className="text-center px-3 py-6">
            <svg className="w-6 h-6 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
            </svg>
            <p className="text-xs text-gray-400">No projects found</p>
          </div>
        )}
      </nav>

      <div className="px-3 py-3 border-t border-gray-200">
        <button
          onClick={onNewProject}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-brand-600 hover:bg-brand-50 hover:text-brand-700 rounded-lg transition-all duration-150 font-medium group/new"
        >
          <svg className="w-4 h-4 shrink-0 transition-transform duration-150 group-hover/new:scale-110" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Project
        </button>
      </div>
    </aside>
  );
}
