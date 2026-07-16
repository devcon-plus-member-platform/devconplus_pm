"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useAuthStore } from "@/lib/store";
import type { Contributor } from "@/types";

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ) : (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  );
}

function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? "text" : "password"}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3.5 py-2.5 pr-10 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 text-sm transition-shadow shadow-sm placeholder-gray-400"
        placeholder={placeholder ?? "••••••••"}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
        tabIndex={-1}
      >
        <EyeIcon open={show} />
      </button>
    </div>
  );
}

type ViewState = "loading" | "invalid" | "form" | "done";

export default function AcceptAdminInvitePage() {
  return (
    <Suspense fallback={null}>
      <AcceptAdminInviteForm />
    </Suspense>
  );
}

function AcceptAdminInviteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const setContributor = useAuthStore((s) => s.setContributor);
  const setGuestEmail = useAuthStore((s) => s.setGuestEmail);

  const [view, setView] = useState<ViewState>("loading");
  const [email, setEmail] = useState("");
  const [invalidReason, setInvalidReason] = useState("");

  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) {
      setInvalidReason("This invite link is missing a token.");
      setView("invalid");
      return;
    }
    fetch(`/api/admin/accept-invite?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) {
          setInvalidReason(json.error);
          setView("invalid");
        } else {
          setEmail(json.email);
          setView("form");
        }
      })
      .catch(() => {
        setInvalidReason("Something went wrong validating this invite.");
        setView("invalid");
      });
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError("Full name is required.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);

    const res = await fetch("/api/admin/accept-invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, full_name: fullName.trim(), password }),
    });
    const json = await res.json();

    if (!res.ok || json.error) {
      setError(json.error ?? "Failed to create your account.");
      setSubmitting(false);
      return;
    }

    // Sign in immediately with the password just set.
    const supabase = createClient();
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError || !authData.user) {
      // Account was created successfully — just send them to sign in manually.
      setView("done");
      setSubmitting(false);
      return;
    }

    localStorage.removeItem("devcon-no-remember");
    sessionStorage.setItem("devcon-session-alive", "1");

    const { data: contributor } = await supabase
      .from("contributors")
      .select("*, role:roles(*)")
      .eq("email", authData.user.email!)
      .is("deleted_at", null)
      .single();

    if (contributor) {
      setGuestEmail(null);
      setContributor(contributor as Contributor);
    }

    router.push("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            </svg>
          </div>
          <span className="text-sm font-bold text-brand-900 tracking-tight">DEVCON+</span>
        </div>

        {view === "loading" && (
          <div className="text-center text-sm text-gray-400 flex items-center justify-center gap-2">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Validating your invite…
          </div>
        )}

        {view === "invalid" && (
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto mb-5">
              <svg className="w-7 h-7 text-accent-rose" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Invite not valid</h2>
            <p className="text-sm text-gray-500 mb-6">{invalidReason}</p>
            <a href="/login" className="text-sm text-brand-600 font-medium hover:underline">Back to sign in</a>
          </div>
        )}

        {view === "form" && (
          <>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-1">Create your admin account</h1>
              <p className="text-sm text-gray-500">Setting up access for <span className="font-medium text-gray-700">{email}</span></p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="full-name" className="block text-sm font-medium text-gray-700 mb-1.5">Full name</label>
                <input
                  id="full-name"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 text-sm transition-shadow shadow-sm placeholder-gray-400"
                  placeholder="Juan dela Cruz"
                />
              </div>

              <div>
                <label htmlFor="invite-password" className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <PasswordInput id="invite-password" value={password} onChange={setPassword} placeholder="Min. 8 characters" />
              </div>

              <div>
                <label htmlFor="invite-confirm" className="block text-sm font-medium text-gray-700 mb-1.5">Confirm password</label>
                <PasswordInput id="invite-confirm" value={confirm} onChange={setConfirm} placeholder="Repeat your password" />
              </div>

              {error && (
                <div className="flex items-start gap-2.5 text-sm text-rose-700 bg-rose-50 border border-rose-200 px-3.5 py-3 rounded-xl">
                  <svg className="w-4 h-4 mt-0.5 shrink-0 text-accent-rose" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 disabled:opacity-60 text-white font-semibold rounded-xl transition-all duration-150 text-sm shadow-sm hover:shadow-md"
              >
                {submitting ? "Creating account…" : "Create account & sign in"}
              </button>
            </form>
          </>
        )}

        {view === "done" && (
          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Account created</h2>
            <p className="text-sm text-gray-500 mb-6">Your admin account is ready — sign in to continue.</p>
            <a href="/login" className="text-sm text-brand-600 font-medium hover:underline">Go to sign in</a>
          </div>
        )}
      </div>
    </div>
  );
}
