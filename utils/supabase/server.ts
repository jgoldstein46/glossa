import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    // Return a dummy client or throw a specific error that doesn't crash the build time
    // For now, we'll log a warning and return a dummy that throws on use,
    // or just return null if the caller handles it.
    // Best practice: Throw a clear error AT RUNTIME when used, not at config time if possible.
    // However, createServerClient expects strings.
    console.error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
    // We'll throw here to ensure dev knows, but catching it in layout would be better.
    // Given the crash reported, let's allow it to fail but maybe adding a check in layout is better.
    // Actually, let's just make it robust by checking nulls.
    // If we return null, we break TS signature.
    // Let's return a partial mock or just throw with a helpful message.
    throw new Error(
      "Supabase credentials missing. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local",
    );
  }

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  });
}
