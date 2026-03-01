import { createClient } from "@/utils/supabase/server";

export async function getRedirectPath() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return "/login";
  }

  return "/home";
}
