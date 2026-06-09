import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceRoleClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Auto-create contributor record for users who don't have one yet.
      // Uses service-role client so the INSERT bypasses RLS — new users are
      // not yet in contributors, so is_contributor() returns false for them
      // and the anon-key client would be blocked by the write policy.
      const { data: { user } } = await supabase.auth.getUser();

      if (user?.email) {
        try {
          const admin = createServiceRoleClient();

          const { data: existing } = await admin
            .from("contributors")
            .select("id")
            .eq("email", user.email)
            .maybeSingle();

          if (!existing) {
            const fullName =
              (user.user_metadata?.full_name as string | undefined) ??
              (user.user_metadata?.name as string | undefined) ??
              null;

            await admin.from("contributors").insert({
              email: user.email,
              full_name: fullName,
            });
          }
        } catch (err) {
          // Non-fatal — contributor record can also be created client-side
          // in AuthProvider. Log but don't block the redirect.
          console.error("[auth/callback] contributor upsert failed:", err);
        }
      }

      return NextResponse.redirect(`${origin}/dashboard`);
    }
  }

  return NextResponse.redirect(`${origin}/login`);
}
