"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useAuthStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import NotificationCenter from "./NotificationCenter";

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Task Board",
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
  },
  {
    href: "/qa",
    label: "QA",
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  },
  {
    href: "/bugs",
    label: "Bugs",
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 12.75c1.148 0 2.278.08 3.383.237 1.037.146 1.866.966 1.866 2.013 0 3.728-2.35 6.75-5.25 6.75S6.75 18.728 6.75 15c0-1.046.83-1.867 1.866-2.013A24.204 24.204 0 0112 12.75zm0 0c2.883 0 5.647.508 8.207 1.44a23.91 23.91 0 01-1.152 6.06M12 12.75c-2.883 0-5.647.508-8.208 1.44a23.91 23.91 0 001.153 6.06M12 8.25c.995 0 1.971-.08 2.922-.236.403-.066.74-.358.795-.762a3.778 3.778 0 00-.399-2.25M12 8.25c-.995 0-1.97-.08-2.922-.236-.402-.066-.74-.358-.795-.762a3.778 3.778 0 01.4-2.253M12 8.25a2.25 2.25 0 00-2.248 2.146M12 8.25a2.25 2.25 0 012.248 2.146M8.683 5a6.032 6.032 0 01-1.155-1.002c.07-.63.27-1.222.574-1.747m.581 2.749A3.75 3.75 0 0115.318 5m0 0c.427-.283.815-.62 1.155-.999a4.471 4.471 0 00-.575-1.752M4.921 6a24.048 24.048 0 00-.392 3.314c1.668.546 3.416.914 5.223 1.082M19.08 6c.205 1.08.337 2.187.392 3.314a23.882 23.882 0 01-5.223 1.082" />
      </svg>
    ),
  },
  {
    href: "/announcements",
    label: "Announcements",
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" />
      </svg>
    ),
  },
  {
    href: "/meetings",
    label: "Meetings",
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H18v-.008zm0 2.25h.008v.008H18V15z" />
      </svg>
    ),
  },
  {
    href: "/milestones",
    label: "Milestones",
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5" />
      </svg>
    ),
  },
  {
    href: "/risks",
    label: "Risks",
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    ),
  },
  {
    href: "/git",
    label: "GitHub Activity",
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 7.5v9m0-9A2.25 2.25 0 105.25 5.25 2.25 2.25 0 007.5 7.5zm0 9a2.25 2.25 0 102.25 2.25A2.25 2.25 0 007.5 16.5zm9-9A2.25 2.25 0 1118.75 5.25 2.25 2.25 0 0016.5 7.5zm0 0c0 3-2.25 4.5-4.5 5.25C9.75 13.5 7.5 15 7.5 16.5" />
      </svg>
    ),
  },
  {
    href: "/contributors",
    label: "Contributors",
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
  },
  {
    href: "/essentials",
    label: "Essentials",
    icon: (
      <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const contributor = useAuthStore((s) => s.contributor);
  const guestEmail = useAuthStore((s) => s.guestEmail);
  const setContributor = useAuthStore((s) => s.setContributor);
  const setGuestEmail = useAuthStore((s) => s.setGuestEmail);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openBugCount, setOpenBugCount] = useState(0);
  const supabaseRef = useRef(createClient());

  useEffect(() => {
    let cancelled = false;
    async function fetchOpenBugCount() {
      const { count } = await supabaseRef.current
        .from("bugs")
        .select("id", { count: "exact", head: true })
        .in("status", ["Open", "In Progress"]);
      if (!cancelled) setOpenBugCount(count ?? 0);
    }
    fetchOpenBugCount();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setContributor(null);
    setGuestEmail(null);
    router.push("/login");
  }

  const visibleNavItems = NAV_ITEMS.filter(
    (item) => item.href !== "/contributors" || !!contributor
  );

  const navLinks = (
    <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
      {visibleNavItems.map((item) => {
        const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "relative flex items-center gap-3 pl-3.5 pr-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 group/nav",
              active
                ? "bg-white text-navy shadow-sm"
                : "text-brand-300 hover:bg-white/[0.07] hover:text-white"
            )}
          >
            <span className={cn(
              "shrink-0 transition-colors",
              active ? "text-navy" : "text-brand-400 group-hover/nav:text-white"
            )}>
              {item.icon}
            </span>
            <span className="truncate flex-1">{item.label}</span>
            {item.href === "/bugs" && openBugCount > 0 && (
              <span className="ml-auto shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-accent-rose text-white text-[10px] font-bold flex items-center justify-center">
                {openBugCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  const avatarColor = contributor?.role?.color ?? "#6366f1";
  const initials = contributor
    ? (contributor.full_name ?? contributor.email)[0].toUpperCase()
    : null;

  const userFooter = contributor ? (
    <div className="px-3 py-3 border-t border-white/[0.08]">
      <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg mb-1">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ring-2 ring-white/10"
          style={{ backgroundColor: avatarColor }}
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white truncate leading-tight">
            {contributor.full_name ?? contributor.email}
          </p>
          {contributor.role && (
            <span
              className="inline-block px-1.5 py-px rounded text-[10px] font-medium text-white/80 mt-0.5 truncate max-w-full"
              style={{ backgroundColor: `${avatarColor}55` }}
            >
              {contributor.role.name}
            </span>
          )}
        </div>
      </div>
      <button
        onClick={handleSignOut}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-brand-300 hover:text-white hover:bg-white/[0.07] rounded-lg transition-all duration-150"
      >
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
        </svg>
        Sign out
      </button>
    </div>
  ) : guestEmail ? (
    <div className="px-3 py-3 border-t border-white/[0.08]">
      <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg mb-1">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ring-2 ring-white/10 bg-brand-600">
          {guestEmail[0].toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-white truncate leading-tight">
            {guestEmail}
          </p>
          <span className="inline-block px-1.5 py-px rounded text-[10px] font-medium text-white/60 mt-0.5 bg-white/10">
            Guest
          </span>
        </div>
      </div>
      <button
        onClick={handleSignOut}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-brand-300 hover:text-white hover:bg-white/[0.07] rounded-lg transition-all duration-150"
      >
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
        </svg>
        Sign out
      </button>
    </div>
  ) : (
    <div className="px-3 py-3 border-t border-white/[0.08]">
      <Link
        href="/login"
        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-brand-300 hover:text-white hover:bg-white/[0.07] rounded-lg transition-all duration-150"
      >
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l3 3m0 0l-3 3m3-3H3.75" />
        </svg>
        Sign in
      </Link>
    </div>
  );

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex w-[236px] sticky top-0 h-screen bg-navy-gradient flex-col text-white shrink-0 border-r border-white/[0.05]">
        {/* Logo lockup */}
        <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand to-brand-light flex items-center justify-center shrink-0 text-white font-extrabold text-base">
              D
            </div>
            <div className="flex flex-col leading-none min-w-0">
              <h1 className="text-base font-extrabold tracking-tight text-white leading-tight truncate">
                DEVCON+
              </h1>
              <p className="text-[10px] text-brand-300 mt-1 font-semibold tracking-widest uppercase truncate">
                Project Mgmt
              </p>
            </div>
          </div>
          {!!contributor && <NotificationCenter />}
        </div>

        {navLinks}
        {userFooter}
      </aside>

      {/* ── Mobile top bar ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-navy-gradient text-white flex items-center justify-between px-4 py-3 border-b border-white/[0.08]">
        <span className="text-sm font-bold tracking-tight">DEVCON+</span>
        <div className="flex items-center gap-2">
          {!!contributor && <NotificationCenter />}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="p-1.5 rounded-lg hover:bg-white/[0.07] transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* ── Mobile drawer ── */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-black/30 backdrop-blur-sm" onClick={() => setMobileOpen(false)}>
          <div
            className="absolute top-[53px] left-0 w-64 bottom-0 bg-navy-gradient text-white flex flex-col shadow-2xl border-r border-white/[0.08]"
            onClick={(e) => e.stopPropagation()}
          >
            {navLinks}
            {userFooter}
          </div>
        </div>
      )}

      {/* Mobile spacer */}
      <div className="md:hidden h-[53px] shrink-0" />
    </>
  );
}
