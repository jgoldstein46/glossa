"use client";

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { createContext, PropsWithChildren, useContext } from "react";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const SupabaseContext = createContext<SupabaseClient | null>(null);

export function SupabaseProvider({ children }: PropsWithChildren) {
  const supabase = createClient(supabaseUrl, supabaseKey);

  return (
    <SupabaseContext.Provider value={supabase}>
      {children}
    </SupabaseContext.Provider>
  );
}

export default function useSupabase() {
  const supabase = useContext(SupabaseContext);
  if (supabase === null) {
    throw new Error("Must call useSupabase in a SupabaseContext");
  }
  return supabase;
}
