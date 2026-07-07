import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";
import { MILESTONE_SELECT, mapMilestoneRow } from "@/lib/milestones";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, target_date, status, project_id, created_by, group_ids } = body;

    if (!title || !target_date) {
      return NextResponse.json({ ok: false, error: "Missing required fields." }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    const { data: milestone, error } = await supabase
      .from("milestones")
      .insert({
        project_id: project_id || null,
        title,
        description: description || null,
        target_date,
        status: status ?? "Not Started",
        created_by: created_by || null,
      })
      .select("*")
      .single();

    if (error || !milestone) {
      return NextResponse.json({ ok: false, error: error?.message }, { status: 500 });
    }

    if (Array.isArray(group_ids) && group_ids.length > 0) {
      const { error: groupsError } = await supabase
        .from("milestone_groups")
        .insert(group_ids.map((group_id: string) => ({ milestone_id: milestone.id, group_id })));
      if (groupsError) {
        return NextResponse.json({ ok: false, error: groupsError.message }, { status: 500 });
      }
    }

    const { data: full, error: fetchError } = await supabase
      .from("milestones")
      .select(MILESTONE_SELECT)
      .eq("id", milestone.id)
      .single();

    if (fetchError || !full) {
      return NextResponse.json({ ok: false, error: fetchError?.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, milestone: mapMilestoneRow(full as Record<string, unknown>) });
  } catch (err) {
    console.error("[POST /api/milestones]", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
