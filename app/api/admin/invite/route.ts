import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase";
import { sendAdminInviteEmail } from "@/lib/resend";

export const dynamic = "force-dynamic";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  // Verify the caller is a signed-in admin.
  const sessionClient = await createServerSupabaseClient();
  const { data: { user } } = await sessionClient.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const admin = createServiceRoleClient();

  const { data: caller } = await admin
    .from("contributors")
    .select("id,full_name,email,is_admin")
    .eq("email", user.email)
    .is("deleted_at", null)
    .maybeSingle();

  if (!caller?.is_admin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const normalizedEmail = email.trim().toLowerCase();

  const { data: existingContributor } = await admin
    .from("contributors")
    .select("is_admin")
    .eq("email", normalizedEmail)
    .is("deleted_at", null)
    .maybeSingle();

  if (existingContributor?.is_admin) {
    return NextResponse.json({ ok: true, alreadyAdmin: true });
  }

  // Clear out any stale, unaccepted invites for this email before issuing a new one.
  await admin.from("admin_invites").delete().eq("email", normalizedEmail).is("accepted_at", null);

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS).toISOString();

  const { error } = await admin.from("admin_invites").insert({
    email: normalizedEmail,
    token,
    invited_by: caller.id,
    expires_at: expiresAt,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  await sendAdminInviteEmail({
    to: normalizedEmail,
    inviterName: caller.full_name ?? caller.email,
    acceptUrl: `${appUrl}/admin/accept-invite?token=${token}`,
  });

  return NextResponse.json({ ok: true });
}
