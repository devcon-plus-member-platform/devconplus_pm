"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import type { Role } from "@/types";

interface Props {
  roles: Role[];
  onAdd: (fields: {
    full_name: string;
    email: string;
    role_id: string | null;
    telegram_username: string | null;
  }) => Promise<void>;
  onClose: () => void;
}

export default function AddContributorModal({ roles, onAdd, onClose }: Props) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState<string>("");
  const [telegram, setTelegram] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = fullName.trim().length > 0 && email.trim().length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      await onAdd({
        full_name: fullName.trim(),
        email: email.trim().toLowerCase(),
        role_id: roleId || null,
        telegram_username: telegram.trim().replace(/^@/, "") || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSaving(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Add Contributor">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Full Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Jane Doe"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Email <span className="text-red-400">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jane@example.com"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
          <select
            value={roleId}
            onChange={(e) => setRoleId(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300 bg-white"
          >
            <option value="">— No role —</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Telegram Username
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">@</span>
            <input
              type="text"
              value={telegram}
              onChange={(e) => setTelegram(e.target.value.replace(/^@/, ""))}
              placeholder="username"
              className="w-full text-sm border border-gray-200 rounded-lg pl-7 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-300"
            />
          </div>
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

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
            disabled={!canSubmit || saving}
            className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-40 font-medium"
          >
            {saving ? "Adding…" : "Add Contributor"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
