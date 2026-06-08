"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useAuthStore } from "@/lib/store";
import type { Contributor } from "@/types";
import type { User } from "@supabase/supabase-js";

// Looks up (or creates) the contributor record for an already-authenticated user.
// Does NOT call getUser() — the caller provides the user from the session event.
async function resolveContributor(
  supabase: ReturnType<typeof createClient>,
  user: User,
  setContributor: (c: Contributor | null) => void,
  setGuestEmail: (e: string | null) => void
) {
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

  // Auto-create from auth metadata (new sign-up flow)
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
    setContributor(null);
    setGuestEmail(user.email ?? null);
  }
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const setContributor = useAuthStore((s) => s.setContributor);
  const setGuestEmail = useAuthStore((s) => s.setGuestEmail);
  const setAuthReady = useAuthStore((s) => s.setAuthReady);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    // Remember-me check: if the user opted out and this is a fresh browser
    // session (sessionStorage is per-tab and cleared on browser close), sign
    // them out immediately.
    const noRemember = localStorage.getItem("devcon-no-remember");
    const sessionAlive = sessionStorage.getItem("devcon-session-alive");

    if (noRemember && !sessionAlive) {
      supabase.auth.signOut()
        .catch(() => {})
        .finally(() => {
          setContributor(null);
          setGuestEmail(null);
          setAuthReady(true);
          router.push("/login");
        });
      return;
    }

    sessionStorage.setItem("devcon-session-alive", "1");

    // onAuthStateChange fires INITIAL_SESSION synchronously from the local
    // cookie — no JWT round-trip to the server, so authReady is set quickly.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "INITIAL_SESSION") {
          try {
            if (session?.user) {
              // Race against a timeout so authReady is always set even if
              // the contributors query hangs (e.g. network issues).
              const resolveTimeout = new Promise<void>((_, reject) =>
                setTimeout(() => reject(new Error("auth_resolve_timeout")), 5000)
              );
              await Promise.race([
                resolveContributor(supabase, session.user, setContributor, setGuestEmail),
                resolveTimeout,
              ]);
            } else {
              setContributor(null);
              setGuestEmail(null);
            }
          } catch {
            setContributor(null);
            setGuestEmail(null);
          } finally {
            setAuthReady(true);
          }
        } else if (event === "SIGNED_OUT") {
          setContributor(null);
          setGuestEmail(null);
          router.push("/login");
        } else if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session?.user) {
          sessionStorage.setItem("devcon-session-alive", "1");
          try {
            await resolveContributor(supabase, session.user, setContributor, setGuestEmail);
          } catch {
            // silent — user stays in current state
          }
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [router, setContributor, setGuestEmail, setAuthReady]);

  return <>{children}</>;
}
