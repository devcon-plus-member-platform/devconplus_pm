import { NextRequest, NextResponse } from "next/server";
import { sendActivityAlertEmail } from "@/lib/resend";
import { ADMIN_EMAIL, isAdmin } from "@/lib/permissions";

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

    // Only email admin for non-admin actors
    if (!isAdmin(body.actorEmail)) {
      await sendActivityAlertEmail({
        to: ADMIN_EMAIL,
        actor: body.actorName || "Guest",
        action: body.action,
        entity: body.entity,
        entityTitle: body.entityTitle,
        page: body.page,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[activity]", err);
    // Always return ok — a failed email must not block the user
    return NextResponse.json({ ok: true });
  }
}
