"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useAuthStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import NotificationCenter from "./NotificationCenter";

const NAV_ITEMS = [
  { href: "/dashboard", label: "PM Board", icon: "📋" },
  { href: "/qa", label: "QA", icon: "🧪" },
  { href: "/announcements", label: "Announcements", icon: "📣" },
  { href: "/contributors", label: "Contributors", icon: "👥" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const contributor = useAuthStore((s) => s.contributor);
  const setContributor = useAuthStore((s) => s.setContributor);
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setContributor(null);
    router.push("/login");
  }

  const roleBadge = contributor?.role ? (
    <span
      className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium text-white truncate max-w-full"
      style={{ backgroundColor: contributor.role.color ?? "#6366f1" }}
    >
      {contributor.role.name}
    </span>
  ) : null;

  const navLinks = (
    <nav className="flex-1 px-3 py-4 space-y-1">
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={() => setMobileOpen(false)}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
            pathname.startsWith(item.href)
              ? "bg-brand-600 text-white"
              : "text-brand-200 hover:bg-brand-800 hover:text-white"
          )}
        >
          <span>{item.icon}</span>
          {item.label}
        </Link>
      ))}
    </nav>
  );

  const userFooter = (
    <div className="px-4 py-4 border-t border-brand-800">
      {contributor && (
        <div className="mb-3 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
              style={{ backgroundColor: contributor.role?.color ?? "#6366f1" }}
            >
              {(contributor.full_name ?? contributor.email)[0].toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {contributor.full_name ?? contributor.email}
              </p>
              {roleBadge}
            </div>
          </div>
        </div>
      )}
      <button
        onClick={handleSignOut}
        className="w-full text-left px-3 py-2 text-sm text-brand-300 hover:text-white hover:bg-brand-800 rounded-lg transition-colors"
      >
        Sign out
      </button>
    </div>
  );

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-60 min-h-screen bg-brand-950 flex-col text-white shrink-0">
        {/* Logo + notification bell */}
        <div className="px-6 py-5 border-b border-brand-800 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white">
              DEVCON+ PM
            </h1>
            <p className="text-xs text-brand-300 mt-0.5">Project Management</p>
          </div>
          <NotificationCenter />
        </div>

        {navLinks}
        {userFooter}
      </aside>

      {/* ── Mobile top bar ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-brand-950 text-white flex items-center justify-between px-4 py-3 border-b border-brand-800">
        <span className="text-base font-bold tracking-tight">DEVCON+ PM</span>
        <div className="flex items-center gap-2">
          <NotificationCenter />
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="p-2 rounded-lg hover:bg-brand-800 transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* ── Mobile drawer ── */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-30" onClick={() => setMobileOpen(false)}>
          <div
            className="absolute top-[57px] left-0 w-64 bottom-0 bg-brand-950 text-white flex flex-col shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {navLinks}
            {userFooter}
          </div>
        </div>
      )}

      {/* Mobile spacer so content doesn't sit under the fixed top bar */}
      <div className="md:hidden h-[57px] shrink-0" />
    </>
  );
}
