"use client";

import { useState, useRef } from "react";
import type { Task } from "@/types";

function isValidUrl(str: string): boolean {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

interface Props {
  task: Task;
  onUpdate: (updates: Partial<Task>) => void;
}

export default function PRLinkCell({ task, onUpdate }: Props) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(task.pr_link ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    setVal(task.pr_link ?? "");
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 10);
  }

  function save() {
    setEditing(false);
    const trimmed = val.trim();
    if (trimmed !== (task.pr_link ?? "")) {
      onUpdate({ pr_link: trimmed || null });
    }
  }

  if (editing) {
    return (
      <td className="px-3 py-2">
        <input
          ref={inputRef}
          type="url"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") { setEditing(false); setVal(task.pr_link ?? ""); }
          }}
          placeholder="https://github.com/…"
          className="w-full text-xs border border-gray-200 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-400/30 focus:border-brand-300 transition-shadow"
        />
      </td>
    );
  }

  const link = task.pr_link;
  const valid = link ? isValidUrl(link) : false;

  return (
    <td className="px-3 py-2">
      {valid && link ? (
        <div className="flex items-center gap-1">
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 hover:underline truncate max-w-[110px]"
            title={link}
          >
            <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
            </svg>
            <span className="truncate">{new URL(link).hostname.replace("www.", "")}</span>
          </a>
          <button
            onClick={startEdit}
            className="text-gray-300 hover:text-gray-600 shrink-0 p-0.5 rounded hover:bg-gray-100 transition-colors"
            title="Edit link"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
            </svg>
          </button>
        </div>
      ) : (
        <button
          onClick={startEdit}
          className="text-xs text-gray-300 italic hover:text-brand-600 hover:bg-gray-50 px-2 py-1 rounded-md transition-colors w-full text-left"
        >
          {link ? (
            <span className="text-gray-500 not-italic">{link}</span>
          ) : (
            "Add PR link"
          )}
        </button>
      )}
    </td>
  );
}
