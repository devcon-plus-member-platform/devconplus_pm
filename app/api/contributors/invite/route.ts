import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  // Check if they already have an auth account — skip invite if so
  const { data: existing } = await supabase.auth.admin.listUsers();
  const alreadyExists = existing?.users?.some((u) => u.email === email);
  if (alreadyExists) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${appUrl}/auth/callback`,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
