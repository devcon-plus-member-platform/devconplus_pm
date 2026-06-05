import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";
import { sendMilestoneAchievedEmail } from "@/lib/resend";
import type { Contributor, Milestone } from "@/types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const supabase = createServiceRoleClient();

    const { data: existing } = await supabase
      .from("milestones")
      .select("*")
      .eq("id", id)
      .single<Milestone>();

    if (!existing) {
      return NextResponse.json({ ok: false, error: "Milestone not found" }, { status: 404 });
    }

    const isAchieving = body.status === "Achieved" && existing.status !== "Achieved";

    const updates: Record<string, unknown> = { ...body };
    if (isAchieving) {
      updates.achieved_at = new Date().toISOString();
    }

    const { data: updated, error: updateError } = await supabase
      .from("milestones")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (updateError || !updated) {
      return NextResponse.json({ ok: false, error: updateError?.message }, { status: 500 });
    }

    const updatedMilestone = updated as unknown as Milestone;

    // Send celebration emails if newly achieved and not yet announced
    if (isAchieving && !existing.announced) {
      const { data: contributors } = await supabase
        .from("contributors")
        .select("email,full_name")
        .is("deleted_at", null);

      const recipients = (contributors as unknown as Pick<Contributor, "email" | "full_name">[]) ?? [];

      await Promise.allSettled(
        recipients.map((c) =>
          sendMilestoneAchievedEmail({
            to: c.email,
            recipientName: c.full_name ?? c.email,
            milestoneTitle: updatedMilestone.title,
            targetDate: updatedMilestone.target_date,
            achievedAt: updatedMilestone.achieved_at ?? new Date().toISOString(),
            description: updatedMilestone.description,
          })
        )
      );

      // Mark as announced
      await supabase.from("milestones").update({ announced: true }).eq("id", id);
      updatedMilestone.announced = true;
    }

    return NextResponse.json({ ok: true, milestone: updatedMilestone });
  } catch (err) {
    console.error("[PATCH /api/milestones/[id]]", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const supabase = createServiceRoleClient();
    const { error } = await supabase.from("milestones").delete().eq("id", id);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
