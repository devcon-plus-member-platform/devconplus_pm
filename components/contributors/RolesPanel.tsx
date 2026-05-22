"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import type { Role } from "@/types";

interface Props {
  roles: Role[];
  onRolesChange: (roles: Role[]) => void;
}

interface RoleForm {
  name: string;
  description: string;
  color: string;
}

const EMPTY_FORM: RoleForm = { name: "", description: "", color: "#6366f1" };

export default function RolesPanel({ roles, onRolesChange }: Props) {
  const supabase = createClient();
  const [form, setForm] = useState<RoleForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function startEdit(role: Role) {
    setEditingId(role.id);
    setForm({ name: role.name, description: role.description ?? "", color: role.color });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSaving(true);

    if (editingId) {
      const { data } = await supabase
        .from("roles")
        .update({ name: form.name.trim(), description: form.description.trim() || null, color: form.color })
        .eq("id", editingId)
        .select("*")
        .single();
      if (data) {
        onRolesChange(roles.map((r) => (r.id === editingId ? (data as Role) : r)));
      }
      setEditingId(null);
    } else {
      const { data } = await supabase
        .from("roles")
        .insert({ name: form.name.trim(), description: form.description.trim() || null, color: form.color })
        .select("*")
        .single();
      if (data) {
        onRolesChange([...roles, data as Role].sort((a, b) => a.name.localeCompare(b.name)));
      }
    }

    setForm(EMPTY_FORM);
    setSaving(false);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    await supabase.from("roles").delete().eq("id", id);
    onRolesChange(roles.filter((r) => r.id !== id));
    setDeletingId(null);
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-700">Roles</h2>
        <p className="text-xs text-gray-400 mt-0.5">Define contributor roles with colors</p>
      </div>

      {/* Role list */}
      <div className="flex-1 overflow-y-auto px-6 py-3 space-y-2">
        {roles.length === 0 && (
          <p className="text-xs text-gray-400 py-4 text-center">No roles yet.</p>
        )}
        {roles.map((role) => (
          <div
            key={role.id}
            className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-white hover:shadow-sm transition-shadow group"
          >
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: role.color }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-700 truncate">{role.name}</p>
              {role.description && (
                <p className="text-xs text-gray-400 truncate">{role.description}</p>
              )}
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <button
                onClick={() => startEdit(role)}
                className="px-2 py-0.5 text-xs text-brand-600 hover:bg-brand-50 rounded-md"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(role.id)}
                disabled={deletingId === role.id}
                className="px-2 py-0.5 text-xs text-gray-300 hover:text-red-500 rounded-md disabled:opacity-40"
              >
                {deletingId === role.id ? "…" : "Delete"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Form */}
      <div className="px-6 py-4 border-t border-gray-100 space-y-3">
        <p className="text-xs font-medium text-gray-500">
          {editingId ? "Edit role" : "Add new role"}
        </p>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={form.color}
            onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
            className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer shrink-0 p-0.5"
            title="Pick a color"
          />
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Role name"
            className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
        </div>
        <input
          type="text"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="Description (optional)"
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-300"
        />
        <div className="flex items-center gap-2">
          {editingId && (
            <button
              onClick={cancelEdit}
              className="px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!form.name.trim() || saving}
            className="px-3 py-1.5 text-xs bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-40 font-medium"
          >
            {saving ? "Saving…" : editingId ? "Save Changes" : "Add Role"}
          </button>
        </div>
      </div>
    </div>
  );
}
