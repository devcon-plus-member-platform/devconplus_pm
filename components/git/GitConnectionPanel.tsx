"use client";

import { useState } from "react";
import type { GitHubConnection, Project } from "@/types";

interface Props {
  connections: GitHubConnection[];
  projects: Project[];
  onAdd: (repoFullName: string, projectId: string | null, secret: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
}

function generateSecret(): string {
  const arr = new Uint8Array(20);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("");
}

type Step = "list" | "add" | "success";

export default function GitConnectionPanel({ connections, projects, onAdd, onDelete, onClose }: Props) {
  const [step, setStep] = useState<Step>("list");
  const [repoName, setRepoName] = useState("");
  const [projectId, setProjectId] = useState("");
  const [secret, setSecret] = useState(() => generateSecret());
  const [saving, setSaving] = useState(false);
  const [savedSecret, setSavedSecret] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [revealSecret, setRevealSecret] = useState<Record<string, boolean>>({});

  const webhookUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/webhooks/github`
      : "/api/webhooks/github";

  async function copy(text: string, field: string) {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }

  async function handleSave() {
    if (!repoName.trim()) return;
    setSaving(true);
    await onAdd(repoName.trim(), projectId || null, secret);
    setSavedSecret(secret);
    setSaving(false);
    setStep("success");
  }

  function resetAdd() {
    setRepoName("");
    setProjectId("");
    setSecret(generateSecret());
    setStep("add");
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/20 backdrop-blur-[1px] z-20" onClick={onClose} />
      <aside className="fixed inset-y-0 right-0 w-[520px] max-w-full bg-white shadow-2xl border-l border-gray-100 flex flex-col z-30">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0 gap-3">
          <div className="flex items-center gap-2">
            {step !== "list" && (
              <button
                onClick={() => setStep("list")}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
              </button>
            )}
            <h2 className="text-sm font-semibold text-gray-900">
              {step === "list" ? "GitHub Connections" : step === "add" ? "Connect Repository" : "Webhook Setup"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {/* ── LIST ── */}
          {step === "list" && (
            <div className="space-y-4">
              <button
                onClick={resetAdd}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Connect Repository
              </button>

              {connections.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">
                  <svg className="w-10 h-10 mx-auto mb-3 text-gray-200" fill="none" stroke="currentColor" strokeWidth={1.25} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                  </svg>
                  No repositories connected yet
                </div>
              ) : (
                <div className="space-y-3">
                  {connections.map(conn => (
                    <div key={conn.id} className="bg-gray-50 rounded-xl border border-gray-100 p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-gray-900 font-mono">{conn.repo_full_name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {conn.project ? `Linked to ${conn.project.name}` : "No project linked"}
                            {" · "}Connected {new Date(conn.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        {confirmDeleteId === conn.id ? (
                          <div className="flex gap-2 shrink-0">
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="text-xs px-2.5 py-1 text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => { onDelete(conn.id); setConfirmDeleteId(null); }}
                              className="text-xs px-2.5 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700"
                            >
                              Delete
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(conn.id)}
                            className="text-xs text-red-500 hover:text-red-700 shrink-0 px-2 py-1 rounded-lg hover:bg-red-50 transition-colors"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      {/* Webhook URL */}
                      <div>
                        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1">Webhook URL</p>
                        <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-gray-200">
                          <code className="text-xs text-gray-600 flex-1 truncate">{webhookUrl}</code>
                          <button
                            onClick={() => copy(webhookUrl, `url-${conn.id}`)}
                            className="text-xs text-brand-600 hover:text-brand-700 shrink-0 font-medium"
                          >
                            {copiedField === `url-${conn.id}` ? "Copied!" : "Copy"}
                          </button>
                        </div>
                      </div>

                      {/* Secret */}
                      <div>
                        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1">Webhook Secret</p>
                        <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-gray-200">
                          <code className="text-xs text-gray-600 flex-1 truncate font-mono">
                            {revealSecret[conn.id] ? conn.webhook_secret : "•".repeat(20)}
                          </code>
                          <button
                            onClick={() => setRevealSecret(p => ({ ...p, [conn.id]: !p[conn.id] }))}
                            className="text-xs text-gray-400 hover:text-gray-600 shrink-0"
                          >
                            {revealSecret[conn.id] ? "Hide" : "Show"}
                          </button>
                          <button
                            onClick={() => copy(conn.webhook_secret, `secret-${conn.id}`)}
                            className="text-xs text-brand-600 hover:text-brand-700 shrink-0 font-medium"
                          >
                            {copiedField === `secret-${conn.id}` ? "Copied!" : "Copy"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── ADD FORM ── */}
          {step === "add" && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Repository <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="owner/repository"
                  value={repoName}
                  onChange={e => setRepoName(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-transparent"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Exactly as it appears on GitHub, e.g. <code className="font-mono bg-gray-100 px-1 rounded">octocat/hello-world</code>
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Link to Project <span className="text-gray-400">(optional)</span>
                </label>
                <select
                  value={projectId}
                  onChange={e => setProjectId(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-300"
                >
                  <option value="">— No project —</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Webhook Secret</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={secret}
                    readOnly
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-mono bg-gray-50 text-gray-600"
                  />
                  <button
                    onClick={() => setSecret(generateSecret())}
                    className="px-3 py-2 text-xs text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 whitespace-nowrap transition-colors"
                  >
                    Regenerate
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Auto-generated — you&apos;ll paste this into your GitHub webhook settings
                </p>
              </div>

              <button
                onClick={handleSave}
                disabled={!repoName.trim() || saving}
                className="w-full py-2.5 bg-brand-600 text-white text-sm font-medium rounded-xl hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? "Saving..." : "Save & Get Setup Instructions"}
              </button>
            </div>
          )}

          {/* ── SUCCESS / INSTRUCTIONS ── */}
          {step === "success" && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-100 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-green-800">Repository connected!</p>
                  <p className="text-xs text-green-600 mt-0.5">Now configure the webhook in your GitHub repository.</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-4">Configure GitHub Webhook</h3>
                <ol className="space-y-5 text-sm text-gray-600">
                  <li className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-brand-600 text-white text-xs flex items-center justify-center shrink-0 font-bold mt-0.5">1</span>
                    <span>Go to your GitHub repo → <strong>Settings</strong> → <strong>Webhooks</strong> → <strong>Add webhook</strong></span>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-brand-600 text-white text-xs flex items-center justify-center shrink-0 font-bold mt-0.5">2</span>
                    <div className="flex-1 space-y-2">
                      <p>Set <strong>Payload URL</strong>:</p>
                      <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
                        <code className="text-xs text-gray-700 flex-1 break-all">{webhookUrl}</code>
                        <button
                          onClick={() => copy(webhookUrl, "setup-url")}
                          className="text-xs text-brand-600 hover:text-brand-700 font-medium shrink-0"
                        >
                          {copiedField === "setup-url" ? "Copied!" : "Copy"}
                        </button>
                      </div>
                      <p className="text-xs text-amber-600 flex items-center gap-1">
                        <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                        Use your <strong>deployed app URL</strong>, not localhost
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-brand-600 text-white text-xs flex items-center justify-center shrink-0 font-bold mt-0.5">3</span>
                    <div className="flex-1 space-y-2">
                      <p>Set <strong>Content type</strong> to <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">application/json</code></p>
                      <p>Set <strong>Secret</strong>:</p>
                      <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
                        <code className="text-xs text-gray-700 flex-1 break-all font-mono">{savedSecret}</code>
                        <button
                          onClick={() => copy(savedSecret, "setup-secret")}
                          className="text-xs text-brand-600 hover:text-brand-700 font-medium shrink-0"
                        >
                          {copiedField === "setup-secret" ? "Copied!" : "Copy"}
                        </button>
                      </div>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-brand-600 text-white text-xs flex items-center justify-center shrink-0 font-bold mt-0.5">4</span>
                    <div>
                      <p className="mb-1">Under <strong>Which events?</strong> select <strong>Let me select individual events</strong></p>
                      <p>Check: <strong>Pull requests</strong> and <strong>Pushes</strong></p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-brand-600 text-white text-xs flex items-center justify-center shrink-0 font-bold mt-0.5">5</span>
                    <span>Click <strong>Add webhook</strong>. GitHub will send a ping event — after that, PR and push events will appear here in real time.</span>
                  </li>
                </ol>
              </div>

              <button
                onClick={() => setStep("list")}
                className="w-full py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-200 transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
