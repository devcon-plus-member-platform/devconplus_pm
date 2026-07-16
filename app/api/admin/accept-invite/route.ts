import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

interface InviteLookup {
  email: string;
  accepted_at: string | null;
  expires_at: string;
}

async function findValidInvite(token: string): Promise<
  { ok: true; invite: InviteLookup } | { ok: false; error: string }
> {
  if (!token) return { ok: false, error: "Missing invite token" };

  const admin = createServiceRoleClient();
  const { data: invite } = await admin
    .from("admin_invites")
    .select("email,accepted_at,expires_at")
    .eq("token", token)
    .maybeSingle();

  if (!invite) return { ok: false, error: "This invite link is invalid." };
  if (invite.accepted_at) return { ok: false, error: "This invite has already been used." };
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return { ok: false, error: "This invite has expired. Ask an admin to send a new one." };
  }

  return { ok: true, invite };
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const result = await findValidInvite(token);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ email: result.invite.email });
}

export async function POST(req: NextRequest) {
  const { token, full_name, password } = await req.json();

  if (!full_name || typeof full_name !== "string" || !full_name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (!password || typeof password !== "string" || password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const result = await findValidInvite(token);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  const { email } = result.invite;

  const admin = createServiceRoleClient();
  const trimmedName = full_name.trim();

  // Create the auth account, or set a password on it if one already exists
  // (e.g. they previously signed in via magic link as a regular contributor).
  const { data: existingUsers } = await admin.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find((u) => u.email === email);

  if (existingUser) {
    const { error: updateErr } = await admin.auth.admin.updateUserById(existingUser.id, {
      password,
      email_confirm: true,
      user_metadata: { full_name: trimmedName },
    });
    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }
  } else {
    const { error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: trimmedName },
    });
    if (createErr) {
      return NextResponse.json({ error: createErr.message }, { status: 500 });
    }
  }

  // Upsert the contributor row as an admin.
  const { data: existingContributor } = await admin
    .from("contributors")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existingContributor) {
    const { error: updateErr } = await admin
      .from("contributors")
      .update({ full_name: trimmedName, is_admin: true, deleted_at: null })
      .eq("id", existingContributor.id);
    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }
  } else {
    const { error: insertErr } = await admin
      .from("contributors")
      .insert({ email, full_name: trimmedName, is_admin: true });
    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }
  }

  await admin.from("admin_invites").update({ accepted_at: new Date().toISOString() }).eq("token", token);

  return NextResponse.json({ ok: true, email });
}
