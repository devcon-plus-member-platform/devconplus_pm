"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useAuthStore } from "@/lib/store";
import { isAdmin, ADMIN_EMAIL } from "@/lib/permissions";
import type { Contributor } from "@/types";

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const setContributor = useAuthStore((s) => s.setContributor);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    // On mount — hydrate the contributor store from the active session
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setContributor(null); // Guest mode — open board, no redirect
        return;
      }

      const { data: contributor } = await supabase
        .from("contributors")
        .select("*, role:roles(*)")
        .eq("email", user.email!)
        .single();

      if (!contributor) {
        if (!isAdmin(user.email)) {
          await supabase.auth.signOut();
          router.push("/access-denied");
          return;
        }
        setContributor({
          id: "admin",
          email: ADMIN_EMAIL,
          full_name: "Admin",
          role_id: null,
          telegram_username: null,
          deleted_at: null,
          created_at: new Date().toISOString(),
        });
        return;
      }

      setContributor(contributor as Contributor);
    })();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "SIGNED_OUT") {
        setContributor(null);
        // Only redirect to login on explicit sign-out, not for guest sessions
        router.push("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [router, setContributor]);

  return <>{children}</>;
}
