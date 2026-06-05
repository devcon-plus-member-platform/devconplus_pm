"use client";

import { useState } from "react";
import type { EssentialSection, EssentialEntry } from "@/types";
import EntryRow from "./EntryRow";

interface Props {
  section: EssentialSection;
  isPM: boolean;
  searchQuery: string;
  visibleEntries: EssentialEntry[];
  onEditSection: (s: EssentialSection) => void;
  onDeleteSection: (id: string) => void;
  onAddEntry: (sectionId: string) => void;
  onEditEntry: (e: EssentialEntry) => void;
  onDeleteEntry: (id: string, sectionId: string) => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}

export default function SectionCard({
  section,
  isPM,
  searchQuery,
  visibleEntries,
  onEditSection,
  onDeleteSection,
  onAddEntry,
  onEditEntry,
  onDeleteEntry,
  dragHandleProps,
}: Props) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Section header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-50">
        {/* Drag handle (PM only) */}
        {isPM && dragHandleProps && (
          <div {...dragHandleProps} className="cursor-grab text-gray-300 hover:text-gray-500 select-none" title="Drag to reorder">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 6h2v2H8zm6 0h2v2h-2zM8 11h2v2H8zm6 0h2v2h-2zM8 16h2v2H8zm6 0h2v2h-2z"/>
            </svg>
          </div>
        )}

        {/* Icon */}
        {section.icon && <span className="text-xl">{section.icon}</span>}

        {/* Title + description */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900">{section.title}</h3>
            <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
              {visibleEntries.length} {visibleEntries.length === 1 ? "entry" : "entries"}
            </span>
          </div>
          {section.description && (
            <p className="text-xs text-gray-400 truncate">{section.description}</p>
          )}
        </div>

        {/* PM controls */}
        {isPM && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onAddEntry(section.id)}
              className="text-xs text-brand-600 hover:bg-brand-50 px-2 py-1 rounded-lg"
            >
              + Add Entry
            </button>
            <button
              onClick={() => onEditSection(section)}
              className="text-xs text-gray-500 hover:bg-gray-100 px-2 py-1 rounded-lg"
            >
              Edit
            </button>
            <button
              onClick={() => { if (confirm(`Delete section "${section.title}" and all its entries?`)) onDeleteSection(section.id); }}
              className="text-xs text-red-500 hover:bg-red-50 px-2 py-1 rounded-lg"
            >
              Delete
            </button>
          </div>
        )}

        {/* Collapse chevron */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-gray-400 hover:text-gray-600 p-1"
        >
          <svg className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Entries table */}
      {expanded && (
        <div className="overflow-x-auto">
          {visibleEntries.length === 0 ? (
            <div className="px-4 py-6 text-center text-gray-400 text-xs">
              No entries yet.
              {isPM && (
                <button onClick={() => onAddEntry(section.id)} className="ml-1 text-brand-600 hover:underline">Add one</button>
              )}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-400">Label</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-400">Type</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-400">Value</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {visibleEntries.map((e) => (
                  <EntryRow
                    key={e.id}
                    entry={e}
                    isPM={isPM}
                    searchQuery={searchQuery}
                    onEdit={onEditEntry}
                    onDelete={(id) => onDeleteEntry(id, section.id)}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
