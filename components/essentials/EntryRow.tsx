"use client";

import { useState } from "react";
import type { EssentialEntry } from "@/types";

interface Props {
  entry: EssentialEntry;
  isPM: boolean;
  searchQuery: string;
  onEdit: (e: EssentialEntry) => void;
  onDelete: (id: string) => void;
}

const TYPE_BADGE: Record<string, string> = {
  text:       "bg-gray-100 text-gray-600",
  link:       "bg-blue-100 text-blue-700",
  code:       "bg-purple-100 text-purple-700",
  file:       "bg-amber-100 text-amber-700",
  email:      "bg-teal-100 text-teal-700",
  credential: "bg-red-100 text-red-600",
};

function highlight(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 rounded-sm">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="ml-1 text-[10px] text-gray-400 hover:text-gray-600 underline"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

export default function EntryRow({ entry: e, isPM, searchQuery, onEdit, onDelete }: Props) {
  const [revealed, setRevealed] = useState(false);
  const [downloading, setDownloading] = useState(false);

  async function handleFileDownload() {
    setDownloading(true);
    const res = await fetch(`/api/essentials/entries/${e.id}/signed-url`);
    const json = await res.json();
    if (json.signedUrl) {
      window.open(json.signedUrl, "_blank");
    }
    setDownloading(false);
  }

  function renderValue() {
    const val = e.value_text ?? "";
    const hl = highlight(val, searchQuery);

    switch (e.data_type) {
      case "text":
        return <p className="text-sm text-gray-700 whitespace-pre-wrap">{hl}</p>;

      case "link":
        return (
          <a
            href={val}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline flex items-center gap-1 break-all"
          >
            {hl}
            <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
          </a>
        );

      case "code":
        return (
          <div className="relative">
            <code className="block bg-gray-50 border border-gray-100 rounded px-3 py-2 text-xs font-mono text-gray-800 whitespace-pre-wrap">{hl}</code>
            <CopyButton value={val} />
          </div>
        );

      case "file":
        return (
          <button
            onClick={handleFileDownload}
            disabled={downloading}
            className="flex items-center gap-1.5 text-sm text-amber-700 hover:text-amber-800 disabled:opacity-60"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            {e.value_file_name ?? "Download file"}
            {downloading && " …"}
          </button>
        );

      case "email":
        return (
          <a href={`mailto:${val}`} className="text-sm text-teal-600 hover:underline flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
            {hl}
          </a>
        );

      case "credential":
        if (!isPM) {
          return (
            <span className="text-sm text-gray-400 flex items-center gap-1" title="Ask your PM for this value.">
              ••••••••
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </span>
          );
        }
        return (
          <div className="flex items-center gap-2">
            <code className="text-sm font-mono text-gray-800">
              {revealed ? val : "••••••••"}
            </code>
            <button onClick={() => setRevealed((v) => !v)} className="text-[10px] text-gray-400 hover:text-gray-600 underline">
              {revealed ? "Hide" : "Reveal"}
            </button>
            <CopyButton value={val} />
          </div>
        );

      default:
        return <span className="text-sm text-gray-700">{hl}</span>;
    }
  }

  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
      <td className="px-4 py-2.5">
        <span className="text-sm font-medium text-gray-800">{highlight(e.label, searchQuery)}</span>
      </td>
      <td className="px-4 py-2.5">
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${TYPE_BADGE[e.data_type] ?? TYPE_BADGE.text}`}>
          {e.data_type}
        </span>
        {e.is_sensitive && <span className="ml-1 text-[10px] text-red-400">sensitive</span>}
      </td>
      <td className="px-4 py-2.5 max-w-xs">
        {renderValue()}
        {e.note && (
          <p className="text-[11px] text-gray-400 italic mt-0.5">{highlight(e.note, searchQuery)}</p>
        )}
      </td>
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-1">
          <button onClick={() => onEdit(e)} className="text-xs text-brand-600 hover:bg-brand-50 px-2 py-1 rounded-lg">Edit</button>
          <button onClick={() => { if (confirm("Delete this entry?")) onDelete(e.id); }} className="text-xs text-red-500 hover:bg-red-50 px-2 py-1 rounded-lg">Delete</button>
        </div>
      </td>
    </tr>
  );
}
