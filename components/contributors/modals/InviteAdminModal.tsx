"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";

interface Props {
  onInvite: (email: string) => Promise<{ alreadyAdmin?: boolean }>;
  onClose: () => void;
}

export default function InviteAdminModal({ onInvite, onClose }: Props) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = email.trim().length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSending(true);
    setError(null);
    try {
      await onInvite(email.trim().toLowerCase());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSending(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Invite Admin">
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-gray-500">
          They&apos;ll get an email with a button to create their account with a name and password. Admins can see every contributor&apos;s tasks and manage the team.
        </p>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Email <span className="text-red-400">*</span>
          </label>
          <input
            type="email"
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@devcon.ph"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
        </div>

        {error && <p className="text-xs text-accent-rose">{error}</p>}

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit || sending}
            className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-40 font-medium"
          >
            {sending ? "Sending…" : "Send Invite"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
