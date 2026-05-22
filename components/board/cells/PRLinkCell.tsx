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
          className="w-full text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-300"
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
            className="text-xs text-brand-600 hover:underline truncate max-w-[130px] block"
            title={link}
          >
            🔗 {new URL(link).hostname.replace("www.", "")}
          </a>
          <button
            onClick={startEdit}
            className="text-gray-300 hover:text-gray-500 text-xs shrink-0"
            title="Edit"
          >
            ✎
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
