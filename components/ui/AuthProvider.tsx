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
  } else {
    // Authenticated but not a contributor — read-only guest
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

    // Hydrate store from the active session on mount
    resolveSession(supabase, setContributor, setGuestEmail);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT") {
        setContributor(null);
        setGuestEmail(null);
        router.push("/login");
      } else if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session?.user) {
        // Re-resolve after OAuth redirect or token refresh
        await resolveSession(supabase, setContributor, setGuestEmail);
      }
    });

    return () => subscription.unsubscribe();
  }, [router, setContributor, setGuestEmail]);

  return <>{children}</>;
}
