"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase";
import AddContributorModal from "./modals/AddContributorModal";
import EditContributorModal from "./modals/EditContributorModal";
import RolesPanel from "./RolesPanel";
import Toast from "@/components/ui/Toast";
import { formatDate } from "@/lib/utils";
import type { Contributor, Role } from "@/types";

interface Props {
  initialContributors: Contributor[];
  initialRoles: Role[];
}

interface ToastState {
  message: string;
  type: "success" | "error";
}

export default function ContributorsClient({ initialContributors, initialRoles }: Props) {
  const supabase = createClient();
  const [contributors, setContributors] = useState<Contributor[]>(initialContributors);
  const [roles, setRoles] = useState<Role[]>(initialRoles);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Contributor | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ message, type });
  }

  async function handleAdd(fields: {
    full_name: string;
    email: string;
    role_id: string | null;
    telegram_username: string | null;
  }) {
    const { data, error } = await supabase
      .from("contributors")
      .insert(fields)
      .select("*, role:roles(id,name,description,color,created_at)")
      .single();

    if (error) throw new Error(error.message);

    const newContributor = data as Contributor;
    setContributors((prev) => [newContributor, ...prev]);
    setShowAdd(false);
    showToast(`${fields.full_name} added as contributor.`);

    // Send welcome email
    await fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "welcome_contributor",
        email: fields.email,
        name: fields.full_name,
      }),
    });
  }

  async function handleEdit(fields: {
    full_name: string;
    email: string;
    role_id: string | null;
    telegram_username: string | null;
  }) {
    if (!editing) return;

    const { data, error } = await supabase
      .from("contributors")
      .update(fields)
      .eq("id", editing.id)
      .select("*, role:roles(id,name,description,color,created_at)")
      .single();

    if (error) throw new Error(error.message);

    setContributors((prev) =>
      prev.map((c) => (c.id === editing.id ? (data as Contributor) : c))
    );
    setEditing(null);
    showToast("Contributor updated.");
  }

  async function handleRemove(contributor: Contributor) {
    const confirmed = window.confirm(
      `Remove ${contributor.full_name ?? contributor.email} from DEVCON+? They will lose access immediately.`
    );
    if (!confirmed) return;

    setRemovingId(contributor.id);
    await supabase
      .from("contributors")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", contributor.id);

    setContributors((prev) => prev.filter((c) => c.id !== contributor.id));
    setRemovingId(null);
    showToast(`${contributor.full_name ?? contributor.email} removed.`);
  }

  function getRoleForContributor(contributor: Contributor): Role | undefined {
    if (contributor.role) return contributor.role;
    if (contributor.role_id) return roles.find((r) => r.id === contributor.role_id);
    return undefined;
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div>
            <h1 className="text-lg font-semibold text-gray-800">Contributors</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {contributors.length} active member{contributors.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
          >
            + Add Contributor
          </button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          {contributors.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-60 text-gray-400 gap-3">
              <span className="text-4xl">👥</span>
              <p className="text-sm">No contributors yet.</p>
              <button
                onClick={() => setShowAdd(true)}
                className="text-brand-600 text-sm hover:underline font-medium"
              >
                Add the first contributor
              </button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 sticky top-0 bg-white z-10">
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">
                    Name
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">
                    Email
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">
                    Role
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">
                    Telegram
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">
                    Joined
                  </th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {contributors.map((c) => {
                  const role = getRoleForContributor(c);
                  return (
                    <tr key={c.id} className="hover:bg-gray-50/60 transition-colors group">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0"
                            style={{ backgroundColor: role?.color ?? "#94a3b8" }}
                          >
                            {(c.full_name ?? c.email)[0].toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-800 truncate">
                            {c.full_name ?? "—"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 truncate max-w-[200px]">
                        {c.email}
                      </td>
                      <td className="px-4 py-3">
                        {role ? (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
                            style={{ backgroundColor: role.color }}
                          >
                            {role.name}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {c.telegram_username ? (
                          <a
                            href={`https://t.me/${c.telegram_username}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-brand-600 hover:underline"
                          >
                            @{c.telegram_username}
                          </a>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {formatDate(c.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                          <button
                            onClick={() => setEditing(c)}
                            className="px-2.5 py-1 text-xs text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleRemove(c)}
                            disabled={removingId === c.id}
                            className="px-2.5 py-1 text-xs text-gray-300 hover:text-red-500 rounded-lg transition-colors disabled:opacity-40"
                          >
                            {removingId === c.id ? "…" : "Remove"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Roles sidebar */}
      <div className="w-72 border-l border-gray-200 flex flex-col shrink-0 overflow-hidden">
        <RolesPanel roles={roles} onRolesChange={setRoles} />
      </div>

      {/* Modals */}
      {showAdd && (
        <AddContributorModal
          roles={roles}
          onAdd={handleAdd}
          onClose={() => setShowAdd(false)}
        />
      )}
      {editing && (
        <EditContributorModal
          contributor={editing}
          roles={roles}
          onSave={handleEdit}
          onClose={() => setEditing(null)}
        />
      )}

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}
