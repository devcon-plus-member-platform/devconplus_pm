import { NextRequest, NextResponse } from "next/server";
import { sendActivityAlertEmail } from "@/lib/resend";
import { createServiceRoleClient } from "@/lib/supabase";

export interface ActivityPayload {
  action: string;       // "created" | "updated" | "deleted" | "moved" | "renamed"
  entity: string;       // "task" | "group" | "project"
  entityTitle: string;
  actorName: string;    // contributor full_name, email, or "Guest"
  actorEmail: string | null;
  page: string;         // "PM Board" etc.
}

export async function POST(request: NextRequest) {
  try {
    const body: ActivityPayload = await request.json();
    const supabase = createServiceRoleClient();

    const { data: actor } = body.actorEmail
      ? await supabase.from("contributors").select("is_admin").eq("email", body.actorEmail).maybeSingle()
      : { data: null };

    // Only email admins for non-admin actors
    if (!actor?.is_admin) {
      const { data: admins } = await supabase
        .from("contributors")
        .select("email")
        .eq("is_admin", true)
        .is("deleted_at", null);

      for (const admin of admins ?? []) {
        await sendActivityAlertEmail({
          to: admin.email,
          actor: body.actorName || "Guest",
          action: body.action,
          entity: body.entity,
          entityTitle: body.entityTitle,
          page: body.page,
        });
        console.log(`[activity] email sent → ${admin.email} | ${body.actorName} ${body.action} ${body.entity}: "${body.entityTitle}"`);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[activity]", err);
    // Always return ok — a failed email must not block the user
    return NextResponse.json({ ok: true });
  }
}
