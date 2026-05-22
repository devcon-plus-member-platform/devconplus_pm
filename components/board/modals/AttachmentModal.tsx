"use client";

import { useState, useEffect, useRef } from "react";
import Modal from "@/components/ui/Modal";
import { useBoardContext } from "../BoardContext";
import { formatDate } from "@/lib/utils";
import type { Task, TaskAttachment } from "@/types";

interface Props {
  task: Task;
  groupId: string;
  onClose: () => void;
}

const ALLOWED_TYPES = [
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
  "application/pdf", "application/zip", "application/x-zip-compressed",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];
const MAX_BYTES = 5 * 1024 * 1024;

export default function AttachmentModal({ task, groupId, onClose }: Props) {
  const { uploadAttachment, deleteAttachment, getSignedUrl } = useBoardContext();
  const fileRef = useRef<HTMLInputElement>(null);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const attachments = task.attachments ?? [];

  // Generate signed URLs for all attachments
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const entries = await Promise.all(
        attachments.map(async (a) => {
          const url = await getSignedUrl(a.file_url).catch(() => "");
          return [a.id, url] as [string, string];
        })
      );
      if (!cancelled) setSignedUrls(Object.fromEntries(entries));
    }
    if (attachments.length > 0) load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attachments.length]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) { setError("File type not allowed."); return; }
    if (file.size > MAX_BYTES) { setError("File exceeds 5 MB limit."); return; }

    setError(null);
    setUploading(true);
    try {
      await uploadAttachment(task.id, groupId, file);
    } catch {
      setError("Upload failed. Try again.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleDelete(a: TaskAttachment) {
    await deleteAttachment(a, task.id, groupId);
    setSignedUrls((prev) => {
      const next = { ...prev };
      delete next[a.id];
      return next;
    });
  }

  function fileIcon(name: string): string {
    const ext = name.split(".").pop()?.toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext ?? "")) return "🖼";
    if (ext === "pdf") return "📄";
    if (["zip", "gz"].includes(ext ?? "")) return "📦";
    if (["doc", "docx"].includes(ext ?? "")) return "📝";
    if (["xls", "xlsx"].includes(ext ?? "")) return "📊";
    if (["ppt", "pptx"].includes(ext ?? "")) return "📋";
    return "📎";
  }

  return (
    <Modal open onClose={onClose} title={`Attachments — ${task.title}`} className="max-w-lg">
      {/* Upload area */}
      <div
        onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed border-gray-200 rounded-xl p-5 text-center cursor-pointer hover:border-brand-300 hover:bg-brand-50/30 transition-colors mb-4"
      >
        <p className="text-sm text-gray-500">
          {uploading ? "Uploading…" : "Click to upload a file"}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Images, PDF, ZIP, Office docs · Max 5 MB
        </p>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept={ALLOWED_TYPES.join(",")}
          onChange={handleFile}
          disabled={uploading}
        />
      </div>

      {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

      {/* Attachment list */}
      {attachments.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">
          No attachments yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {attachments.map((a) => (
            <li
              key={a.id}
              className="flex items-center gap-3 p-2.5 rounded-lg border border-gray-100 hover:bg-gray-50 group/att"
            >
              <span className="text-xl shrink-0">{fileIcon(a.file_name)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 truncate font-medium">
                  {a.file_name}
                </p>
                <p className="text-xs text-gray-400">
                  {formatDate(a.uploaded_at)}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {signedUrls[a.id] ? (
                  <a
                    href={signedUrls[a.id]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-brand-600 hover:underline px-2 py-1"
                    download={a.file_name}
                  >
                    ↓ Download
                  </a>
                ) : (
                  <span className="text-xs text-gray-300 px-2 py-1">Loading…</span>
                )}
                <button
                  onClick={() => handleDelete(a)}
                  className="text-gray-300 hover:text-red-500 opacity-0 group-hover/att:opacity-100 transition-opacity text-xs px-1"
                  title="Delete"
                >
                  🗑
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
