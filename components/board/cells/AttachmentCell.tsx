"use client";

import { useRef, useState } from "react";
import { useBoardContext } from "../BoardContext";
import AttachmentModal from "../modals/AttachmentModal";
import type { Task } from "@/types";

interface Props {
  task: Task;
  groupId: string;
}

const ALLOWED_TYPES = [
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml",
  "application/pdf", "application/zip", "application/x-zip-compressed",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export default function AttachmentCell({ task, groupId }: Props) {
  const { uploadAttachment } = useBoardContext();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const count = (task.attachments ?? []).length;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadError("File type not allowed.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setUploadError("File exceeds 5 MB limit.");
      return;
    }

    setUploadError(null);
    setUploading(true);
    try {
      await uploadAttachment(task.id, groupId, file);
    } catch {
      setUploadError("Upload failed. Try again.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <td className="px-3 py-2">
      <div className="flex items-center gap-1">
        {/* Open attachment list */}
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-brand-600 hover:bg-gray-50 px-1.5 py-1 rounded-md transition-colors"
          title="View attachments"
        >
          <span>📎</span>
          {count > 0 && (
            <span className="bg-brand-100 text-brand-700 text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none">
              {count}
            </span>
          )}
        </button>

        {/* Upload trigger */}
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="text-xs text-gray-300 hover:text-brand-500 disabled:opacity-40 transition-colors px-1"
          title="Upload file"
        >
          {uploading ? "↑" : "+"}
        </button>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept={ALLOWED_TYPES.join(",")}
          onChange={handleFileChange}
        />
      </div>

      {uploadError && (
        <p className="text-[10px] text-red-500 mt-0.5 leading-tight">{uploadError}</p>
      )}

      {showModal && (
        <AttachmentModal
          task={task}
          groupId={groupId}
          onClose={() => setShowModal(false)}
        />
      )}
    </td>
  );
}
