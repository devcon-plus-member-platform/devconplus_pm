"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase";
import { useAuthStore } from "@/lib/store";
import { isAdmin } from "@/lib/permissions";
import AddContributorModal from "./modals/AddContributorModal";
import EditContributorModal from "./modals/EditContributorModal";
import InviteAdminModal from "./modals/InviteAdminModal";
import RolesPanel from "./RolesPanel";
import Toast from "@/components/ui/Toast";
import StatCard from "@/components/ui/StatCard";
import Sparkline from "@/components/ui/Sparkline";
import StatusPill from "@/components/ui/StatusPill";
import { formatDate } from "@/lib/utils";
import type { Contributor, Role, Task, GitHubEvent } from "@/types";

interface Props {
  initialContributors: Contributor[];
  initialDeletedContributors: Contributor[];
  initialRoles: Role[];
  tasks: Pick<Task, "id" | "assignee_id" | "assignee_ids" | "status">[];
  githubEvents: Pick<GitHubEvent, "event_type" | "author_login" | "created_at">[];
}

interface ToastState {
  message: string;
  type: "success" | "error";
}

const PERSON_PALETTE = ["#3b5ee8", "#8b5cf6", "#f59e0b", "#ef4444", "#10b981", "#ec4899", "#06b6d4", "#f97316"];

function personColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) % PERSON_PALETTE.length;
  return PERSON_PALETTE[hash];
}

// GitHub events aren't linked to a contributor id — approximate the match by
// comparing the PR/commit author login against the contributor's email
// local-part or their full name with spaces stripped.
function matchesLogin(contributor: Contributor, login: string | null): boolean {
  if (!login) return false;
  const loginLower = login.toLowerCase();
  const emailLocal = contributor.email.split("@")[0].toLowerCase();
  const nameSlug = (contributor.full_name ?? "").toLowerCase().replace(/\s+/g, "");
  return loginLower === emailLocal || (nameSlug.length > 0 && loginLower === nameSlug);
}

const SPARKLINE_DAYS = 7;

export default function ContributorsClient({ initialContributors, initialDeletedContributors, initialRoles, tasks, githubEvents }: Props) {
  const supabase = createClient();
  const [contributors, setContributors] = useState<Contributor[]>(initialContributors);
  const [deletedContributors, setDeletedContributors] = useState<Contributor[]>(initialDeletedContributors);
  const [roles, setRoles] = useState<Role[]>(initialRoles);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Contributor | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);
  const [showInviteAdmin, setShowInviteAdmin] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const currentContributor = useAuthStore((s) => s.contributor);
  const canInviteAdmins = isAdmin(currentContributor);

  function showToast(message: string, type: "success" | "error" = "success") {
    setToast({ message, type });
  }

  async function handleInviteAdmin(email: string): Promise<{ alreadyAdmin?: boolean }> {
    const res = await fetch("/api/admin/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const json = await res.json();
    if (!res.ok || json.error) {
      throw new Error(json.error ?? "Failed to send invite.");
    }
    setShowInviteAdmin(false);
    if (json.alreadyAdmin) {
      showToast(`${email} is already an admin.`, "error");
    } else {
      showToast(`Admin invite sent to ${email}.`);
    }
    return json;
  }

  const contributorStats = useMemo(() => {
    const dayBuckets = Array.from({ length: SPARKLINE_DAYS }, (_, i) => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - (SPARKLINE_DAYS - 1 - i));
      return d;
    });

    return contributors.map((c) => {
      const taskCount = tasks.filter((t) =>
        t.assignee_ids?.length ? t.assignee_ids.includes(c.id) : t.assignee_id === c.id
      ).length;

      const matchedEvents = githubEvents.filter((e) => matchesLogin(c, e.author_login));
      const commits = matchedEvents.filter((e) => e.event_type === "push").length;
      const prs = matchedEvents.filter((e) => e.event_type === "pull_request").length;

      const sparkline = dayBuckets.map((day) => {
        const next = new Date(day);
        next.setDate(day.getDate() + 1);
        return matchedEvents.filter((e) => {
          const t = new Date(e.created_at);
          return t >= day && t < next;
        }).length;
      });

      const lastActive = matchedEvents[0]?.created_at;
      const isActive = !!lastActive && Date.now() - new Date(lastActive).getTime() < 14 * 24 * 60 * 60 * 1000;

      return { contributor: c, taskCount, commits, prs, sparkline, isActive };
    });
  }, [contributors, tasks, githubEvents]);

  const totals = useMemo(() => {
    const commits = contributorStats.reduce((sum, s) => sum + s.commits, 0);
    const prs = contributorStats.reduce((sum, s) => sum + s.prs, 0);
    return { contributors: contributors.length, commits, prs, tasks: tasks.length };
  }, [contributorStats, contributors.length, tasks.length]);

  const maxShare = Math.max(1, ...contributorStats.map((s) => s.commits + s.prs));

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

    // Create Supabase Auth account so they can log in and write to the board
    await fetch("/api/contributors/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: fields.email }),
    });

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

  async function handleRestore(contributor: Contributor) {
    setRestoringId(contributor.id);
    const { error } = await supabase
      .from("contributors")
      .update({ deleted_at: null })
      .eq("id", contributor.id);

    if (error) {
      showToast("Failed to restore contributor.", "error");
    } else {
      setDeletedContributors((prev) => prev.filter((c) => c.id !== contributor.id));
      setContributors((prev) => [{ ...contributor, deleted_at: null }, ...prev]);
      showToast(`${contributor.full_name ?? contributor.email} restored.`);
    }
    setRestoringId(null);
  }

  async function handlePermanentDelete(contributor: Contributor) {
    const confirmed = window.confirm(
      `Permanently delete ${contributor.full_name ?? contributor.email}?\n\nThis removes them from the contributors list AND revokes their login. This cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingId(contributor.id);
    const res = await fetch(`/api/contributors/${contributor.id}`, { method: "DELETE" });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      showToast(body.error ?? "Failed to delete contributor.", "error");
    } else {
      setDeletedContributors((prev) => prev.filter((c) => c.id !== contributor.id));
      showToast(`${contributor.full_name ?? contributor.email} permanently deleted.`);
    }
    setDeletingId(null);
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
          <div className="flex items-center gap-2">
            {canInviteAdmins && (
              <button
                onClick={() => setShowInviteAdmin(true)}
                className="px-4 py-2 text-brand-600 border border-brand-200 text-sm font-medium rounded-lg hover:bg-brand-50 transition-colors"
              >
                + Invite Admin
              </button>
            )}
            <button
              onClick={() => setShowAdd(true)}
              className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
            >
              + Add Contributor
            </button>
          </div>
        </div>

        {/* Stat strip */}
        {contributors.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 py-4 bg-surface border-b border-surface-border shrink-0">
            <StatCard label="Contributors" value={totals.contributors} accent="#3b5ee8" />
            <StatCard label="Commits" value={totals.commits} accent="#10b981" />
            <StatCard label="Pull Requests" value={totals.prs} accent="#8b5cf6" />
            <StatCard label="Tasks" value={totals.tasks} accent="#f59e0b" />
          </div>
        )}

        {/* Card grid */}
        <div className="flex-1 overflow-y-auto p-6">
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
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {contributorStats.map(({ contributor: c, taskCount, commits, prs, sparkline, isActive }) => {
                const role = getRoleForContributor(c);
                const ringColor = role?.color ?? personColor(c.id);
                const share = Math.round(((commits + prs) / maxShare) * 100);
                return (
                  <div
                    key={c.id}
                    className="bg-white border border-surface-border rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow duration-150 border-t-[3px] group/card"
                    style={{ borderTopColor: ringColor }}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div
                        className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 ring-2"
                        style={{ backgroundColor: ringColor, boxShadow: `0 0 0 2px ${ringColor}33` }}
                      >
                        {(c.full_name ?? c.email)[0].toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900 truncate">{c.full_name ?? c.email}</p>
                        <p className="text-xs text-gray-400 truncate">{c.email}</p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={() => setEditing(c)}
                          className="p-1 text-xs text-brand-600 hover:bg-brand-50 rounded-md transition-colors"
                          title="Edit"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleRemove(c)}
                          disabled={removingId === c.id}
                          className="p-1 text-xs text-gray-300 hover:text-accent-rose rounded-md transition-colors disabled:opacity-40"
                          title="Remove"
                        >
                          {removingId === c.id ? "…" : "Remove"}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap mb-3">
                      {c.is_admin && (
                        <StatusPill
                          label="Admin"
                          dot={false}
                          color={{ dot: "#3b5ee8", bg: "bg-brand-50", fg: "text-brand-700" }}
                        />
                      )}
                      {role ? (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
                          style={{ backgroundColor: role.color }}
                        >
                          {role.name}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-300">No role</span>
                      )}
                      <StatusPill
                        label={isActive ? "Active" : "Away"}
                        color={isActive ? { dot: "#10b981", bg: "bg-emerald-100", fg: "text-emerald-700" } : { dot: "#9ca3af", bg: "bg-gray-100", fg: "text-gray-500" }}
                      />
                    </div>

                    {/* 3-up stat block */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="bg-gray-50 rounded-lg px-2 py-2 text-center">
                        <p className="text-sm font-bold text-gray-800">{commits}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">Commits</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg px-2 py-2 text-center">
                        <p className="text-sm font-bold text-gray-800">{prs}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">PRs</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg px-2 py-2 text-center">
                        <p className="text-sm font-bold text-gray-800">{taskCount}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">Tasks</p>
                      </div>
                    </div>

                    {/* Sparkline + share */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex-1">
                        <Sparkline data={sparkline} color={ringColor} height={20} />
                      </div>
                      <span className="text-[10px] text-gray-400 font-medium shrink-0">{share}% share</span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-50">
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
                        <span>No Telegram</span>
                      )}
                      <span>Joined {formatDate(c.created_at)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Deleted contributors section */}
        {deletedContributors.length > 0 && (
        <div className="border-t border-gray-100 shrink-0">
          <button
            onClick={() => setShowDeleted((v) => !v)}
            className="w-full flex items-center gap-2 px-6 py-3 text-xs font-medium text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <svg
              className="w-3.5 h-3.5 transition-transform duration-200"
              style={{ transform: showDeleted ? "rotate(0deg)" : "rotate(-90deg)" }}
              fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
            Deleted contributors ({deletedContributors.length})
          </button>

          {showDeleted && (
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-50">
                {deletedContributors.map((c) => {
                  const role = getRoleForContributor(c);
                  return (
                    <tr key={c.id} className="hover:bg-red-50/30 transition-colors group opacity-60">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0 grayscale"
                            style={{ backgroundColor: role?.color ?? "#94a3b8" }}
                          >
                            {(c.full_name ?? c.email)[0].toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-500 truncate line-through">
                            {c.full_name ?? "—"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-400 truncate max-w-[200px]">{c.email}</td>
                      <td className="px-4 py-3">
                        {role ? (
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white opacity-50"
                            style={{ backgroundColor: role.color }}
                          >
                            {role.name}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-300">{c.telegram_username ? `@${c.telegram_username}` : "—"}</td>
                      <td className="px-4 py-3 text-xs text-gray-300">{c.deleted_at ? formatDate(c.deleted_at) : "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                          <button
                            onClick={() => handleRestore(c)}
                            disabled={restoringId === c.id}
                            className="px-2.5 py-1 text-xs text-brand-600 hover:bg-brand-50 rounded-lg transition-colors disabled:opacity-40"
                          >
                            {restoringId === c.id ? "…" : "Restore"}
                          </button>
                          <button
                            onClick={() => handlePermanentDelete(c)}
                            disabled={deletingId === c.id}
                            className="px-2.5 py-1 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
                          >
                            {deletingId === c.id ? "…" : "Delete Forever"}
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
        )}
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
      {showInviteAdmin && (
        <InviteAdminModal
          onInvite={handleInviteAdmin}
          onClose={() => setShowInviteAdmin(false)}
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
