"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import type { Bug } from "@/types";

interface Props {
  projectId: string;
}

interface BugCounts {
  open: number;
  critical: number;
  resolvedThisWeek: number;
}

export default function BugSummaryWidget({ projectId }: Props) {
  const supabase = createClient();
  const [counts, setCounts] = useState<BugCounts>({ open: 0, critical: 0, resolvedThisWeek: 0 });

  useEffect(() => {
    if (!projectId) return;
    async function fetchCounts() {
      const { data } = await supabase
        .from("bugs")
        .select("id,status,severity,updated_at")
        .eq("project_id", projectId);
      if (!data) return;

      const bugs = data as Pick<Bug, "id" | "status" | "severity" | "updated_at">[];
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      setCounts({
        open: bugs.filter((b) => b.status === "Open" || b.status === "In Progress").length,
        critical: bugs.filter((b) => b.severity === "Critical" && b.status !== "Resolved" && b.status !== "Closed").length,
        resolvedThisWeek: bugs.filter(
          (b) => b.status === "Resolved" && new Date(b.updated_at) >= weekAgo
        ).length,
      });
    }
    fetchCounts();
  }, [projectId, supabase]);

  return (
    <div className="bg-white border border-gray-100 rounded-xl px-5 py-4 shadow-sm col-span-2 sm:col-span-1">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Bugs</p>
      <div className="flex items-center gap-4 text-xs">
        <Link href="/bugs?status=Open" className="group">
          <span className="text-xl font-bold text-red-500 group-hover:text-red-600">{counts.open}</span>
          <span className="text-gray-400 ml-1">Open</span>
        </Link>
        <span className="text-gray-200">|</span>
        <div>
          <span className="text-xl font-bold text-orange-500">{counts.critical}</span>
          <span className="text-gray-400 ml-1">Critical</span>
        </div>
        <span className="text-gray-200">|</span>
        <div>
          <span className="text-xl font-bold text-green-500">{counts.resolvedThisWeek}</span>
          <span className="text-gray-400 ml-1">Resolved ↑wk</span>
        </div>
      </div>
    </div>
  );
}
