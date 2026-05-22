import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase";

// Handles Supabase OAuth redirect (Google sign-in)
// After OAuth, verifies the user is a registered contributor, then redirects to /dashboard
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Check the user is an active contributor
      const { data: contributor } = await supabase
        .from("contributors")
        .select("id")
        .eq("email", data.user.email!)
        .is("deleted_at", null)
        .single();

      if (!contributor) {
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/access-denied`);
      }

      return NextResponse.redirect(`${origin}/dashboard`);
    }
  }

  return NextResponse.redirect(`${origin}/login`);
}
