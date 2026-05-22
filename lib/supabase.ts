import { createBrowserClient, createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient as _createServiceClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// ─── Browser client (use inside Client Components) ────────────────────────────
// Returns a memoised singleton per URL+key; safe to call on every render.
export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

// ─── Server client (use inside Server Components, Route Handlers, Middleware) ─
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // setAll called from a Server Component — safe to ignore.
        }
      },
    },
  });
}

// ─── Service-role client (trusted server code only) ───────────────────────────
export function createServiceRoleClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return _createServiceClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
