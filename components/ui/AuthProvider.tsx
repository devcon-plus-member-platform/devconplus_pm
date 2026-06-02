"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useAuthStore } from "@/lib/store";
import type { Contributor } from "@/types";

async function resolveSession(
  supabase: ReturnType<typeof createClient>,
  setContributor: (c: Contributor | null) => void,
  setGuestEmail: (e: string | null) => void
) {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    setContributor(null);
    setGuestEmail(null);
    return;
  }

  const { data: contributor } = await supabase
    .from("contributors")
    .select("*, role:roles(*)")
    .eq("email", user.email!)
    .is("deleted_at", null)
    .single();

  if (contributor) {
    setGuestEmail(null);
    setContributor(contributor as Contributor);
    return;
  }

  // No contributor record yet — auto-create from auth metadata (new sign-up)
  const fullName =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    null;

  const { data: created } = await supabase
    .from("contributors")
    .insert({ email: user.email!, full_name: fullName })
    .select("*, role:roles(*)")
    .single();

  if (created) {
    setGuestEmail(null);
    setContributor(created as Contributor);
  } else {
    // Insert may be blocked by RLS — fall back to guest mode
    setContributor(null);
    setGuestEmail(user.email ?? null);
  }
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const setContributor = useAuthStore((s) => s.setContributor);
  const setGuestEmail = useAuthStore((s) => s.setGuestEmail);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    // Remember-me check: if the user opted out and this is a fresh browser
    // session (sessionStorage cleared), sign them out immediately.
    const noRemember = localStorage.getItem("devcon-no-remember");
    const sessionAlive = sessionStorage.getItem("devcon-session-alive");

    if (noRemember && !sessionAlive) {
      supabase.auth.signOut().then(() => {
        setContributor(null);
        setGuestEmail(null);
        router.push("/login");
      });
      return;
    }

    // Mark this browser session as alive so refreshes don't sign the user out
    sessionStorage.setItem("devcon-session-alive", "1");

    resolveSession(supabase, setContributor, setGuestEmail);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        setContributor(null);
        setGuestEmail(null);
        router.push("/login");
      } else if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session?.user) {
        sessionStorage.setItem("devcon-session-alive", "1");
        await resolveSession(supabase, setContributor, setGuestEmail);
      }
    });

    return () => subscription.unsubscribe();
  }, [router, setContributor, setGuestEmail]);

  return <>{children}</>;
}
