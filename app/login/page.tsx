"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useAuthStore } from "@/lib/store";
import type { Contributor } from "@/types";

type Tab = "signin" | "signup";

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
  value,
  onChange,
  placeholder,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  id?: string;
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

export default function LoginPage() {
  const router = useRouter();
  const setContributor = useAuthStore((s) => s.setContributor);
  const setGuestEmail = useAuthStore((s) => s.setGuestEmail);

  const [tab, setTab] = useState<Tab>("signin");

  // Sign-in state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);

  // Sign-up state
  const [fullName, setFullName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirm, setSignupConfirm] = useState("");
  const [signupDone, setSignupDone] = useState(false);

  // Shared
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) router.replace("/dashboard");
    });
  }, [router]);

  function switchTab(t: Tab) {
    setTab(t);
    setError(null);
  }

  // ─── Sign in ───────────────────────────────────────────────────────────────
  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError || !authData.user) {
      setError(authError?.message ?? "Login failed. Please try again.");
      setLoading(false);
      return;
    }

    // Persist remember-me preference
    if (rememberMe) {
      localStorage.removeItem("devcon-no-remember");
    } else {
      localStorage.setItem("devcon-no-remember", "1");
    }
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
    } else {
      setContributor(null);
      setGuestEmail(authData.user.email ?? null);
    }

    router.push("/dashboard");
  }

  // ─── Sign up ───────────────────────────────────────────────────────────────
  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError("Full name is required.");
      return;
    }
    if (signupPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (signupPassword !== signupConfirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { data, error: signupError } = await supabase.auth.signUp({
      email: signupEmail,
      password: signupPassword,
      options: {
        data: { full_name: fullName.trim() },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (signupError) {
      setError(signupError.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      // Email confirmation is disabled — user is signed in immediately
      localStorage.removeItem("devcon-no-remember");
      sessionStorage.setItem("devcon-session-alive", "1");
      router.push("/dashboard");
    } else {
      // Email confirmation required — show success message
      setSignupDone(true);
      setLoading(false);
    }
  }

  // ─── Left branding panel ───────────────────────────────────────────────────
  const brandPanel = (
    <div className="hidden lg:flex w-[420px] shrink-0 bg-brand-950 flex-col justify-between p-10">
      <div>
        <div className="flex items-center gap-2.5 mb-12">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
            </svg>
          </div>
          <span className="text-base font-bold text-white tracking-tight">DEVCON+</span>
        </div>
        <h2 className="text-2xl font-bold text-white leading-snug mb-3">
          Manage your projects<br />with clarity.
        </h2>
        <p className="text-sm text-brand-300 leading-relaxed">
          Track tasks, coordinate contributors, and ship features — all in one place for the DEVCON+ Philippines team.
        </p>
      </div>
      <div className="space-y-3">
        {[
          { icon: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z", text: "Real-time task tracking" },
          { icon: "M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z", text: "Team collaboration" },
          { icon: "M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0", text: "Instant activity notifications" },
        ].map((item) => (
          <div key={item.text} className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-white/[0.07] flex items-center justify-center shrink-0">
              <svg className="w-3.5 h-3.5 text-brand-300" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
            </div>
            <span className="text-sm text-brand-300">{item.text}</span>
          </div>
        ))}
      </div>
    </div>
  );

  // ─── Mobile logo ───────────────────────────────────────────────────────────
  const mobileLogo = (
    <div className="flex items-center gap-2 mb-8 lg:hidden">
      <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center">
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
        </svg>
      </div>
      <span className="text-sm font-bold text-brand-900 tracking-tight">DEVCON+</span>
    </div>
  );

  const errorBox = error && (
    <div className="flex items-start gap-2.5 text-sm text-red-700 bg-red-50 border border-red-200 px-3.5 py-3 rounded-xl">
      <svg className="w-4 h-4 mt-0.5 shrink-0 text-red-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
      {error}
    </div>
  );

  return (
    <div className="min-h-screen flex bg-gray-50">
      {brandPanel}

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {mobileLogo}

          {/* Tab switcher */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-7 gap-1">
            {(["signin", "signup"] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => switchTab(t)}
                className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-150 ${
                  tab === t
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {t === "signin" ? "Sign in" : "Sign up"}
              </button>
            ))}
          </div>

          {/* ── Sign in form ── */}
          {tab === "signin" && (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-1">Welcome back</h1>
                <p className="text-sm text-gray-500">Sign in to the DEVCON+ dashboard</p>
              </div>

              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 text-sm transition-shadow shadow-sm placeholder-gray-400"
                    placeholder="you@devconph.com"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                  <PasswordInput id="password" value={password} onChange={setPassword} />
                </div>

                {/* Remember me */}
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                  />
                  <span className="text-sm text-gray-600">Remember me</span>
                </label>

                {errorBox}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 disabled:opacity-60 text-white font-semibold rounded-xl transition-all duration-150 text-sm shadow-sm hover:shadow-md"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Signing in…
                    </span>
                  ) : "Sign in"}
                </button>

                <p className="text-center text-sm text-gray-500">
                  Don&apos;t have an account?{" "}
                  <button type="button" onClick={() => switchTab("signup")} className="text-brand-600 font-medium hover:underline">
                    Sign up
                  </button>
                </p>
              </form>
            </>
          )}

          {/* ── Sign up form ── */}
          {tab === "signup" && !signupDone && (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-1">Create an account</h1>
                <p className="text-sm text-gray-500">Join the DEVCON+ team dashboard</p>
              </div>

              <form onSubmit={handleSignUp} className="space-y-4">
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
                  <label htmlFor="signup-email" className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
                  <input
                    id="signup-email"
                    type="email"
                    required
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 text-sm transition-shadow shadow-sm placeholder-gray-400"
                    placeholder="you@devconph.com"
                  />
                </div>

                <div>
                  <label htmlFor="signup-password" className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                  <PasswordInput id="signup-password" value={signupPassword} onChange={setSignupPassword} placeholder="Min. 8 characters" />
                </div>

                <div>
                  <label htmlFor="signup-confirm" className="block text-sm font-medium text-gray-700 mb-1.5">Confirm password</label>
                  <PasswordInput id="signup-confirm" value={signupConfirm} onChange={setSignupConfirm} placeholder="Repeat your password" />
                </div>

                {errorBox}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 disabled:opacity-60 text-white font-semibold rounded-xl transition-all duration-150 text-sm shadow-sm hover:shadow-md"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Creating account…
                    </span>
                  ) : "Create account"}
                </button>

                <p className="text-center text-sm text-gray-500">
                  Already have an account?{" "}
                  <button type="button" onClick={() => switchTab("signin")} className="text-brand-600 font-medium hover:underline">
                    Sign in
                  </button>
                </p>
              </form>
            </>
          )}

          {/* ── Sign up success (email confirmation required) ── */}
          {tab === "signup" && signupDone && (
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center mx-auto mb-5">
                <svg className="w-7 h-7 text-brand-600" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Check your inbox</h2>
              <p className="text-sm text-gray-500 mb-1">
                We&apos;ve sent a confirmation link to
              </p>
              <p className="text-sm font-semibold text-gray-800 mb-6">{signupEmail}</p>
              <p className="text-xs text-gray-400 mb-6">
                Click the link in the email to activate your account, then come back to sign in.
              </p>
              <button
                type="button"
                onClick={() => { setSignupDone(false); switchTab("signin"); }}
                className="text-sm text-brand-600 font-medium hover:underline"
              >
                Back to sign in
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
