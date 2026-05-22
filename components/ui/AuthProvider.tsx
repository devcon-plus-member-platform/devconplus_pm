"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useAuthStore } from "@/lib/store";
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
        router.push("/login");
        return;
      }

      const { data: contributor } = await supabase
        .from("contributors")
        .select("*, role:roles(*)")
        .eq("email", user.email!)
        .single();

      if (!contributor) {
        await supabase.auth.signOut();
        router.push("/access-denied");
        return;
      }

      setContributor(contributor as Contributor);
    })();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        setContributor(null);
        router.push("/login");
      }
    });

    return () => subscription.unsubscribe();
  }, [router, setContributor]);

  return <>{children}</>;
}
