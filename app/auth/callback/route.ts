import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Auto-create contributor record for users who don't have one yet
      // (covers Google OAuth sign-ups and email confirmation callbacks)
      const { data: { user } } = await supabase.auth.getUser();

      if (user?.email) {
        const { data: existing } = await supabase
          .from("contributors")
          .select("id")
          .eq("email", user.email)
          .maybeSingle();

        if (!existing) {
          const fullName =
            (user.user_metadata?.full_name as string | undefined) ??
            (user.user_metadata?.name as string | undefined) ??
            null;

          await supabase.from("contributors").insert({
            email: user.email,
            full_name: fullName,
          });
        }
      }

      return NextResponse.redirect(`${origin}/dashboard`);
    }
  }

  return NextResponse.redirect(`${origin}/login`);
}
